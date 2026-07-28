import { once } from "node:events";
import { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { Socket } from "node:net";

import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import {
  adminMirrorPublisherInstanceId,
  adminMirrorSequence,
  adminMirrorSessionId,
  type AdminMirrorProjectionEnvelope,
} from "./admin-mirror-contract.ts";

let baseUrl: URL;
let adminMirrorServer: Awaited<
  typeof import("./admin-mirror-server.ts")
>["adminMirrorServer"];
let adminMirrorServerConfig: Awaited<
  typeof import("./admin-mirror-server.ts")
>["adminMirrorServerConfig"];
let handleAdminMirrorRequest: Awaited<
  typeof import("./admin-mirror-server.ts")
>["handleAdminMirrorRequest"];

beforeAll(async () => {
  vi.stubEnv("DND_ADMIN_MIRROR_PORT", "0");
  vi.stubEnv("DND_ADMIN_MIRROR_HOST", "127.0.0.1");
  ({ adminMirrorServer, adminMirrorServerConfig, handleAdminMirrorRequest } =
    await import("./admin-mirror-server.ts"));
  if (!adminMirrorServer.listening) await once(adminMirrorServer, "listening");
  const address = adminMirrorServer.address() as AddressInfo;
  baseUrl = new URL(`http://${address.address}:${address.port}`);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  if (adminMirrorServer.listening) {
    adminMirrorServer.close();
    await once(adminMirrorServer, "close");
  }
});

describe("Admin Mirror HTTP server", () => {
  test("serves health and CORS preflight endpoints", async () => {
    expect(adminMirrorServerConfig({})).toEqual({
      host: "127.0.0.1",
      port: 8787,
    });
    expect(
      adminMirrorServerConfig({
        DND_ADMIN_MIRROR_HOST: "mirror.internal",
        DND_ADMIN_MIRROR_PORT: "9876",
      }),
    ).toEqual({ host: "mirror.internal", port: 9876 });

    const health = await fetch(new URL("/health", baseUrl));
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toEqual({ ok: true });

    const preflight = await fetch(new URL("/admin-projections", baseUrl), {
      method: "OPTIONS",
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-methods")).toBe(
      "GET,POST,OPTIONS",
    );
  });

  test("rejects malformed projection posts", async () => {
    const invalidJson = await fetch(new URL("/admin-projections", baseUrl), {
      body: "{",
      method: "POST",
    });
    expect(invalidJson.status).toBe(400);
    await expect(invalidJson.json()).resolves.toEqual({
      error: "Expected JSON request body.",
    });

    const invalidEnvelope = await fetch(
      new URL("/admin-projections", baseUrl),
      {
        body: JSON.stringify({}),
        method: "POST",
      },
    );
    expect(invalidEnvelope.status).toBe(400);
    await expect(invalidEnvelope.json()).resolves.toHaveProperty("error");
  });

  test("rejects missing URLs and request-stream failures", async () => {
    const missingUrlRequest = new IncomingMessage(new Socket());
    missingUrlRequest.url = undefined;
    const missingUrlResponse = new ServerResponse(missingUrlRequest);
    handleAdminMirrorRequest(missingUrlRequest, missingUrlResponse);
    expect(missingUrlResponse.statusCode).toBe(400);

    const failedBodyRequest = new IncomingMessage(new Socket());
    failedBodyRequest.method = "POST";
    failedBodyRequest.url = "/admin-projections";
    const failedBodyResponse = new ServerResponse(failedBodyRequest);
    handleAdminMirrorRequest(failedBodyRequest, failedBodyResponse);
    failedBodyRequest.emit("error", new Error("synthetic body failure"));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(failedBodyResponse.statusCode).toBe(400);
  });

  test("publishes and reads retained session projections", async () => {
    const accepted = await fetch(new URL("/admin-projections", baseUrl), {
      body: JSON.stringify(envelope()),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(accepted.status).toBe(202);
    await expect(accepted.json()).resolves.toEqual({ accepted: true });

    const sessions = await fetch(new URL("/admin-projections", baseUrl));
    expect(sessions.status).toBe(200);
    await expect(sessions.json()).resolves.toMatchObject({
      sessions: [
        {
          envelope: { mirrorSessionId: "server-test", sequence: 0 },
          multiSource: false,
        },
      ],
    });

    const retained = await fetch(
      new URL("/admin-projections/server-test", baseUrl),
    );
    expect(retained.status).toBe(200);
    await expect(retained.json()).resolves.toMatchObject({
      envelope: { mirrorSessionId: "server-test" },
    });
  });

  test("reports invalid, unknown, and unmatched session routes", async () => {
    const invalid = await fetch(new URL("/admin-projections/%20", baseUrl));
    expect(invalid.status).toBe(400);

    const unknown = await fetch(new URL("/admin-projections/unknown", baseUrl));
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toEqual({
      error: "Unknown mirror session.",
    });

    const missing = await fetch(new URL("/not-found", baseUrl));
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Not found." });
  });

  test("streams retained global and session-scoped projections", async () => {
    await expectSse("/admin-projections/events", "server-test");
    await expectSse("/admin-projections/server-test/events", "server-test");

    const invalid = await fetch(
      new URL("/admin-projections/%20/events", baseUrl),
    );
    expect(invalid.status).toBe(400);
  });

  test("streams a session first published after subscription", async () => {
    const abortController = new AbortController();
    const responsePromise = fetch(
      new URL("/admin-projections/late-session/events", baseUrl),
      { signal: abortController.signal },
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const accepted = await fetch(new URL("/admin-projections", baseUrl), {
      body: JSON.stringify(
        envelope({ mirrorSessionId: "late-session", sequence: 0 }),
      ),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(accepted.status).toBe(202);

    const response = await responsePromise;
    const chunk = await response.body?.getReader().read();
    expect(new TextDecoder().decode(chunk?.value)).toContain("late-session");
    abortController.abort();
  });
});

async function expectSse(pathname: string, expectedSessionId: string) {
  const abortController = new AbortController();
  const response = await fetch(new URL(pathname, baseUrl), {
    signal: abortController.signal,
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/event-stream");
  const chunk = await response.body?.getReader().read();
  expect(new TextDecoder().decode(chunk?.value)).toContain(expectedSessionId);
  abortController.abort();
}

function envelope(
  input: {
    readonly mirrorSessionId?: string;
    readonly sequence?: number;
  } = {},
): AdminMirrorProjectionEnvelope {
  return {
    mirrorSessionId: adminMirrorSessionId(
      input.mirrorSessionId ?? "server-test",
    ),
    projection: {
      battle: null,
      characters: [],
      session: {
        activeBattle: null,
        draftIds: [],
        selectedStatBlockId: null,
        transientBattleFills: null,
      },
    },
    publisherInstanceId: adminMirrorPublisherInstanceId("server-publisher"),
    sequence: adminMirrorSequence(input.sequence ?? 0),
    sourceProcessId: 1,
  };
}
