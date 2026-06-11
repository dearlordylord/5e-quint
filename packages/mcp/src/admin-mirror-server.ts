import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { URL } from "node:url";

import { Effect, Fiber, Schema, Stream } from "effect";

import {
  AdminMirrorPresentationTimelineEntrySchema,
  AdminMirrorProjectionEnvelopeSchema,
  AdminMirrorSessionIdSchema,
  type AdminMirrorSessionId,
  type AdminMirrorSessionState,
} from "./admin-mirror-contract.ts";
import {
  createAdminMirrorStore,
  decodeAdminMirrorProjectionEnvelope,
} from "./admin-mirror-store.ts";

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = "127.0.0.1";
const serverPort = Number(process.env.DND_ADMIN_MIRROR_PORT ?? DEFAULT_PORT);
const serverHost = process.env.DND_ADMIN_MIRROR_HOST ?? DEFAULT_HOST;
const store = createAdminMirrorStore();

const server = createServer((request, response) => {
  const url = requestUrl(request);
  if (url === null) {
    writeJson(response, 400, { error: "Invalid request URL." });
    return;
  }

  if (request.method === "OPTIONS") {
    writeCors(response, 204);
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    writeJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/admin-projections") {
    void handleProjectionPost(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/admin-projections") {
    writeJson(response, 200, { sessions: store.latest().map(sessionOutput) });
    return;
  }

  if (
    request.method === "GET" &&
    url.pathname === "/admin-projections/events"
  ) {
    handleProjectionEvents(request, response, null);
    return;
  }

  const sessionMatch = /^\/admin-projections\/([^/]+)$/.exec(url.pathname);
  if (request.method === "GET" && sessionMatch?.[1] !== undefined) {
    const sessionId = Schema.decodeUnknownEither(AdminMirrorSessionIdSchema)(
      decodeURIComponent(sessionMatch[1]),
    );
    if (sessionId._tag === "Left") {
      writeJson(response, 400, { error: sessionId.left.message });
      return;
    }
    const latest = store.latestFor(sessionId.right);
    if (latest === null) {
      writeJson(response, 404, { error: "Unknown mirror session." });
      return;
    }
    writeJson(response, 200, sessionOutput(latest));
    return;
  }

  const streamMatch = /^\/admin-projections\/([^/]+)\/events$/.exec(
    url.pathname,
  );
  if (request.method === "GET" && streamMatch?.[1] !== undefined) {
    const sessionId = Schema.decodeUnknownEither(AdminMirrorSessionIdSchema)(
      decodeURIComponent(streamMatch[1]),
    );
    if (sessionId._tag === "Left") {
      writeJson(response, 400, { error: sessionId.left.message });
      return;
    }
    handleProjectionEvents(request, response, sessionId.right);
    return;
  }

  writeJson(response, 404, { error: "Not found." });
});

server.listen(serverPort, serverHost, () => {
  console.error(
    `Admin Session Mirror listening on http://${serverHost}:${serverPort}`,
  );
});

async function handleProjectionPost(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const body = await readRequestBody(request).catch(() => null);
  if (body === null) {
    writeJson(response, 400, { error: "Could not read request body." });
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    writeJson(response, 400, { error: "Expected JSON request body." });
    return;
  }

  const envelope = decodeAdminMirrorProjectionEnvelope(parsed);
  if (envelope._tag === "Left") {
    writeJson(response, 400, { error: envelope.left });
    return;
  }

  const accepted = store.publish(envelope.right);
  writeJson(response, 202, { accepted });
}

function handleProjectionEvents(
  request: IncomingMessage,
  response: ServerResponse,
  mirrorSessionId: AdminMirrorSessionId | null,
): void {
  response.writeHead(200, {
    "access-control-allow-origin": "*",
    "cache-control": "no-cache",
    connection: "keep-alive",
    "content-type": "text/event-stream",
  });

  if (mirrorSessionId === null) {
    for (const latest of store.latest())
      writeSse(response, sessionOutput(latest));
  } else {
    const latest = store.latestFor(mirrorSessionId);
    if (latest !== null) writeSse(response, sessionOutput(latest));
  }

  const fiber = Effect.runFork(
    store.updates.pipe(
      Stream.filter(
        (session) =>
          mirrorSessionId === null ||
          session.envelope.mirrorSessionId === mirrorSessionId,
      ),
      Stream.runForEach((session) =>
        Effect.sync(() => writeSse(response, sessionOutput(session))),
      ),
    ),
  );

  request.on("close", () => {
    Effect.runFork(Fiber.interruptFork(fiber));
  });
}

function sessionOutput(session: AdminMirrorSessionState) {
  return {
    envelope: Schema.encodeSync(AdminMirrorProjectionEnvelopeSchema)(
      session.envelope,
    ),
    multiSource: session.multiSource,
    presentationTimeline: Schema.encodeSync(
      Schema.Array(AdminMirrorPresentationTimelineEntrySchema),
    )(session.presentationTimeline),
    receivedAtEpochMs: session.receivedAtEpochMs,
  };
}

function requestUrl(request: IncomingMessage): URL | null {
  if (request.url === undefined) return null;
  return new URL(request.url, "http://localhost");
}

function writeCors(response: ServerResponse, status: number): void {
  response.writeHead(status, {
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-origin": "*",
  });
}

function writeJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
): void {
  response.writeHead(status, {
    "access-control-allow-origin": "*",
    "content-type": "application/json",
  });
  response.end(JSON.stringify(payload));
}

function writeSse(response: ServerResponse, payload: unknown): void {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}
