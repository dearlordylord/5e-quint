import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import { Result, Effect, Exit, Match } from "effect";

import type { OracleApplication } from "./oracle-distribution.ts";
import { decodeOracleUtf8 } from "./oracle-utf8.ts";
import {
  encodeOracleBatchResponseJson,
  encodeOracleDefectResponseJson,
  encodeOracleHttpReadinessJson,
  encodeOracleIdentityResponseJson,
  decodeOracleListeningPort,
  ORACLE_INVALID_JSON_ISSUES,
  ORACLE_LOOPBACK_HOST,
  oracleDefectResponse,
  oracleDecodeRejectedResponse,
  type OracleBatchResponse,
  type OracleHttpReadiness,
  type OracleLoopbackHost,
  type OracleBindPort,
} from "./oracle-process-contract.ts";

export const ORACLE_HTTP_IDENTITY_PATH = "/oracle/identity" as const;
export const ORACLE_HTTP_EVALUATIONS_PATH = "/oracle/evaluations" as const;
export const ORACLE_HTTP_MAX_REQUEST_BYTES = 1_048_576 as const;
export const ORACLE_HTTP_JSON_CONTENT_TYPE =
  "application/json; charset=utf-8" as const;

type OracleHttpTransportStatus = 404 | 405 | 413 | 415;

type OracleHttpRequestFailure =
  | { readonly tag: "requestTooLarge" }
  | { readonly tag: "requestStreamFailed"; readonly message: string };

export type OracleHttpLifecycleIssue =
  | {
      readonly tag: "invalidHost";
      readonly host: string;
    }
  | {
      readonly tag: "listenFailed";
      readonly message: string;
    }
  | {
      readonly tag: "invalidAddress";
      readonly message: string;
    }
  | {
      readonly tag: "readinessWriteFailed";
      readonly message: string;
    }
  | {
      readonly tag: "closeFailed";
      readonly message: string;
    }
  | {
      readonly tag: "listenerFailed";
      readonly message: string;
    };

type OracleHttpBatchResponseEncoder = (response: OracleBatchResponse) => string;

type OracleHttpRequestHandler = (
  incoming: IncomingMessage,
  outgoing: ServerResponse,
) => void;

type OracleHttpServerFactory = (handler: OracleHttpRequestHandler) => Server;

type OracleHttpServerOptions = {
  readonly application: OracleApplication;
  readonly host: OracleLoopbackHost;
  readonly port: OracleBindPort;
  /** Package-local test seam for pre-write encoder failures. */
  readonly encodeBatchResponse?: OracleHttpBatchResponseEncoder;
  /** Package-local Node seam for deterministic listener-error tests. */
  readonly serverFactory?: OracleHttpServerFactory;
};

export type OracleHttpServiceInternalOptions = OracleHttpServerOptions & {
  readonly writeReady: (text: string) => Promise<void>;
};

/**
 * A server returned only after a successful bind. The underlying server and
 * its pre-listen operations are intentionally not exposed to callers.
 */
export type OracleListeningHttpServer = {
  readonly readiness: OracleHttpReadiness;
  readonly listenerFailure: Promise<
    Result.Result<void, OracleHttpLifecycleIssue>
  >;
  readonly close: () => Promise<Result.Result<void, OracleHttpLifecycleIssue>>;
};

/**
 * Bind one loopback Oracle HTTP server and return its assigned endpoint.
 *
 * The result is the only public lifecycle value: there is no unbound server
 * object on which a caller can invoke close before listen or invoke listen a
 * second time.
 */
export function listenOracleHttpServerInternal(input: {
  readonly application: OracleApplication;
  readonly host: OracleLoopbackHost;
  readonly port: OracleBindPort;
  readonly encodeBatchResponse?: OracleHttpBatchResponseEncoder;
  readonly serverFactory?: OracleHttpServerFactory;
}): Promise<
  Result.Result<OracleListeningHttpServer, OracleHttpLifecycleIssue>
