import type { IncomingMessage, ServerResponse } from "node:http";

import { Result, Effect } from "effect";

import { PUBLIC_MCP_MAX_REQUEST_BYTES } from "../public-http-routes.ts";
import type { AuthorizationServerOrigin } from "../public-origin.ts";
import { savedSessionConsentPage, savedSessionVaultPage } from "./pages.ts";
import type { SavedSessionAuthorizationService } from "./service.ts";

export type SavedSessionAuthorizationHttp = {
  readonly origin: AuthorizationServerOrigin;
  readonly service: SavedSessionAuthorizationService;
};

export type SavedSessionAuthorizationHttpIssue = {
  readonly tag: "savedSessionAuthorizationHttpIssue";
  readonly reason: "requestFailed" | "requestTooLarge";
};

export function isSavedSessionAuthorizationPath(pathname: string): boolean {
  return (
    pathname === "/saved-session-vault" ||
    pathname === "/saved-session-consent" ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/.well-known/oauth-authorization-server/api/auth"
  );
}

export async function handleSavedSessionAuthorizationRequest(input: {
  readonly authorization: SavedSessionAuthorizationHttp;
  readonly incoming: IncomingMessage;
  readonly outgoing: ServerResponse;
  readonly pathname: string;
}): Promise<Result.Result<void, SavedSessionAuthorizationHttpIssue>> {
  const cancellation = nodeRequestCancellation(input.incoming, input.outgoing);
  try {
    if (input.pathname === "/saved-session-vault") {
      await writeResponse(
        input.outgoing,
        savedSessionVaultPage(),
        cancellation.signal,
      );
      return Result.succeed(undefined);
    }
    if (input.pathname === "/saved-session-consent") {
      await writeResponse(
        input.outgoing,
        savedSessionConsentPage(),
        cancellation.signal,
      );
      return Result.succeed(undefined);
    }
    const request = await webRequest(
      input.incoming,
      input.authorization.origin,
      cancellation.signal,
    );
    if (Result.isFailure(request)) return Result.fail(request.failure);
    const response = await Effect.runPromise(
      input.authorization.service.handle(request.success).pipe(Effect.result),
    );
    if (Result.isFailure(response)) {
      return Result.fail(httpIssue("requestFailed"));
    }
    await writeResponse(input.outgoing, response.success, cancellation.signal);
    return Result.succeed(undefined);
  } finally {
    cancellation.dispose();
  }
}

async function webRequest(
  incoming: IncomingMessage,
  origin: URL,
  signal: AbortSignal,
): Promise<Result.Result<Request, SavedSessionAuthorizationHttpIssue>> {
  const body = await requestBody(incoming);
  if (Result.isFailure(body)) return Result.fail(body.failure);
  return Result.succeed(
    new Request(new URL(incoming.url ?? "/", origin), {
      method: incoming.method ?? "GET",
      headers: webRequestHeaders(incoming),
      signal,
      ...webRequestBody(body.success),
    }),
  );
}

function webRequestHeaders(incoming: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
}

function webRequestBody(body: Uint8Array): { readonly body?: Uint8Array } {
  return body.byteLength === 0 ? {} : { body };
}

async function requestBody(
  incoming: IncomingMessage,
): Promise<Result.Result<Uint8Array, SavedSessionAuthorizationHttpIssue>> {
  if (incoming.method === "GET" || incoming.method === "HEAD") {
    return Result.succeed(new Uint8Array());
  }
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of incoming) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > PUBLIC_MCP_MAX_REQUEST_BYTES) {
      return Result.fail(httpIssue("requestTooLarge"));
    }
    chunks.push(buffer);
  }
  return Result.succeed(Buffer.concat(chunks));
}

async function writeResponse(
  outgoing: ServerResponse,
  response: Response,
  signal: AbortSignal,
): Promise<void> {
  outgoing.statusCode = response.status;
  for (const cookie of response.headers.getSetCookie()) {
    outgoing.appendHeader("set-cookie", cookie);
  }
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") outgoing.setHeader(name, value);
  });
  if (response.body === null) {
    outgoing.end();
    return;
  }
  const reader = response.body.getReader();
  const cancelReader = () => reader.cancel().catch(() => undefined);
  signal.addEventListener("abort", cancelReader, { once: true });
  try {
    while (!outgoing.destroyed) {
      const next = await reader.read();
      if (next.done) break;
      if (!outgoing.write(Buffer.from(next.value))) {
        await waitForDrainOrClose(outgoing);
      }
    }
  } finally {
    signal.removeEventListener("abort", cancelReader);
    if (signal.aborted) await cancelReader();
    reader.releaseLock();
  }
  outgoing.end();
}

function nodeRequestCancellation(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
): {
  readonly signal: AbortSignal;
  readonly dispose: () => void;
} {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const abortUnfinishedResponse = () => {
    if (!outgoing.writableFinished) abort();
  };
  incoming.once("aborted", abort);
  outgoing.once("close", abortUnfinishedResponse);
  return {
    signal: controller.signal,
    dispose: () => {
      incoming.off("aborted", abort);
      outgoing.off("close", abortUnfinishedResponse);
    },
  };
}

async function waitForDrainOrClose(outgoing: ServerResponse): Promise<void> {
  await new Promise<void>((resolve) => {
    const finished = () => {
      outgoing.off("drain", finished);
      outgoing.off("close", finished);
      resolve();
    };
    outgoing.once("drain", finished);
    outgoing.once("close", finished);
  });
}

function httpIssue(
  reason: SavedSessionAuthorizationHttpIssue["reason"],
): SavedSessionAuthorizationHttpIssue {
  return { tag: "savedSessionAuthorizationHttpIssue", reason };
}
