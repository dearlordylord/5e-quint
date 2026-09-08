import assert from "node:assert/strict";
import test from "node:test";

import { checkConnectivity } from "./check-connectivity.mjs";

const origin = new URL("https://oracle.example.test");
const issuer = `${origin.origin}/api/auth`;

function fixture(change = (_key, response) => response) {
  const calls = [];
  return {
    calls,
    fetch: async (url, options) => {
      const body =
        options.body === undefined ? undefined : JSON.parse(options.body);
      const key = body?.method ?? url.pathname;
      calls.push(key);
      assert.equal(options.redirect, "error");
      assert.ok(options.signal instanceof AbortSignal);
      const metadata = {
        issuer,
        authorization_endpoint: `${issuer}/oauth2/authorize`,
        token_endpoint: `${issuer}/oauth2/token`,
        userinfo_endpoint: `${issuer}/oauth2/userinfo`,
        registration_endpoint: `${issuer}/oauth2/register`,
        jwks_uri: `${issuer}/jwks`,
        code_challenge_methods_supported: ["S256"],
        scopes_supported: [
          "openid",
          "email",
          "play-sessions",
          "offline_access",
        ],
      };
      const values = {
        "/health": { status: "ok" },
        "/version": { release: "a".repeat(40) },
        "/.well-known/oauth-protected-resource": {
          resource: `${origin.origin}/mcp`,
          authorization_servers: [issuer],
          scopes_supported: ["play-sessions"],
        },
        "/api/auth/.well-known/oauth-authorization-server": metadata,
        "/api/auth/.well-known/openid-configuration": metadata,
        "/api/auth/jwks": { keys: [{ kty: "RSA" }] },
        initialize: {
          protocolVersion: "2025-06-18",
          capabilities: { tools: {} },
        },
        "tools/list": {
          tools: [
            { name: "list_catalog_units", annotations: { readOnlyHint: true } },
          ],
        },
        "tools/call": {
          content: [{ type: "text", text: "catalog" }],
          structuredContent: {
            unitsByKind: {
              class: [{ id: "class_synthetic", name: "Synthetic Class" }],
            },
          },
        },
      };
      if (key === "tools/call")
        assert.deepEqual(body.params, {
          name: "list_catalog_units",
          arguments: {},
        });
      const response =
        key === "notifications/initialized"
          ? new Response(null, { status: 202 })
          : Response.json(
              body
                ? { jsonrpc: "2.0", id: body.id, result: values[key] }
                : values[key],
            );
      return change(key, response);
    },
  };
}

test("checks discovery and executes only the admitted read-only catalog tool", async () => {
  const target = fixture();
  const result = await checkConnectivity(origin, target.fetch);
  assert.equal(result.status, "passed");
  assert.equal(result.release, "a".repeat(40));
  assert.equal(result.checks.length, 10);
  assert.deepEqual(target.calls.slice(-4), [
    "initialize",
    "notifications/initialized",
    "tools/list",
    "tools/call",
  ]);
});

for (const [label, key, replacement, error] of [
  [
    "unavailable host",
    "/health",
    () => new Response("secret proxy detail", { status: 503 }),
    /health/,
  ],
  [
    "HTML login interception",
    "/health",
    () => new Response("<html>login</html>"),
    /health/,
  ],
  [
    "missing OIDC scopes",
    "/api/auth/.well-known/openid-configuration",
    async (response) =>
      Response.json({
        ...(await response.json()),
        scopes_supported: ["play-sessions"],
      }),
    /openid-configuration/,
  ],
  [
    "JSON-RPC error inside HTTP 200",
    "tools/call",
    () =>
      Response.json({
        jsonrpc: "2.0",
        id: 3,
        error: { code: -32603, message: "secret internal detail" },
      }),
    /tools\/call/,
  ],
  [
    "MCP tool error inside HTTP 200",
    "tools/call",
    () =>
      Response.json({
        jsonrpc: "2.0",
        id: 3,
        result: {
          isError: true,
          content: [{ type: "text", text: "secret tool detail" }],
        },
      }),
    /catalog execution/,
  ],
  [
    "missing catalog data inside HTTP 200",
    "tools/call",
    () =>
      Response.json({
        jsonrpc: "2.0",
        id: 3,
        result: {
          content: [{ type: "text", text: "No catalog" }],
          structuredContent: { unitsByKind: {} },
        },
      }),
    /catalog data/,
  ],
  [
    "mismatched response id",
    "initialize",
    () => Response.json({ jsonrpc: "2.0", id: 7, result: {} }),
    /initialize/,
  ],
  [
    "missing read-only admission",
    "tools/list",
    () =>
      Response.json({
        jsonrpc: "2.0",
        id: 2,
        result: { tools: [{ name: "list_catalog_units" }] },
      }),
    /read-only admission/,
  ],
  [
    "oversized response",
    "tools/list",
    () => Response.json({ padding: "x".repeat(2_000_001) }),
    /tools\/list/,
  ],
]) {
  test(`fails closed on ${label}`, async () => {
    const target = fixture((observed, response) =>
      observed === key ? replacement(response) : response,
    );
    await assert.rejects(checkConnectivity(origin, target.fetch), (cause) => {
      assert.match(cause.message, error);
      assert.ok(!cause.message.includes("secret"));
      return true;
    });
    if (key !== "tools/call") assert.ok(!target.calls.includes("tools/call"));
  });
}

test("reports timeout without leaking transport details", async () => {
  await assert.rejects(
    checkConnectivity(origin, async () => {
      throw new DOMException("secret transport detail", "TimeoutError");
    }),
    /^Error: health: HTTP, transport, timeout, or JSON failure$/u,
  );
});

test("rejects credentials, paths, and non-HTTPS origins before network access", async () => {
  for (const url of [
    "http://oracle.example.test",
    "https://oracle.example.test/mcp",
    "https://user:secret@oracle.example.test",
  ]) {
    await assert.rejects(
      checkConnectivity(new URL(url), () => assert.fail("unexpected request")),
      /configuration/,
    );
  }
});
