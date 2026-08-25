import { Either, Schema } from "effect";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { decodePrincipalId, type PrincipalId } from "./play-session-access.ts";
import { PLAY_SESSION_OAUTH_SCOPE } from "./tool-definition-contract.ts";

export type PublicMcpOAuth = {
  readonly resource: URL;
  readonly resourceMetadataUrl: URL;
  readonly protectedResourceMetadata: {
    readonly resource: string;
    readonly authorization_servers: readonly [string];
    readonly scopes_supported: readonly [typeof PLAY_SESSION_OAUTH_SCOPE];
  };
  verifyAccessToken(
    token: string,
  ): Promise<Either.Either<PrincipalId, PublicMcpOAuthIssue>>;
};

export type PublicMcpOAuthIssue = {
  readonly tag: "publicMcpOAuthIssue";
  readonly reason: "invalidConfiguration" | "invalidToken";
  readonly message: string;
};

const PublicMcpOAuthConfigurationSchema = Schema.Struct({
  resource: Schema.URL,
  authorizationServer: Schema.URL,
  issuer: Schema.NonEmptyTrimmedString,
  audience: Schema.NonEmptyTrimmedString,
  jwksUrl: Schema.URL,
});

export function createPublicMcpOAuth(
  input: unknown,
): Either.Either<PublicMcpOAuth, PublicMcpOAuthIssue> {
  const configuration = Schema.decodeUnknownEither(
    PublicMcpOAuthConfigurationSchema,
  )(input);
  if (Either.isLeft(configuration)) {
    return Either.left({
      tag: "publicMcpOAuthIssue",
      reason: "invalidConfiguration",
      message: configuration.left.message,
    });
  }
  const { resource, authorizationServer, issuer, audience, jwksUrl } =
    configuration.right;
  const keySet = createRemoteJWKSet(jwksUrl);
  const resourceMetadataUrl = new URL(
    "/.well-known/oauth-protected-resource",
    resource,
  );
  return Either.right({
    resource,
    resourceMetadataUrl,
    protectedResourceMetadata: {
      resource: resource.toString(),
      authorization_servers: [authorizationServer.toString()],
      scopes_supported: [PLAY_SESSION_OAUTH_SCOPE],
    },
    async verifyAccessToken(token) {
      try {
        const verified = await jwtVerify(token, keySet, { issuer, audience });
        const principalId = oauthPrincipalId(issuer, verified.payload.sub);
        const scopes = tokenScopes(
          verified.payload.scope,
          verified.payload.scp,
        );
        if (
          Either.isLeft(principalId) ||
          !scopes.includes(PLAY_SESSION_OAUTH_SCOPE)
        ) {
          return Either.left(invalidTokenIssue());
        }
        return Either.right(principalId.right);
      } catch {
        return Either.left(invalidTokenIssue());
      }
    },
  });
}

function oauthPrincipalId(
  issuer: string,
  subject: unknown,
): ReturnType<typeof decodePrincipalId> {
  if (typeof subject !== "string" || subject.trim().length === 0) {
    return decodePrincipalId(undefined);
  }
  return decodePrincipalId(
    `oauth-principal:${createHash("sha256")
      .update(`${issuer}\u0000${subject}`)
      .digest("hex")}`,
  );
}

export function createPublicMcpOAuthFromEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): Either.Either<PublicMcpOAuth | undefined, PublicMcpOAuthIssue> {
  const input = {
    resource: environment.DND_OAUTH_RESOURCE_URL,
    authorizationServer: environment.DND_OAUTH_AUTHORIZATION_SERVER,
    issuer: environment.DND_OAUTH_ISSUER,
    audience: environment.DND_OAUTH_AUDIENCE,
    jwksUrl: environment.DND_OAUTH_JWKS_URL,
  };
  if (Object.values(input).every((value) => value === undefined)) {
    return Either.right(undefined);
  }
  if (Object.values(input).some((value) => value === undefined)) {
    return Either.left({
      tag: "publicMcpOAuthIssue",
      reason: "invalidConfiguration",
      message:
        "OAuth configuration is partial. Set all DND_OAUTH_* variables or none of them.",
    });
  }
  return createPublicMcpOAuth(input);
}

function tokenScopes(scope: unknown, scp: unknown): readonly string[] {
  if (typeof scope === "string") return scope.split(/\s+/u).filter(Boolean);
  if (Array.isArray(scp) && scp.every((item) => typeof item === "string")) {
    return scp;
  }
  return [];
}

function invalidTokenIssue(): PublicMcpOAuthIssue {
  return {
    tag: "publicMcpOAuthIssue",
    reason: "invalidToken",
    message: "The OAuth access token is invalid or lacks the required scope.",
  };
}
import { createHash } from "node:crypto";
