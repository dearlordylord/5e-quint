import { DatabaseSync } from "node:sqlite";

import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { anonymous, jwt } from "better-auth/plugins";
import { Context, Effect, Layer } from "effect";

import { SAVED_INACTIVITY_RETENTION_MS } from "../../play-session-access.ts";
import { PLAY_SESSION_OAUTH_SCOPE } from "../../tool-definition-contract.ts";
import { fetchClientMetadataResource } from "./cimd-metadata-fetch.ts";

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

export type BetterAuthPrototypeConfiguration = {
  readonly authorizationServerOrigin: URL;
  readonly databasePath: string;
  readonly resource: URL;
  readonly secret: string;
};

export type BetterAuthPrototypeIssue = {
  readonly tag: "betterAuthPrototypeIssue";
  readonly reason: "initializationFailed" | "requestFailed";
  readonly message: string;
};

export type BetterAuthPrototypeService = {
  readonly handle: (
    request: Request,
  ) => Effect.Effect<Response, BetterAuthPrototypeIssue>;
};

export class BetterAuthPrototype extends Context.Tag(
  "@dnd/mcp/prototype/BetterAuth",
)<BetterAuthPrototype, BetterAuthPrototypeService>() {}

export function betterAuthPrototypeLayer(
  configuration: BetterAuthPrototypeConfiguration,
): Layer.Layer<BetterAuthPrototype, BetterAuthPrototypeIssue> {
  return Layer.scoped(
    BetterAuthPrototype,
    Effect.gen(function* () {
      const database = yield* Effect.acquireRelease(
        Effect.try({
          try: () => new DatabaseSync(configuration.databasePath),
          catch: (cause) => prototypeIssue("initializationFailed", cause),
        }),
        (acquired) => Effect.sync(() => acquired.close()),
      );
      const auth = makeBetterAuth(configuration, database);
      yield* Effect.tryPromise({
        try: async () => {
          const context = await auth.$context;
          await context.runMigrations();
          assertAnonymousOnlyDatabase(database);
        },
        catch: (cause) => prototypeIssue("initializationFailed", cause),
      });
      const handle = Effect.fn("BetterAuthPrototype.handle")(
        (request: Request) =>
          Effect.tryPromise({
            try: () => auth.handler(request),
            catch: (cause) => prototypeIssue("requestFailed", cause),
          }),
      );
      return BetterAuthPrototype.of({ handle });
    }),
  );
}

function makeBetterAuth(
  configuration: BetterAuthPrototypeConfiguration,
  database: DatabaseSync,
) {
  const origin = configuration.authorizationServerOrigin
    .toString()
    .replace(/\/$/u, "");
  return betterAuth({
    appName: "5.5e SRD Oracle Better Auth prototype",
    baseURL: origin,
    basePath: "/api/auth",
    database,
    secret: configuration.secret,
    trustedOrigins: [origin],
    plugins: [
      jwt(),
      anonymous({
        disableDeleteAnonymousUser: true,
        emailDomainName: "anonymous.invalid",
        generateName: () => "Saved Session Vault",
      }),
      mcp({
        loginPage: "/prototype/vault",
        consentPage: "/prototype/consent",
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
    throw new Error("Could not verify the prototype auth database");
  }
  if (row.count > 0) {
    throw new Error(
      "The credential-free prototype requires an auth database containing only anonymous users",
    );
  }
}

function prototypeIssue(
  reason: BetterAuthPrototypeIssue["reason"],
  cause: unknown,
): BetterAuthPrototypeIssue {
  return {
    tag: "betterAuthPrototypeIssue",
    reason,
    message: cause instanceof Error ? cause.message : String(cause),
  };
}
