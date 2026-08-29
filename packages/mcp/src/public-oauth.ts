import { createHash } from "node:crypto";

import { Result, Schema } from "effect";
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
  ): Promise<Result.Result<PrincipalId, PublicMcpOAuthIssue>>;
};

export type PublicMcpOAuthIssue = {
  readonly tag: "publicMcpOAuthIssue";
  readonly reason: "invalidConfiguration" | "invalidToken";
  readonly message: string;
};

const PublicMcpOAuthConfigurationSchema = Schema.Struct({
  resource: Schema.URL,
  authorizationServer: Schema.URL,
  issuer: Schema.Trimmed.check(Schema.isNonEmpty()),
  jwksUrl: Schema.URL,
});

export function createPublicMcpOAuth(
  input: unknown,
): Result.Result<PublicMcpOAuth, PublicMcpOAuthIssue> {
  const configuration = Schema.decodeUnknownResult(
    PublicMcpOAuthConfigurationSchema,
  )(input);
  if (Result.isFailure(configuration)) {
    return Result.fail({
      tag: "publicMcpOAuthIssue",
      reason: "invalidConfiguration",
      message: configuration.failure.message,
    });
  }
  const { resource, authorizationServer, issuer, jwksUrl } =
    configuration.success;
  const keySet = createRemoteJWKSet(jwksUrl);
  const resourceMetadataUrl = new URL(
    "/.well-known/oauth-protected-resource",
    resource,
  );
  return Result.succeed({
    resource,
    resourceMetadataUrl,
    protectedResourceMetadata: {
      resource: resource.toString(),
      authorization_servers: [authorizationServer.toString()],
      scopes_supported: [PLAY_SESSION_OAUTH_SCOPE],
    },
    async verifyAccessToken(token) {
      try {
        const verified = await jwtVerify(token, keySet, {
          issuer,
          audience: resource.toString(),
        });
        const principalId = oauthPrincipalId(issuer, verified.payload.sub);
        const scopes = tokenScopes(
          verified.payload.scope,
          verified.payload.scp,
        );
        if (
          Result.isFailure(principalId) ||
          !scopes.includes(PLAY_SESSION_OAUTH_SCOPE)
        ) {
          return Result.fail(invalidTokenIssue());
        }
        return Result.succeed(principalId.success);
      } catch {
        return Result.fail(invalidTokenIssue());
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