> {
  if (input.host !== ORACLE_LOOPBACK_HOST) {
    return Promise.resolve(
      Result.fail({ tag: "invalidHost", host: input.host }),
    );
  }

  return new Promise((resolve) => {
    let settled = false;
    let server: Server;
    try {
      server = createOracleHttpNodeServer(input);
    } catch (cause) {
      resolve(
        Result.fail({
          tag: "listenFailed",
          message: String(cause),
        }),
      );
      return;
    }
    let listenerFailure: (
      result: Result.Result<void, OracleHttpLifecycleIssue>,
    ) => void = () => undefined;
    const listenerFailurePromise = new Promise<
      Result.Result<void, OracleHttpLifecycleIssue>
    >((resolveFailure) => {
      listenerFailure = resolveFailure;
    });
    let listenerFailureSettled = false;
    const settleListenerFailure = (
      result: Result.Result<void, OracleHttpLifecycleIssue>,
    ): void => {
      if (listenerFailureSettled) return;
      listenerFailureSettled = true;
      listenerFailure(result);
    };
    const onListenError = (cause: Error): void => {
      if (settled) return;
      settled = true;
      server.off("error", onListenError);
      resolve(
        Result.fail({
          tag: "listenFailed",
          message: String(cause),
        }),
      );
    };

    server.once("error", onListenError);
    try {
      server.listen(input.port, input.host, () => {
        if (settled) return;
        const address = server.address();
        if (address === null || typeof address === "string") {
          settled = true;
          server.off("error", onListenError);
          resolveInvalidAddressAfterClose(
            "Oracle HTTP server did not bind a TCP address.",
          );
          return;
        }

        settled = true;
        server.off("error", onListenError);
        server.on("error", (cause: Error) => {
          settleListenerFailure(
            Result.fail({
              tag: "listenerFailed",
              message: String(cause),
            }),
          );
        });
        const decodedPort = decodeOracleListeningPort(address.port);
        if (Result.isFailure(decodedPort)) {
          resolveInvalidAddressAfterClose(
            "Oracle HTTP server returned an invalid TCP port.",
          );
          return;
        }
        resolve(
          Result.succeed(
            makeListeningHttpServer({
              server,
              readiness: {
                host: ORACLE_LOOPBACK_HOST,
                port: decodedPort.success,
              },
              listenerFailure: listenerFailurePromise,
              settleListenerFailure,
            }),
          ),
        );

        function resolveInvalidAddressAfterClose(message: string): void {
          void closeOracleHttpNodeServer(server).then((closed) => {
            if (Result.isFailure(closed)) {
              resolve(Result.fail(closed.failure));
              return;
            }
            resolve(Result.fail({ tag: "invalidAddress", message }));
          });
        }
      });
    } catch (cause) {
      onListenError(toError(cause));
    }
  });
}

/**
 * Run the complete serve lifecycle used by the packaged executable: bind,
 * publish one readiness line, await the first termination signal, and await
 * server close completion.
 */
export async function runOracleHttpServiceInternal(
  input: OracleHttpServiceInternalOptions,
): Promise<Result.Result<void, OracleHttpLifecycleIssue>> {
  const listened = await listenOracleHttpServerInternal(input);
  if (Result.isFailure(listened)) return Result.fail(listened.failure);

  const server = listened.success;
  const termination = waitForTerminationSignal();
  const readiness = Promise.resolve().then(() =>
    input.writeReady(`${encodeOracleHttpReadinessJson(server.readiness)}\n`),
  );
  const startup = await Promise.race([
    readiness.then(
      () => ({ tag: "readinessSucceeded" as const }),
      (cause: unknown) => ({ tag: "readinessFailed" as const, cause }),
    ),
    server.listenerFailure.then((result) => ({
      tag: "listenerFailure" as const,
      result,
    })),
    termination.promise.then((signal) => ({
      tag: "termination" as const,
      signal,
    })),
  ]);
  return Match.value(startup).pipe(
    Match.when({ tag: "readinessSucceeded" }, () =>
      awaitOracleHttpLifecycle(server, termination),
    ),
    Match.when({ tag: "readinessFailed" }, ({ cause }) =>
      closeAfterReadinessFailure(server, termination, cause),
    ),
    Match.when({ tag: "listenerFailure" }, ({ result }) => {
      termination.cancel();
      return handleListenerFailure(server, result);
    }),
    Match.when({ tag: "termination" }, () => {
      termination.cancel();
      return server.close();
    }),
    Match.exhaustive,
  );
}

async function awaitOracleHttpLifecycle(
  server: OracleListeningHttpServer,
  termination: OracleTerminationSignalWait,
): Promise<Result.Result<void, OracleHttpLifecycleIssue>> {
  const lifecycle = await Promise.race([
    server.listenerFailure.then((result) => ({
      tag: "listenerFailure" as const,
      result,
    })),
    termination.promise.then((signal) => ({
      tag: "termination" as const,
      signal,
    })),
  ]);
  termination.cancel();
  return Match.value(lifecycle).pipe(
    Match.when({ tag: "listenerFailure" }, ({ result }) =>
      handleListenerFailure(server, result),
    ),
    Match.when({ tag: "termination" }, () => server.close()),
    Match.exhaustive,
  );
}

