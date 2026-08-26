import { DatabaseSync } from "node:sqlite";

import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Context, Effect, Layer } from "effect";

import { PLAY_SESSION_OAUTH_SCOPE } from "../../tool-definition-contract.ts";
import { fetchClientMetadataResource } from "./cimd-metadata-fetch.ts";

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
    emailAndPassword: { enabled: true },
    plugins: [
      jwt(),
      mcp({
        loginPage: "/prototype/login",
        consentPage: "/prototype/consent",
        resource: configuration.resource.toString(),
        scopes: ["openid", "profile", "email", PLAY_SESSION_OAUTH_SCOPE],
        clientRegistrationDefaultScopes: [
          "openid",
          "profile",
          "email",
          PLAY_SESSION_OAUTH_SCOPE,
        ],
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
