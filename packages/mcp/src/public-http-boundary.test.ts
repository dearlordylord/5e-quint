import { EventEmitter, once } from "node:events";
import { request as requestHttp } from "node:http";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Either, Effect, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { decodePrincipalId } from "./play-session-access.ts";
import {
  createDndMcpHttpServer,
  PUBLIC_MCP_MAX_REQUEST_BYTES,
} from "./public-http-server.ts";
import type { PublicMcpOAuth } from "./public-oauth.ts";
import { AuthorizationServerOriginSchema } from "./public-origin.ts";
import { PublicMcpPublisherNameSchema } from "./public-service-operations.ts";
import { openSqlitePlaySessionRepository } from "./recoverable-play-session.ts";
import type { SavedSessionAuthorizationService } from "./saved-session-authorization/service.ts";

describe("public HTTP boundary", () => {
  test("serves the silent plugin demonstration as a stable MP4", async () => {
    const repository = openRepository();
    const server = createDndMcpHttpServer({
      playSessionRepository: repository,
    });
    const endpoint = await listen(server);
    const demoUrl = new URL("/plugin-demo.mp4", endpoint);
    try {
      const response = await fetch(demoUrl);
      const video = new Uint8Array(await response.arrayBuffer());
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("video/mp4");
      expect(response.headers.get("content-disposition")).toContain(
        "5.5e-SRD-Oracle-demo.mp4",
      );
      expect(Number(response.headers.get("content-length"))).toBe(
        video.byteLength,
      );
      expect(new TextDecoder().decode(video.slice(4, 8))).toBe("ftyp");

      const head = await fetch(demoUrl, { method: "HEAD" });
      expect(head.status).toBe(200);
      expect(head.headers.get("content-length")).toBe(String(video.byteLength));
      expect((await head.arrayBuffer()).byteLength).toBe(0);

      const rejected = await fetch(demoUrl, { method: "POST" });
      expect(rejected.status).toBe(405);
      expect(rejected.headers.get("allow")).toBe("GET, HEAD");
    } finally {
      await close(server);
      repository.close();
    }
  });

  test("serves publisher pages with public policy and locked-down headers", async () => {
    const repository = openRepository();
    const server = createDndMcpHttpServer({
      playSessionRepository: repository,
      operations: {
        environment: "development",
        release: "development",
        publisherName: publisherName("Verified & Publisher"),
      },
    });
    const endpoint = await listen(server);
    try {
      for (const path of ["/", "/support", "/privacy", "/terms"]) {
        const response = await fetch(new URL(path, endpoint));
        expect(response.status, path).toBe(200);
        expect(response.headers.get("content-type"), path).toContain(
          "text/html",
        );
        expect(response.headers.get("content-security-policy"), path).toBe(
          "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        );
        expect(response.headers.get("x-content-type-options"), path).toBe(
          "nosniff",
        );
        expect(await response.text(), path).toContain(
          "Published by Verified &amp; Publisher.",
        );
      }

      const privacy = await (await fetch(new URL("/privacy", endpoint))).text();
      expect(privacy).toContain("7 inactive days");
      expect(privacy).toContain("never before 24 inactive hours");
      expect(privacy).toContain("90 inactive days");
      expect(privacy).toContain("permanently delete");
      expect(privacy).toContain("one account");
      expect(privacy).toContain(
        "Operational telemetry is bounded and redacted",
      );

      const terms = await (await fetch(new URL("/terms", endpoint))).text();
      expect(terms).toContain("redistributable SRD corpus");
      expect(terms).toContain(
        "does not provide or execute closed-license PHB+ content",
      );

      const head = await fetch(new URL("/support", endpoint), {
        method: "HEAD",
      });
      expect(head.status).toBe(200);
      expect(await head.text()).toBe("");
      const rejected = await fetch(new URL("/privacy", endpoint), {
        method: "POST",
      });
      expect(rejected.status).toBe(405);
      expect(rejected.headers.get("allow")).toBe("GET, HEAD");
    } finally {
      await close(server);
      repository.close();
    }
  });

  test("serves health, release, exact domain challenge, and protected metrics", async () => {
    const repository = openRepository();
    const server = createDndMcpHttpServer({
      playSessionRepository: repository,
      operations: {
        environment: "staging",
        release: "git:0123456789abcdef",
        publisherName: publisherName("Verified Publisher"),
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
        publisher: "Verified Publisher",
        storageFormatVersion: 3,
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

  test("serves saved-session authorization through the public process", async () => {
    const repository = openRepository();
    const authorization: SavedSessionAuthorizationService = {
      handle: (request) =>
        Effect.succeed(
          Response.json(
            { pathname: new URL(request.url).pathname },
            { headers: { "set-cookie": "vault=created; HttpOnly" } },
          ),
        ),
    };
    const server = createDndMcpHttpServer({
      playSessionRepository: repository,
      savedSessionAuthorization: {
        origin: Schema.decodeUnknownSync(AuthorizationServerOriginSchema)(
          "https://oracle.example.test",
        ),
        service: authorization,
      },
    });
    const endpoint = await listen(server);
    try {
      const vault = await fetch(new URL("/saved-session-vault", endpoint));
      expect(vault.status).toBe(200);
      expect(await vault.text()).toContain("Create vault &amp; allow");

      const authorizationResponse = await fetch(
        new URL("/api/auth/oauth2/authorize", endpoint),
      );
      expect(await authorizationResponse.json()).toEqual({
        pathname: "/api/auth/oauth2/authorize",
      });
      expect(authorizationResponse.headers.get("set-cookie")).toContain(
        "vault=created",
      );

      const oversized = await fetch(
        new URL("/api/auth/oauth2/token", endpoint),
        {
          method: "POST",
          body: "x".repeat(PUBLIC_MCP_MAX_REQUEST_BYTES + 1),
        },
      );
      expect(oversized.status).toBe(413);
    } finally {
      await close(server);
      repository.close();
    }
  });

  test("cancels saved-session authorization when the client disconnects", async () => {
    const repository = openRepository();
    const observations = new EventEmitter();
    const requestAborted = once(observations, "requestAborted");
    const responseCancelled = once(observations, "responseCancelled");
    const authorization: SavedSessionAuthorizationService = {
      handle: (request) => {
        request.signal.addEventListener(
          "abort",
          () => observations.emit("requestAborted"),
          { once: true },
        );
        return Effect.succeed(
          new Response(
            new ReadableStream<Uint8Array>({
              start: (controller) =>
                controller.enqueue(new TextEncoder().encode("started")),
              cancel: () => {
                observations.emit("responseCancelled");
              },
            }),
          ),
        );
      },
    };
    const server = createDndMcpHttpServer({
      playSessionRepository: repository,
      savedSessionAuthorization: {
        origin: Schema.decodeUnknownSync(AuthorizationServerOriginSchema)(
          "https://oracle.example.test",
        ),
        service: authorization,
      },
    });
    const endpoint = await listen(server);
    try {
      await disconnectAfterFirstResponseChunk(
        new URL("/api/auth/stalled", endpoint),
      );
      await withTimeout(
        Promise.all([requestAborted, responseCancelled]),
        "authorization cancellation",
      );
    } finally {
      await close(server);
      repository.close();
    }
  });
});

function publisherName(value: string) {
  return Schema.decodeUnknownSync(PublicMcpPublisherNameSchema)(value);
}

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

async function disconnectAfterFirstResponseChunk(url: URL): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = requestHttp(url, (response) => {
      response.once("data", () => {
        request.destroy();
        resolve();
      });
    });
    request.once("error", reject);
    request.end();
  });
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  const timeout = new Promise<never>((_resolve, reject) => {
    setTimeout(
      () => reject(new Error(`Timed out waiting for ${label}`)),
      5_000,
    );
  });
  return Promise.race([promise, timeout]);
}