async function closeAfterReadinessFailure(
  server: OracleListeningHttpServer,
  termination: OracleTerminationSignalWait,
  cause: unknown,
): Promise<Result.Result<void, OracleHttpLifecycleIssue>> {
  termination.cancel();
  const closed = await server.close();
  if (Result.isFailure(closed)) return closed;
  return Result.fail({
    tag: "readinessWriteFailed",
    message: String(cause),
  });
}

async function handleListenerFailure(
  server: OracleListeningHttpServer,
  result: Result.Result<void, OracleHttpLifecycleIssue>,
): Promise<Result.Result<void, OracleHttpLifecycleIssue>> {
  if (Result.isSuccess(result)) return result;
  const closed = await server.close();
  return Result.isFailure(closed) ? closed : result;
}

function createOracleHttpNodeServer(input: {
  readonly application: OracleApplication;
  readonly encodeBatchResponse?: OracleHttpBatchResponseEncoder;
  readonly serverFactory?: OracleHttpServerFactory;
}): Server {
  const requestHandler: OracleHttpRequestHandler = (incoming, outgoing) => {
    void handleOracleHttpRequest({
      application: input.application,
      ...(input.encodeBatchResponse === undefined
        ? {}
        : { encodeBatchResponse: input.encodeBatchResponse }),
      incoming,
      outgoing,
    }).catch(() => {
      // A socket or stream can fail after a response starts. Closing the
      // response is the only truthful outcome once no contract value remains.
      if (!outgoing.destroyed) outgoing.destroy();
    });
  };
  return (input.serverFactory ?? defaultOracleHttpServerFactory)(
    requestHandler,
  );
}

const defaultOracleHttpServerFactory: OracleHttpServerFactory = (handler) =>
  createServer(handler);

async function handleOracleHttpRequest(input: {
  readonly application: OracleApplication;
  readonly encodeBatchResponse?: OracleHttpBatchResponseEncoder;
  readonly incoming: IncomingMessage;
  readonly outgoing: ServerResponse;
}): Promise<void> {
  const pathname = oracleRequestPath(input.incoming.url);
  if (pathname === ORACLE_HTTP_IDENTITY_PATH) {
    await handleOracleIdentityRequest(input);
    return;
  }

  if (pathname !== ORACLE_HTTP_EVALUATIONS_PATH) {
    input.incoming.resume();
    await writeTransportResponse(input.outgoing, 404);
    return;
  }

  if (input.incoming.method !== "POST") {
    input.incoming.resume();
    await writeTransportResponse(input.outgoing, 405);
    return;
  }

  if (!isSupportedJsonContentType(input.incoming.headers["content-type"])) {
    input.incoming.resume();
    await writeTransportResponse(input.outgoing, 415);
    return;
  }

  await handleOracleEvaluationRequest(input);
}

async function handleOracleIdentityRequest(input: {
  readonly application: OracleApplication;
  readonly incoming: IncomingMessage;
  readonly outgoing: ServerResponse;
}): Promise<void> {
  if (input.incoming.method !== "GET") {
    input.incoming.resume();
    await writeTransportResponse(input.outgoing, 405);
    return;
  }
  input.incoming.resume();
  const response = encodeOracleIdentityHttpResponse(input.application);
  await writeJsonResponse(input.outgoing, response.status, response.body);
}

async function handleOracleEvaluationRequest(input: {
  readonly application: OracleApplication;
  readonly encodeBatchResponse?: OracleHttpBatchResponseEncoder;
  readonly incoming: IncomingMessage;
  readonly outgoing: ServerResponse;
}): Promise<void> {
  const body = await readBoundedRequestBody(input.incoming);
  if (Result.isFailure(body)) {
    await Match.value(body.failure).pipe(
      Match.when({ tag: "requestTooLarge" }, () =>
        writeTransportResponse(input.outgoing, 413),
      ),
      Match.when({ tag: "requestStreamFailed" }, () => {
        if (!input.outgoing.destroyed) input.outgoing.destroy();
        return Promise.resolve();
      }),
      Match.exhaustive,
    );
    return;
  }

  const decoded = decodeOracleUtf8(body.success);
  if (Result.isFailure(decoded)) {
    const response = encodeOracleBatchHttpResponse({
      application: input.application,
      ...(input.encodeBatchResponse === undefined
        ? {}
        : { encodeBatchResponse: input.encodeBatchResponse }),
      response: oracleDecodeRejectedResponse({
        distributionId: input.application.identity.distributionId,
        issues: ORACLE_INVALID_JSON_ISSUES,
      }),
    });
    await writeJsonResponse(input.outgoing, response.status, response.body);
    return;
  }

  const response = await evaluateOracleRequest({
    application: input.application,
    ...(input.encodeBatchResponse === undefined
      ? {}
      : { encodeBatchResponse: input.encodeBatchResponse }),
    rawJson: decoded.success,
  });
  await writeJsonResponse(input.outgoing, response.status, response.body);
}

