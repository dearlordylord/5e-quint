import { DatabaseSync } from "node:sqlite";

import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { anonymous, jwt } from "better-auth/plugins";
import { Context, Effect, Layer, Semaphore } from "effect";

import { SAVED_INACTIVITY_RETENTION_MS } from "../play-session-access.ts";
import { PLAY_SESSION_OAUTH_SCOPE } from "../tool-definition-contract.ts";
import type { AuthorizationServerOrigin } from "../public-origin.ts";
import { fetchClientMetadataResource } from "./client-metadata-fetch.ts";
import {
  applySavedSessionAuthorizationBackpressure,
  pruneExpiredAuthorizationState,
  SAVED_SESSION_AUTHORIZATION_CAPACITIES,
} from "./capacity.ts";
import {
  ANONYMOUS_VAULT_EMAIL_DOMAIN,
  ANONYMOUS_VAULT_EMAIL_PREFIX,
  makeAnonymousVaultEmail,
} from "./vault-identity.ts";

export const CHATGPT_SAVED_SESSION_OAUTH_SCOPES = [
  "openid",
  "email",
  PLAY_SESSION_OAUTH_SCOPE,
] as const;
export const SAVED_SESSION_OAUTH_SCOPES = [
  ...CHATGPT_SAVED_SESSION_OAUTH_SCOPES,
  "offline_access",
] as const;
export const SAVED_SESSION_REFRESH_TOKEN_LIFETIME_SECONDS =
  SAVED_INACTIVITY_RETENTION_MS / 1_000;
export const CHATGPT_ACCESS_TOKEN_LIFETIME_SECONDS =
  SAVED_SESSION_REFRESH_TOKEN_LIFETIME_SECONDS;
export const REFRESHING_ACCESS_TOKEN_LIFETIME_SECONDS = 60 * 60;

export type SavedSessionAuthorizationConfiguration = {
  readonly authorizationServerOrigin: AuthorizationServerOrigin;
  readonly databasePath: string;
  readonly resource: URL;
  readonly secret: string;
};

export type SavedSessionAuthorizationIssue = {
  readonly tag: "savedSessionAuthorizationIssue";
  readonly reason: "initializationFailed" | "requestFailed";
  readonly message: string;
};

export type SavedSessionAuthorizationService = {
  readonly handle: (
    request: Request,
  ) => Effect.Effect<Response, SavedSessionAuthorizationIssue>;
};

export class SavedSessionAuthorization extends Context.Service<
  SavedSessionAuthorization,
  SavedSessionAuthorizationService
>()("@dnd/mcp/SavedSessionAuthorization") {}

export function savedSessionAuthorizationLayer(
  configuration: SavedSessionAuthorizationConfiguration,
): Layer.Layer<SavedSessionAuthorization, SavedSessionAuthorizationIssue> {
  return Layer.effect(
    SavedSessionAuthorization,
    Effect.gen(function* () {
      const database = yield* Effect.acquireRelease(
        Effect.try({
          try: () => new DatabaseSync(configuration.databasePath),
          catch: (cause) => authorizationIssue("initializationFailed", cause),
        }),
        (acquired) => Effect.sync(() => acquired.close()),
      );
      const auth = makeBetterAuth(configuration, database);
      yield* Effect.tryPromise({
        try: async () => {
          const context = await auth.$context;
          await context.runMigrations();
          assertAnonymousOnlyDatabase(database);
          normalizeAnonymousVaultEmailLabels(database);
          pruneExpiredAuthorizationState(database, new Date());
        },
        catch: (cause) => authorizationIssue("initializationFailed", cause),
      });
      const requestMutex = yield* Semaphore.make(1);
      const handle = Effect.fn("SavedSessionAuthorization.handle")(
        (request: Request) =>
          requestMutex.withPermits(1)(
            Effect.tryPromise({
              try: () => {
                const backpressure = applySavedSessionAuthorizationBackpressure(
                  database,
                  request,
                  SAVED_SESSION_AUTHORIZATION_CAPACITIES,
                );
                return backpressure === undefined
                  ? auth.handler(request)
                  : Promise.resolve(backpressure);
              },
              catch: (cause) => authorizationIssue("requestFailed", cause),
            }),
          ),
      );
      return SavedSessionAuthorization.of({ handle });
    }),
  );
}

