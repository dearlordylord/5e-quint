import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CHATGPT_SAVED_SESSION_OAUTH_SCOPES,
  PLAY_SESSION_OAUTH_SCOPE,
} from "../../packages/mcp/src/oauth-scopes.ts";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const PROTOCOL_VERSION = "2025-06-18";
const CATALOG_TOOL = "list_catalog_units";

export async function checkConnectivity(origin, fetchRequest = fetch) {
  if (
    origin.protocol !== "https:" ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    origin.username ||
    origin.password
  )
    throw new Error("configuration: expected a public HTTPS origin");

  const checks = [];
  async function request(check, path, body) {
    try {
      const response = await fetchRequest(new URL(path, origin), {
        method: body === undefined ? "GET" : "POST",
        redirect: "error",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
          "mcp-protocol-version": PROTOCOL_VERSION,
          "user-agent": "dnd-oracle-connectivity-monitor/1.0",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) throw new Error();
      if (response.headers.has("mcp-session-id")) throw new Error();
      if (body?.method === "notifications/initialized") {
        await response.body?.cancel();
        if (response.status !== 202) throw new Error();
        checks.push(check);
        return;
      }
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error();
      const reader = response.body.getReader();
      const chunks = [];
      let bytes = 0;
      try {
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
          bytes += next.value.byteLength;
          if (bytes > MAX_RESPONSE_BYTES) throw new Error();
          chunks.push(next.value);
        }
      } finally {
        await reader.cancel();
      }
      const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      checks.push(check);
      return value;
    } catch {
      throw new Error(`${check}: HTTP, transport, timeout, or JSON failure`);
    }
  }
  function requireFact(condition, check) {
    if (!condition) throw new Error(`${check}: response contract mismatch`);
  }
  async function rpc(id, method, params) {
    const envelope = await request(method, "/mcp", {
      jsonrpc: "2.0",
      id,
      method,
      params,
    });
    requireFact(
      envelope?.jsonrpc === "2.0" &&
        envelope.id === id &&
        !("error" in envelope) &&
        typeof envelope.result === "object" &&
        envelope.result !== null,
      method,
    );
    return envelope.result;
  }

  const health = await request("health", "/health");
  requireFact(health?.status === "ok", "health");
  const version = await request("version", "/version");
  requireFact(
    typeof version?.release === "string" &&
      /^[a-f0-9]{40}$/u.test(version.release),
    "version",
  );
  const issuer = new URL("/api/auth", origin).href;
  const resource = await request(
    "resource discovery",
    "/.well-known/oauth-protected-resource",
  );
  requireFact(
    resource?.resource === new URL("/mcp", origin).href &&
      Array.isArray(resource.authorization_servers) &&
      resource.authorization_servers.length === 1 &&
      resource.authorization_servers.includes(issuer) &&
      Array.isArray(resource.scopes_supported) &&
      resource.scopes_supported.includes(PLAY_SESSION_OAUTH_SCOPE),
    "resource discovery",
  );
  for (const document of [
    "oauth-authorization-server",
    "openid-configuration",
  ]) {
    const metadata = await request(
      document,
      `/api/auth/.well-known/${document}`,
    );
    requireFact(
      metadata?.issuer === issuer &&
        metadata.authorization_endpoint === `${issuer}/oauth2/authorize` &&
        metadata.token_endpoint === `${issuer}/oauth2/token` &&
        metadata.userinfo_endpoint === `${issuer}/oauth2/userinfo` &&
        metadata.jwks_uri === `${issuer}/jwks` &&
        metadata.registration_endpoint === `${issuer}/oauth2/register` &&
        Array.isArray(metadata.code_challenge_methods_supported) &&
        metadata.code_challenge_methods_supported.includes("S256") &&
        Array.isArray(metadata.scopes_supported) &&
        CHATGPT_SAVED_SESSION_OAUTH_SCOPES.every((scope) =>
          metadata.scopes_supported.includes(scope),
        ),
      document,
    );
  }
  const jwks = await request("JWKS", "/api/auth/jwks");
  requireFact(Array.isArray(jwks?.keys) && jwks.keys.length > 0, "JWKS");
  const initialized = await rpc(1, "initialize", {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: "dnd-oracle-connectivity-monitor", version: "1.0" },
  });
  requireFact(
    initialized.protocolVersion === PROTOCOL_VERSION &&
      typeof initialized.capabilities?.tools === "object" &&
      initialized.capabilities.tools !== null,
    "initialize",
  );
  await request("initialized notification", "/mcp", {
    jsonrpc: "2.0",
    method: "notifications/initialized",
  });
  const catalog = await rpc(2, "tools/list", {});
  requireFact(Array.isArray(catalog.tools), "tools/list");
  const tool = catalog.tools.find((tool) => tool?.name === CATALOG_TOOL);
  requireFact(
    tool?.annotations?.readOnlyHint === true,
    "catalog read-only admission",
  );
  const result = await rpc(3, "tools/call", {
    name: CATALOG_TOOL,
    arguments: {},
  });
  requireFact(
    (result.isError === undefined || result.isError === false) &&
      Array.isArray(result.content) &&
      result.content.some(
        (content) =>
          content?.type === "text" &&
          typeof content.text === "string" &&
          content.text.length > 0,
      ),
    "catalog execution",
  );
  const unitsByKind = result.structuredContent?.unitsByKind;
  requireFact(
    typeof unitsByKind === "object" &&
      unitsByKind !== null &&
      !Array.isArray(unitsByKind) &&
      Object.values(unitsByKind).some(
        (units) =>
          Array.isArray(units) &&
          units.length > 0 &&
          units.every(
            (unit) =>
              typeof unit?.id === "string" && typeof unit?.name === "string",
          ),
      ),
    "catalog data",
  );
  return {
    status: "passed",
    origin: origin.origin,
    release: version.release,
    checkedAt: new Date().toISOString(),
    checks,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const evidence = await checkConnectivity(new URL(process.argv[2]));
    process.stdout.write(`${JSON.stringify(evidence)}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ status: "failed", check: error instanceof TypeError ? "configuration: invalid origin" : error.message })}\n`,
    );
    process.exitCode = 1;
  }
}
