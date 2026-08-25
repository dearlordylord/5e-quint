import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { decodePrincipalId } from "./play-session-access.ts";
import {
  createDndMcpHttpServer,
  PUBLIC_MCP_MAX_REQUEST_BYTES,
} from "./public-http-server.ts";
import type { PublicMcpOAuth } from "./public-oauth.ts";
import { openSqlitePlaySessionRepository } from "./recoverable-play-session.ts";

describe("public HTTP boundary", () => {
  test("serves health, release, exact domain challenge, and protected metrics", async () => {
    const repository = openRepository();
    const server = createDndMcpHttpServer({
      playSessionRepository: repository,
      operations: {
        environment: "staging",
        release: "git:0123456789abcdef",
        openAiAppsChallenge: "openai-domain-verification-token",
        metricsBearerToken: "metrics-secret",
      },
    });
    const endpoint = await listen(server);
    try {
      const health = await fetch(new URL("/health", endpoint));
      expect(await health.json()).toEqual({
        status: "ok",
        service: "dnd-srd-oracle",
      });
      const version = await fetch(new URL("/version", endpoint));
      expect(await version.json()).toEqual({
        service: "dnd-srd-oracle",
        environment: "staging",
        release: "git:0123456789abcdef",
        storageFormatVersion: 2,
      });
      const challenge = await fetch(
        new URL("/.well-known/openai-apps-challenge", endpoint),
      );
      expect(challenge.headers.get("content-type")).toContain("text/plain");
      expect(await challenge.text()).toBe("openai-domain-verification-token");

      expect((await fetch(new URL("/metrics", endpoint))).status).toBe(404);
      const metrics = await fetch(new URL("/metrics", endpoint), {
        headers: { authorization: "Bearer metrics-secret" },
      });
      expect(metrics.status).toBe(200);
      expect(await metrics.text()).toContain("dnd_mcp_requests_total");
    } finally {
      await close(server);
      repository.close();
    }
  });

  test("publishes OAuth metadata and creates saved sessions for a verified bearer", async () => {
    const repository = openRepository();
    const server = createDndMcpHttpServer({
      playSessionRepository: repository,
      oauth: fakeOAuth(),
    });
    const endpoint = await listen(server);
    const metadataUrl = new URL(
      "/.well-known/oauth-protected-resource",
      endpoint,
    );
    const metadata = await fetch(metadataUrl);
    expect(metadata.status).toBe(200);
    expect(await metadata.json()).toEqual({
      resource: "https://oracle.example.test/mcp",
      authorization_servers: ["https://identity.example.test"],
      scopes_supported: ["play-sessions"],
    });

    const client = new Client({ name: "authenticated-http", version: "0.1.0" });
    const transport = new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { authorization: "Bearer valid-token" } },
    });
    try {
      await client.connect(transport as Transport);
      const created = await client.callTool({
        name: "create_play_session",
        arguments: {},
      });
      expect(created.isError).not.toBe(true);
      expect(created.structuredContent).toMatchObject({
        operation: {
          result: { access: { tag: "authenticated" } },
        },
        tenure: { tag: "saved", persistence: "saved" },
      });
      expect(JSON.stringify(created.structuredContent)).not.toContain(
        "guest-access:",
      );
    } finally {
      await client.close().catch(() => undefined);
      await close(server);
      repository.close();
    }
  });

  test("rejects invalid bearer tokens and oversized bodies before MCP parsing", async () => {
    const repository = openRepository();
    const server = createDndMcpHttpServer({
      playSessionRepository: repository,
      oauth: fakeOAuth(),
    });
    const endpoint = await listen(server);
    try {
      const unauthorized = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: "Bearer invalid-token" },
        body: "{}",
      });
      expect(unauthorized.status).toBe(401);
      expect(unauthorized.headers.get("www-authenticate")).toContain(
        "resource_metadata=",
      );

      const oversized = await fetch(endpoint, {
        method: "POST",
        body: "x".repeat(PUBLIC_MCP_MAX_REQUEST_BYTES + 1),
      });
      expect(oversized.status).toBe(413);
    } finally {
      await close(server);
      repository.close();
    }
  });
});

function fakeOAuth(): PublicMcpOAuth {
  const principal = decodePrincipalId("principal:http-test");
  if (Either.isLeft(principal)) throw new Error(principal.left);
  const resource = new URL("https://oracle.example.test/mcp");
  return {
    resource,
    resourceMetadataUrl: new URL(
      "/.well-known/oauth-protected-resource",
      resource,
    ),
    protectedResourceMetadata: {
      resource: resource.toString(),
      authorization_servers: ["https://identity.example.test"],
      scopes_supported: ["play-sessions"],
    },
    verifyAccessToken(token) {
      return Promise.resolve(
        token === "valid-token"
          ? Either.right(principal.right)
          : Either.left({
              tag: "publicMcpOAuthIssue",
              reason: "invalidToken",
              message: "invalid",
            }),
      );
    },
  };
}

function openRepository() {
  const repository = openSqlitePlaySessionRepository(":memory:");
  if (Either.isLeft(repository)) throw new Error(repository.left.message);
  return repository.right;
}

async function listen(
  server: ReturnType<typeof createDndMcpHttpServer>,
): Promise<URL> {
  const endpoint = await server.listen();
  if (Either.isLeft(endpoint)) throw new Error(endpoint.left.message);
  return endpoint.right;
}

async function close(
  server: ReturnType<typeof createDndMcpHttpServer>,
): Promise<void> {
  const closed = await server.close();
  if (Either.isLeft(closed)) throw new Error(closed.left.message);
}
