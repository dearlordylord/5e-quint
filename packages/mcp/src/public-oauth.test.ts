import { createServer } from "node:http";

import { Result } from "effect";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, test } from "vitest";

import { createPublicMcpOAuth } from "./public-oauth.ts";

describe("public MCP OAuth", () => {
  test("derives provider-neutral protected-resource metadata", () => {
    const oauth = createPublicMcpOAuth({
      resource: "https://oracle.example.test/mcp",
      authorizationServer: "https://identity.example.test",
      issuer: "https://identity.example.test",
      jwksUrl: "https://identity.example.test/.well-known/jwks.json",
    });
    if (Result.isFailure(oauth)) {
      throw new Error("Expected complete OAuth configuration.");
    }
    expect(oauth.success.protectedResourceMetadata).toEqual({
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
    const oauth = createPublicMcpOAuth({
      resource: "https://oracle.example.test/mcp",
      authorizationServer: "https://identity.example.test",
      issuer: "https://issuer.example.test",
      jwksUrl: jwksUrl.toString(),
    });
    if (Result.isFailure(oauth)) {
      throw new Error("Expected complete OAuth configuration.");
    }
    try {
      const valid = await signedToken(privateKey, {
        audience: "https://oracle.example.test/mcp",
        expiresIn: "5m",
      });
      expect(await oauth.success.verifyAccessToken(valid)).toMatchObject({
        _tag: "Right",
        right: expect.stringMatching(/^oauth-principal:[0-9a-f]{64}$/u),
      });
      const wrongAudience = await signedToken(privateKey, {
        audience: "another-resource",
        expiresIn: "5m",
      });
      expect(
        await oauth.success.verifyAccessToken(wrongAudience),
      ).toMatchObject({
        _tag: "Left",
        left: { reason: "invalidToken" },
      });
      const expired = await signedToken(privateKey, {
        audience: "https://oracle.example.test/mcp",
        expiresIn: "-1s",
      });
      expect(await oauth.success.verifyAccessToken(expired)).toMatchObject({
        _tag: "Left",
        left: { reason: "invalidToken" },
      });
      const missingScope = await signedToken(privateKey, {
        audience: "https://oracle.example.test/mcp",
        expiresIn: "5m",
        includeScope: false,
      });
      expect(await oauth.success.verifyAccessToken(missingScope)).toMatchObject(
        {
          _tag: "Left",
          left: { reason: "invalidToken" },
        },
      );
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
