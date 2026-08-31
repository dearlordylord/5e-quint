import { Schema } from "effect";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  assertRemainingTokenLifetime,
  assertTokenLifetime,
  authorizeExistingBrowserSession,
  decodeJson,
  requestVaultRedirect,
  responseCookie,
} from "./oauth-smoke-support.ts";

afterEach(() => vi.restoreAllMocks());

describe("OAuth smoke assertions", () => {
  test("rejects invalid access-token lifetimes", () => {
    expect(() => assertTokenLifetime({ expires_in: 59 }, 60)).toThrow(
      "wrong lifetime",
    );
    expect(() => assertRemainingTokenLifetime({ expires_in: 0 }, 60)).toThrow(
      "invalid remaining lifetime",
    );
    expect(() => assertRemainingTokenLifetime({ expires_in: 61 }, 60)).toThrow(
      "invalid remaining lifetime",
    );
  });

  test("requires a browser-session cookie", () => {
    expect(() => responseCookie(new Response())).toThrow(
      "returned no session cookie",
    );
  });

  test("reports HTTP and schema decoding failures", async () => {
    await expect(
      decodeJson(
        Schema.Struct({ ok: Schema.Literal(true) }),
        new Response("no", { status: 503 }),
      ),
    ).rejects.toThrow("HTTP 503: no");
    await expect(
      decodeJson(
        Schema.Struct({ ok: Schema.Literal(true) }),
        Response.json({ ok: false }),
      ),
    ).rejects.toThrow();
  });

  test("requires vault and existing-session authorization redirects", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(Response.json({ redirect: false, url: "/not-a-vault" })),
    );
    await expect(requestVaultRedirect(authorizationInput())).rejects.toThrow(
      "did not reach anonymous vault creation",
    );
    await expect(
      authorizeExistingBrowserSession(existingSessionInput()),
    ).rejects.toThrow("was not authorized");
  });

  test("requires an authorization code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        redirect: true,
        url: "https://oracle.example/oauth-callback",
      }),
    );

    await expect(
      authorizeExistingBrowserSession(existingSessionInput()),
    ).rejects.toThrow("did not return an authorization code");
  });

  test("keeps omitted token-response keys absent", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          redirect: true,
          url: "https://chatgpt.com/oauth/callback?code=authorization-code",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          access_token: "access-token",
          expires_in: 60,
          scope: "openid email play-sessions",
          token_type: "Bearer",
        }),
      );

    const tokens = await authorizeExistingBrowserSession(
      existingSessionInput(),
    );

    expect(tokens).not.toHaveProperty("id_token");
    expect(tokens).not.toHaveProperty("refresh_token");
  });
});

function authorizationInput() {
  return {
    authorizationEndpoint: new URL(
      "https://oracle.example/api/auth/oauth2/authorize",
    ),
    clientId: "client-id",
    origin: new URL("https://oracle.example"),
    redirectUri: new URL("https://chatgpt.com/oauth/callback"),
    requestedScopes: "openid email play-sessions",
    resource: new URL("https://oracle.example/mcp"),
    state: "state",
  };
}

function existingSessionInput() {
  return {
    ...authorizationInput(),
    cookie: "session=test",
    tokenEndpoint: new URL("https://oracle.example/api/auth/oauth2/token"),
  };
}
