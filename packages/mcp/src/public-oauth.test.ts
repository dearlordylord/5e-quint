import { createServer } from "node:http";

import { Either } from "effect";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, test } from "vitest";

import { createPublicMcpOAuthFromEnvironment } from "./public-oauth.ts";

describe("public MCP OAuth configuration", () => {
  test("keeps local guest development auth-free when OAuth is unconfigured", () => {
    expect(createPublicMcpOAuthFromEnvironment({})).toEqual(
      Either.right(undefined),
    );
    expect(
      createPublicMcpOAuthFromEnvironment({
        DND_OAUTH_RESOURCE_URL: "",
        DND_OAUTH_AUTHORIZATION_SERVER: "",
        DND_OAUTH_ISSUER: "",
        DND_OAUTH_JWKS_URL: "",
      }),
    ).toEqual(Either.right(undefined));
  });

  test("rejects partial configuration instead of silently weakening save auth", () => {
    expect(
      createPublicMcpOAuthFromEnvironment({
        DND_OAUTH_RESOURCE_URL: "https://oracle.example.test/mcp",
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { reason: "invalidConfiguration" },
    });
  });

  test("derives provider-neutral protected-resource metadata", () => {
    const oauth = createPublicMcpOAuthFromEnvironment({
      DND_OAUTH_RESOURCE_URL: "https://oracle.example.test/mcp",
      DND_OAUTH_AUTHORIZATION_SERVER: "https://identity.example.test",
      DND_OAUTH_ISSUER: "https://identity.example.test",
      DND_OAUTH_JWKS_URL: "https://identity.example.test/.well-known/jwks.json",
    });
    if (Either.isLeft(oauth) || oauth.right === undefined) {
      throw new Error("Expected complete OAuth configuration.");
    }
    expect(oauth.right.protectedResourceMetadata).toEqual({
      resource: "https://oracle.example.test/mcp",
      authorization_servers: ["https://identity.example.test/"],
      scopes_supported: ["play-sessions"],
    });
  });

  test("verifies signature, issuer, audience, expiry, subject, and scope", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const jwk = {
      ...(await exportJWK(publicKey)),
      kid: "test-key",
      alg: "RS256",
    };
    const jwksServer = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ keys: [jwk] }));
    });
    const jwksUrl = await new Promise<URL>((resolve) => {
      jwksServer.listen(0, "127.0.0.1", () => {
        const address = jwksServer.address();
        if (address === null || typeof address === "string") {
          throw new Error("JWKS test server did not bind a TCP address.");
        }
        resolve(new URL(`http://127.0.0.1:${address.port}/jwks`));
      });
    });
    const oauth = createPublicMcpOAuthFromEnvironment({
      DND_OAUTH_RESOURCE_URL: "https://oracle.example.test/mcp",
      DND_OAUTH_AUTHORIZATION_SERVER: "https://identity.example.test",
      DND_OAUTH_ISSUER: "https://issuer.example.test",
      DND_OAUTH_JWKS_URL: jwksUrl.toString(),
    });
    if (Either.isLeft(oauth) || oauth.right === undefined) {
      throw new Error("Expected complete OAuth configuration.");
    }
    try {
      const valid = await signedToken(privateKey, {
        audience: "https://oracle.example.test/mcp",
        expiresIn: "5m",
      });
      expect(await oauth.right.verifyAccessToken(valid)).toMatchObject({
        _tag: "Right",
        right: expect.stringMatching(/^oauth-principal:[0-9a-f]{64}$/u),
      });
      const wrongAudience = await signedToken(privateKey, {
        audience: "another-resource",
        expiresIn: "5m",
      });
      expect(await oauth.right.verifyAccessToken(wrongAudience)).toMatchObject({
        _tag: "Left",
        left: { reason: "invalidToken" },
      });
      const expired = await signedToken(privateKey, {
        audience: "https://oracle.example.test/mcp",
        expiresIn: "-1s",
      });
      expect(await oauth.right.verifyAccessToken(expired)).toMatchObject({
        _tag: "Left",
        left: { reason: "invalidToken" },
      });
      const missingScope = await signedToken(privateKey, {
        audience: "https://oracle.example.test/mcp",
        expiresIn: "5m",
        includeScope: false,
      });
      expect(await oauth.right.verifyAccessToken(missingScope)).toMatchObject({
        _tag: "Left",
        left: { reason: "invalidToken" },
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        jwksServer.close((error) =>
          error === undefined ? resolve() : reject(error),
        ),
      );
    }
  });
});

function signedToken(
  privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"],
  input: {
    readonly audience: string;
    readonly expiresIn: string;
    readonly includeScope?: boolean;
  },
): Promise<string> {
  return new SignJWT(
    input.includeScope === false ? {} : { scope: "play-sessions" },
  )
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer("https://issuer.example.test")
    .setAudience(input.audience)
    .setSubject("principal:jwt-test")
    .setIssuedAt()
    .setExpirationTime(input.expiresIn)
    .sign(privateKey);
}