async function evaluateOracleRequest(input: {
  readonly application: OracleApplication;
  readonly encodeBatchResponse?: OracleHttpBatchResponseEncoder;
  readonly rawJson: string;
}): Promise<{
  readonly status: 200 | 400 | 500;
  readonly body: string;
}> {
  let result: Exit.Exit<OracleBatchResponse, never>;
  try {
    result = await Effect.runPromiseExit(
      input.application.evaluateJson(input.rawJson),
    );
  } catch {
    return defectResponse(input.application);
  }

  if (Exit.isFailure(result)) return defectResponse(input.application);
  return encodeOracleBatchHttpResponse({
    application: input.application,
    ...(input.encodeBatchResponse === undefined
      ? {}
      : { encodeBatchResponse: input.encodeBatchResponse }),
    response: result.value,
  });
}

function encodeOracleIdentityHttpResponse(application: OracleApplication): {
  readonly status: 200 | 500;
  readonly body: string;
} {
  try {
    return {
      status: 200,
      body: encodeOracleIdentityResponseJson(application.identity),
    };
  } catch {
    return defectResponse(application);
  }
}

function encodeOracleBatchHttpResponse(input: {
  readonly application: OracleApplication;
  readonly encodeBatchResponse?: OracleHttpBatchResponseEncoder;
  readonly response: OracleBatchResponse;
}): {
  readonly status: 200 | 400 | 500;
  readonly body: string;
} {
  try {
    const encodeBatchResponse =
      input.encodeBatchResponse ?? encodeOracleBatchResponseJson;
    const body = encodeBatchResponse(input.response);
    return Match.value(input.response.tag).pipe(
      Match.when("evaluated", () => ({
        status: 200 as const,
        body,
      })),
      Match.when("decodeRejected", () => ({
        status: 400 as const,
        body,
      })),
      Match.exhaustive,
    );
  } catch {
    return defectResponse(input.application);
  }
}

function defectResponse(application: OracleApplication): {
  readonly status: 500;
  readonly body: string;
} {
  return {
    status: 500,
    body: encodeOracleDefectResponseJson(
      oracleDefectResponse({
        distributionId: application.identity.distributionId,
      }),
    ),
  };
}

function makeListeningHttpServer(input: {
  readonly server: Server;
  readonly readiness: OracleHttpReadiness;
  readonly listenerFailure: Promise<
    Result.Result<void, OracleHttpLifecycleIssue>
  >;
  readonly settleListenerFailure: (
    result: Result.Result<void, OracleHttpLifecycleIssue>,
  ) => void;
}): OracleListeningHttpServer {
  let closeResult:
    | Promise<Result.Result<void, OracleHttpLifecycleIssue>>
    | undefined;
  return {
    readiness: input.readiness,
    listenerFailure: input.listenerFailure,
    close: () => {
      closeResult ??= closeOracleHttpNodeServer(input.server).then((result) => {
        input.settleListenerFailure(
          Result.isFailure(result) ? result : Result.succeed(undefined),
        );
        return result;
      });
      return closeResult;
    },
  };
}

function closeOracleHttpNodeServer(
  server: Server,
): Promise<Result.Result<void, OracleHttpLifecycleIssue>> {
  return new Promise((resolve) => {
    try {
      server.close((cause) => {
        if (cause === undefined) {
          resolve(Result.succeed(undefined));
        } else {
          resolve(
            Result.fail({
              tag: "closeFailed",
              message: String(cause),
            }),
          );
        }
      });
    } catch (cause) {
      resolve(
        Result.fail({
          tag: "closeFailed",
          message: String(cause),
        }),
      );
    }
  });
}

function oracleRequestPath(url: string | undefined): string {
  try {
    return new URL(url ?? "/", `http://${ORACLE_LOOPBACK_HOST}`).pathname;
  } catch {
    return "/";
  }
}

function isSupportedJsonContentType(
  contentType: string | string[] | undefined,
): boolean {
  if (contentType === undefined || Array.isArray(contentType)) return false;
  const [mediaType, ...parameters] = contentType.split(";");
  if (mediaType?.trim().toLowerCase() !== "application/json") return false;
  return parameters.every(isSupportedJsonContentTypeParameter);
}