function makeBetterAuth(
  configuration: SavedSessionAuthorizationConfiguration,
  database: DatabaseSync,
) {
  const origin = configuration.authorizationServerOrigin
    .toString()
    .replace(/\/$/u, "");
  return betterAuth({
    appName: "5.5e SRD Oracle",
    baseURL: origin,
    basePath: "/api/auth",
    database,
    secret: configuration.secret,
    trustedOrigins: [origin],
    plugins: [
      jwt(),
      anonymous({
        disableDeleteAnonymousUser: true,
        generateRandomEmail: makeAnonymousVaultEmail,
        generateName: () => "Saved Session Vault",
      }),
      mcp({
        loginPage: "/saved-session-vault",
        consentPage: "/saved-session-consent",
        resource: configuration.resource.toString(),
        scopes: [...SAVED_SESSION_OAUTH_SCOPES],
        clientRegistrationDefaultScopes: [...SAVED_SESSION_OAUTH_SCOPES],
        accessTokenExpiresIn: CHATGPT_ACCESS_TOKEN_LIFETIME_SECONDS,
        scopeExpirations: {
          offline_access: `${REFRESHING_ACCESS_TOKEN_LIFETIME_SECONDS}s`,
        },
        refreshTokenExpiresIn: SAVED_SESSION_REFRESH_TOKEN_LIFETIME_SECONDS,
        allowPublicClientPrelogin: true,
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
      }),
      cimd({
        fetchClientMetadataResource,
        metadataProfile: "mcp-2026-07-28",
      }),
    ],
  });
}

function assertAnonymousOnlyDatabase(database: DatabaseSync): void {
  const row = database
    .prepare(
      'SELECT COUNT(*) AS count FROM "user" WHERE "isAnonymous" IS NOT 1',
    )
    .get();
  if (
    row === undefined ||
    typeof row.count !== "number" ||
    !Number.isSafeInteger(row.count)
  ) {
    throw new Error(
      "Could not verify the saved-session authorization database",
    );
  }
  if (row.count > 0) {
    throw new Error(
      "Saved-session authorization requires a database containing only anonymous users",
    );
  }
}

function normalizeAnonymousVaultEmailLabels(database: DatabaseSync): void {
  const legacyPrefix = "temp-";
  const legacySuffix = "@anonymous.invalid";
  database
    .prepare(
      `UPDATE "user"
       SET "email" = ? || substr(
         "email",
         length(?) + 1,
         length("email") - length(?) - length(?)
       ) || '@' || ?
       WHERE "isAnonymous" IS 1
         AND "email" LIKE ?`,
    )
    .run(
      ANONYMOUS_VAULT_EMAIL_PREFIX,
      legacyPrefix,
      legacyPrefix,
      legacySuffix,
      ANONYMOUS_VAULT_EMAIL_DOMAIN,
      `${legacyPrefix}%${legacySuffix}`,
    );
  database
    .prepare(
      `UPDATE "user"
       SET "email" = substr("email", 1, length("email") - length(?)) || '@' || ?
       WHERE "isAnonymous" IS 1
         AND "email" LIKE ?`,
    )
    .run(
      legacySuffix,
      ANONYMOUS_VAULT_EMAIL_DOMAIN,
      `${ANONYMOUS_VAULT_EMAIL_PREFIX}%${legacySuffix}`,
    );
}

function authorizationIssue(
  reason: SavedSessionAuthorizationIssue["reason"],
  cause: unknown,
): SavedSessionAuthorizationIssue {
  return {
    tag: "savedSessionAuthorizationIssue",
    reason,
    message: cause instanceof Error ? cause.message : String(cause),
  };
}