function isSupportedJsonContentTypeParameter(parameter: string): boolean {
  const separator = parameter.indexOf("=");
  if (separator < 0) return false;
  const name = parameter.slice(0, separator).trim().toLowerCase();
  const value = parameter
    .slice(separator + 1)
    .trim()
    .replace(/^"|"$/gu, "")
    .toLowerCase();
  return name === "charset" && value === "utf-8";
}

async function readBoundedRequestBody(
  incoming: IncomingMessage,
): Promise<Result.Result<Uint8Array, OracleHttpRequestFailure>> {
  const declaredLength = parseContentLength(incoming.headers["content-length"]);
  if (
    declaredLength !== undefined &&
    declaredLength > ORACLE_HTTP_MAX_REQUEST_BYTES
  ) {
    incoming.resume();
    return Result.fail({ tag: "requestTooLarge" });
  }

  const collected = await collectBoundedRequestBodyChunks(incoming);
  if (Result.isFailure(collected)) return Result.fail(collected.failure);
  if (incoming.aborted || !incoming.complete) {
    return Result.fail({
      tag: "requestStreamFailed",
      message: "Oracle HTTP request stream ended before completion.",
    });
  }
  return Result.succeed(collected.success);
}

async function collectBoundedRequestBodyChunks(
  incoming: IncomingMessage,
): Promise<Result.Result<Buffer, OracleHttpRequestFailure>> {
  const chunks: Buffer[] = [];
  let byteLength = 0;
  try {
    for await (const chunk of incoming) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      byteLength += bytes.byteLength;
      if (byteLength > ORACLE_HTTP_MAX_REQUEST_BYTES) {
        incoming.resume();
        return Result.fail({ tag: "requestTooLarge" });
      }
      chunks.push(bytes);
    }
  } catch (cause) {
    return Result.fail({
      tag: "requestStreamFailed",
      message: String(cause),
    });
  }
  return Result.succeed(Buffer.concat(chunks, byteLength));
}

function parseContentLength(
  value: string | string[] | undefined,
): number | undefined {
  if (value === undefined || Array.isArray(value)) return undefined;
  const trimmed = value.trim();
  if (!/^[0-9]+$/u.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function writeJsonResponse(
  outgoing: ServerResponse,
  status: 200 | 400 | 500,
  body: string,
): Promise<void> {
  return writeResponse(outgoing, status, body, ORACLE_HTTP_JSON_CONTENT_TYPE);
}

function writeTransportResponse(
  outgoing: ServerResponse,
  status: OracleHttpTransportStatus,
): Promise<void> {
  const body = `${status}\n`;
  return writeResponse(outgoing, status, body, "text/plain; charset=utf-8");
}

function writeResponse(
  outgoing: ServerResponse,
  status: number,
  body: string,
  contentType: string,
): Promise<void> {
  if (outgoing.destroyed || outgoing.writableEnded) {
    return Promise.reject(new Error("Oracle HTTP response socket is closed."));
  }
  const contentLength = Buffer.byteLength(body, "utf8");
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = (): void => {
      outgoing.off("error", onError);
      outgoing.off("close", onClose);
    };
    const succeed = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const fail = (cause: unknown): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(toError(cause));
    };
    const onError = (cause: Error): void => fail(cause);
    const onClose = (): void => {
      if (!outgoing.writableEnded)
        fail(new Error("Oracle HTTP response closed."));
    };

    outgoing.once("error", onError);
    outgoing.once("close", onClose);
    try {
      outgoing.writeHead(status, {
        "Content-Type": contentType,
        "Content-Length": contentLength,
      });
      outgoing.end(body, "utf8", succeed);
    } catch (cause) {
      fail(cause);
    }
  });
}

type OracleTerminationSignalWait = {
  readonly promise: Promise<"SIGINT" | "SIGTERM">;
  readonly cancel: () => void;
};

function waitForTerminationSignal(): OracleTerminationSignalWait {
  let settled = false;
  let resolveSignal: ((signal: "SIGINT" | "SIGTERM") => void) | undefined;
  const onSignal = (signal: "SIGINT" | "SIGTERM"): void => {
    if (settled) return;
    settled = true;
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    resolveSignal?.(signal);
  };
  const onSigint = (): void => onSignal("SIGINT");
  const onSigterm = (): void => onSignal("SIGTERM");
  const promise = new Promise<"SIGINT" | "SIGTERM">((resolve) => {
    resolveSignal = resolve;
    process.on("SIGINT", onSigint);
    process.on("SIGTERM", onSigterm);
  });
  return {
    promise,
    cancel: () => {
      if (settled) return;
      settled = true;
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
    },
  };
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}
