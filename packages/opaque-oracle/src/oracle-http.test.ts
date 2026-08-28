import {
  createServer,
  request as requestHttp,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";

import { Either } from "effect";
import { afterAll, describe, expect, test } from "vitest";

import { buildOracleEvaluationCorpus } from "./oracle-corpus.ts";
import { buildOracleDistribution } from "../scripts/build-distribution.ts";
import { evaluateOracleBatch } from "./oracle-evaluation.ts";
import {
  loadOracleApplicationFromDirectory,
  type OracleApplication,
  withOracleBatchEvaluatorForTest,
} from "./oracle-distribution.ts";
import {
  encodeOracleBatchResponseJson,
  decodeOracleBindPort,
  encodeOracleDefectResponseJson,
  encodeOracleIdentityResponseJson,
  ORACLE_LOOPBACK_HOST,
  oracleDefectResponse,
  type OracleBatchResponse,
} from "./oracle-process-contract.ts";
import {
  listenOracleHttpServer,
  ORACLE_HTTP_EVALUATIONS_PATH,
  ORACLE_HTTP_IDENTITY_PATH,
  ORACLE_HTTP_JSON_CONTENT_TYPE,
  ORACLE_HTTP_MAX_REQUEST_BYTES,
} from "./oracle-http.ts";
import {
  listenOracleHttpServerInternal,
  runOracleHttpServiceInternal,
} from "./oracle-http-internal.ts";

const temporaryRoot = mkdtempSync(join(tmpdir(), "opaque-oracle-http-"));
const distribution = buildOracleDistribution({
  destination: join(temporaryRoot, "distribution"),
});
const loaded = loadOracleApplicationFromDirectory({
  directory: distribution.destination,
});
if (Either.isLeft(loaded)) {
  throw new Error(`Oracle HTTP test application failed: ${loaded.left.tag}`);
}
const application = loaded.right;
const portZero = decodeOracleBindPort(0);
const portZeroValue = Either.isLeft(portZero)
  ? (() => {
      throw new Error("Oracle port zero must decode.");
    })()
  : portZero.right;

const corpusResult = buildOracleEvaluationCorpus(application.services);
if (Either.isLeft(corpusResult)) {
  throw new Error("Oracle HTTP test corpus failed to build.");
}
const corpus = corpusResult.right;

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

type HttpResult = {
  readonly statusCode: number;
  readonly contentType: string | undefined;
  readonly body: Buffer;
};

type HttpServerFactory = (
  handler: (incoming: IncomingMessage, outgoing: ServerResponse) => void,
) => Server;

async function openServer(
  applicationToServe: OracleApplication = application,
  options: {
    readonly encodeBatchResponse?: (response: OracleBatchResponse) => string;
    readonly serverFactory?: HttpServerFactory;
  } = {},
) {
  const result =
    options.encodeBatchResponse === undefined &&
    options.serverFactory === undefined
      ? await listenOracleHttpServer({
          application: applicationToServe,
          host: ORACLE_LOOPBACK_HOST,
          port: portZeroValue,
        })
      : await listenOracleHttpServerInternal({
          application: applicationToServe,
          host: ORACLE_LOOPBACK_HOST,
          port: portZeroValue,
          ...options,
        });
  if (Either.isLeft(result)) {
    throw new Error(`Oracle HTTP test server failed: ${result.left.tag}`);
  }
  return result.right;
}

async function closeServer(
  server: Awaited<ReturnType<typeof openServer>>,
): Promise<void> {
  const result = await server.close();
  if (Either.isLeft(result)) {
    throw new Error(`Oracle HTTP test server close failed: ${result.left.tag}`);
  }
}

async function request(
  server: Awaited<ReturnType<typeof openServer>>,
  input: {
    readonly method: string;
    readonly path: string;
    readonly body?: Uint8Array | string;
    readonly contentType?: string;
  },
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const request = requestHttp({
      host: server.readiness.host,
      port: server.readiness.port,
      method: input.method,
      path: input.path,
      ...(input.contentType === undefined
        ? {}
        : { headers: { "content-type": input.contentType } }),
    });
    request.once("error", reject);
    request.once("response", (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.once("error", reject);
      response.once("end", () => {
        resolve({
          statusCode: response.statusCode ?? 0,
          contentType: response.headers["content-type"],
          body: Buffer.concat(chunks),
        });
      });
    });
    if (input.body === undefined) request.end();
    else request.end(input.body);
  });
}

describe("Opaque Oracle loopback HTTP adapter", () => {
  test("discovers port zero only after listen and closes idempotently", async () => {
    const server = await openServer();
    expect(server.readiness.host).toBe(ORACLE_LOOPBACK_HOST);
    expect(server.readiness.port).toBeGreaterThan(0);

    const response = await request(server, {
      method: "GET",
      path: ORACLE_HTTP_IDENTITY_PATH,
    });
    expect(response.statusCode).toBe(200);
    expect(response.contentType).toBe(ORACLE_HTTP_JSON_CONTENT_TYPE);
    expect(response.body.toString("utf8")).toBe(
      encodeOracleIdentityResponseJson(application.identity),
    );

    const [firstClose, secondClose] = await Promise.all([
      server.close(),
      server.close(),
    ]);
    expect(Either.isRight(firstClose)).toBe(true);
    expect(Either.isRight(secondClose)).toBe(true);
  });

  test("captures termination during readiness publication and closes cleanly", async () => {
    let nodeServer: Server | undefined;
    let readinessStarted!: () => void;
    const readinessStartedPromise = new Promise<void>((resolve) => {
      readinessStarted = resolve;
    });
    let releaseReadiness!: () => void;
    const readinessReleasePromise = new Promise<void>((resolve) => {
      releaseReadiness = resolve;
    });
    const sigintListeners = process.listenerCount("SIGINT");
    const sigtermListeners = process.listenerCount("SIGTERM");
    const service = runOracleHttpServiceInternal({
      application,
      host: ORACLE_LOOPBACK_HOST,
      port: portZeroValue,
      serverFactory: (handler) => {
        const server = createServer(handler);
        nodeServer = server;
        return server;
      },
      writeReady: async () => {
        readinessStarted();
        await readinessReleasePromise;
      },
    });

    await readinessStartedPromise;
    expect(process.listenerCount("SIGINT")).toBe(sigintListeners + 1);
    expect(process.listenerCount("SIGTERM")).toBe(sigtermListeners + 1);
    process.emit("SIGTERM");
    releaseReadiness();

    const result = await service;
    expect(Either.isRight(result)).toBe(true);
    expect(nodeServer?.listening).toBe(false);
    expect(process.listenerCount("SIGINT")).toBe(sigintListeners);
    expect(process.listenerCount("SIGTERM")).toBe(sigtermListeners);
  });

  test("closes promptly when readiness never settles after termination", async () => {
    let nodeServer: Server | undefined;
    let readinessStarted!: () => void;
    const readinessStartedPromise = new Promise<void>((resolve) => {
      readinessStarted = resolve;
    });
    let rejectReadiness!: (cause: Error) => void;
    const readinessPromise = new Promise<void>((_, reject) => {
      rejectReadiness = reject;
    });
    const sigintListeners = process.listenerCount("SIGINT");
    const sigtermListeners = process.listenerCount("SIGTERM");
    const service = runOracleHttpServiceInternal({
      application,
      host: ORACLE_LOOPBACK_HOST,
      port: portZeroValue,
      serverFactory: (handler) => {
        const server = createServer(handler);
        nodeServer = server;
        return server;
      },
      writeReady: async () => {
        readinessStarted();
        await readinessPromise;
      },
    });

    await readinessStartedPromise;
    expect(process.listenerCount("SIGINT")).toBe(sigintListeners + 1);
    expect(process.listenerCount("SIGTERM")).toBe(sigtermListeners + 1);
    process.emit("SIGINT");

    const result = await service;
    expect(Either.isRight(result)).toBe(true);
    expect(nodeServer?.listening).toBe(false);
    expect(process.listenerCount("SIGINT")).toBe(sigintListeners);
    expect(process.listenerCount("SIGTERM")).toBe(sigtermListeners);

    rejectReadiness(new Error("abandoned readiness rejection"));
    await Promise.resolve();
  });

  test("keeps transport failures outside the Oracle response algebra", async () => {
    const server = await openServer();
    try {
      const [unknownRoute, wrongMethod, missingMedia, wrongMedia, malformed] =
        await Promise.all([
          request(server, { method: "GET", path: "/unknown" }),
          request(server, {
            method: "GET",
            path: ORACLE_HTTP_EVALUATIONS_PATH,
          }),
          request(server, {
            method: "POST",
            path: ORACLE_HTTP_EVALUATIONS_PATH,
            body: "{}",
          }),
          request(server, {
            method: "POST",
            path: ORACLE_HTTP_EVALUATIONS_PATH,
            body: "{}",
            contentType: "text/plain",
          }),
          request(server, {
            method: "POST",
            path: ORACLE_HTTP_EVALUATIONS_PATH,
            body: "not-json",
            contentType: ORACLE_HTTP_JSON_CONTENT_TYPE,
          }),
        ]);

      expect(unknownRoute.statusCode).toBe(404);
      expect(wrongMethod.statusCode).toBe(405);
      expect(missingMedia.statusCode).toBe(415);
      expect(wrongMedia.statusCode).toBe(415);
      expect(malformed.statusCode).toBe(400);
      expect(malformed.contentType).toBe(ORACLE_HTTP_JSON_CONTENT_TYPE);
      expect(JSON.parse(malformed.body.toString("utf8"))).toMatchObject({
        tag: "decodeRejected",
        issues: [{ code: "invalidJson" }],
      });
    } finally {
      await closeServer(server);
    }
  });

  test("decodes invalid UTF-8 and bounds request bytes before evaluation", async () => {
    let evaluations = 0;
    const evaluatedApplication = withOracleBatchEvaluatorForTest(
      application,
      ({ batch, services }) => {
        evaluations += 1;
        return evaluateOracleBatch({ batch, services });
      },
    );
    const server = await openServer(evaluatedApplication);
    try {
      const invalidUtf8 = await request(server, {
        method: "POST",
        path: ORACLE_HTTP_EVALUATIONS_PATH,
        body: new Uint8Array([0xc3, 0x28]),
        contentType: ORACLE_HTTP_JSON_CONTENT_TYPE,
      });
      expect(invalidUtf8.statusCode).toBe(400);

      const oversized = await request(server, {
        method: "POST",
        path: ORACLE_HTTP_EVALUATIONS_PATH,
        body: Buffer.alloc(ORACLE_HTTP_MAX_REQUEST_BYTES + 1, 0x20),
        contentType: ORACLE_HTTP_JSON_CONTENT_TYPE,
      });
      expect(oversized.statusCode).toBe(413);
      expect(evaluations).toBe(0);
    } finally {
      await closeServer(server);
    }
  });

  test("returns one atomic defect response and keeps the listener usable", async () => {
    let calls = 0;
    const defectiveApplication = withOracleBatchEvaluatorForTest(
      application,
      ({ batch, services }) => {
        calls += 1;
        if (calls === 1) throw new Error("injected HTTP evaluator defect");
        return evaluateOracleBatch({ batch, services });
      },
    );
    const server = await openServer(defectiveApplication);
    try {
      const body = JSON.stringify(corpus.batch);
      const defective = await request(server, {
        method: "POST",
        path: ORACLE_HTTP_EVALUATIONS_PATH,
        body,
        contentType: ORACLE_HTTP_JSON_CONTENT_TYPE,
      });
      expect(defective.statusCode).toBe(500);
      expect(defective.contentType).toBe(ORACLE_HTTP_JSON_CONTENT_TYPE);
      expect(defective.body.toString("utf8")).toBe(
        encodeOracleDefectResponseJson(
          oracleDefectResponse({
            distributionId: application.identity.distributionId,
          }),
        ),
      );

      const healthyResponse = await request(server, {
        method: "POST",
        path: ORACLE_HTTP_EVALUATIONS_PATH,
        body,
        contentType: ORACLE_HTTP_JSON_CONTENT_TYPE,
      });
      expect(healthyResponse.statusCode).toBe(200);
      expect(JSON.parse(healthyResponse.body.toString("utf8")).tag).toBe(
        "evaluated",
      );
      expect(calls).toBe(2);
    } finally {
      await closeServer(server);
    }
  });

  test("maps a pre-write batch encoder defect to one atomic response", async () => {
    let encoderCalls = 0;
    const server = await openServer(application, {
      encodeBatchResponse: (response) => {
        encoderCalls += 1;
        if (encoderCalls === 1) throw new Error("injected encoder defect");
        return encodeOracleBatchResponseJson(response);
      },
    });
    try {
      const defective = await request(server, {
        method: "POST",
        path: ORACLE_HTTP_EVALUATIONS_PATH,
        body: "not-json",
        contentType: ORACLE_HTTP_JSON_CONTENT_TYPE,
      });
      expect(defective.statusCode).toBe(500);
      expect(defective.body.toString("utf8")).toBe(
        encodeOracleDefectResponseJson(
          oracleDefectResponse({
            distributionId: application.identity.distributionId,
          }),
        ),
      );

      const healthy = await request(server, {
        method: "POST",
        path: ORACLE_HTTP_EVALUATIONS_PATH,
        body: "not-json",
        contentType: ORACLE_HTTP_JSON_CONTENT_TYPE,
      });
      expect(healthy.statusCode).toBe(400);
      expect(encoderCalls).toBe(2);
    } finally {
      await closeServer(server);
    }
  });

  test("returns a post-readiness listener failure and removes signal listeners", async () => {
    let nodeServer: Server | undefined;
    let signalReady: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => {
      signalReady = resolve;
    });
    const signalListenerCount = process.listenerCount("SIGTERM");
    const service = runOracleHttpServiceInternal({
      application,
      host: ORACLE_LOOPBACK_HOST,
      port: portZeroValue,
      serverFactory: (handler) => {
        nodeServer = createServer(handler);
        return nodeServer;
      },
      writeReady: async () => {
        signalReady?.();
      },
    });

    await ready;
    if (nodeServer === undefined)
      throw new Error("HTTP server was not created");
    nodeServer.emit("error", new Error("injected listener failure"));
    const result = await service;
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) expect(result.left.tag).toBe("listenerFailed");
    expect(process.listenerCount("SIGTERM")).toBe(signalListenerCount);
  });

  test("closes a server whose listening address is invalid before returning", async () => {
    let nodeServer: Server | undefined;
    let closeObserved = false;
    const result = await listenOracleHttpServerInternal({
      application,
      host: ORACLE_LOOPBACK_HOST,
      port: portZeroValue,
      serverFactory: (handler) => {
        const server = createServer(handler);
        nodeServer = server;
        server.once("close", () => {
          closeObserved = true;
        });
        Object.defineProperty(server, "address", { value: () => null });
        return server;
      },
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) expect(result.left.tag).toBe("invalidAddress");
    expect(closeObserved).toBe(true);
    expect(nodeServer?.listening).toBe(false);
  });

  test("reports a typed bind failure when the requested port is occupied", async () => {
    const occupied = createServer();
    const occupiedPort = await new Promise<number>((resolve, reject) => {
      occupied.once("error", reject);
      occupied.listen(0, ORACLE_LOOPBACK_HOST, () => {
        const address = occupied.address();
        if (address === null || typeof address === "string") {
          reject(new Error("occupied test server did not bind"));
          return;
        }
        resolve(address.port);
      });
    });
    const decodedPort = decodeOracleBindPort(occupiedPort);
    if (Either.isLeft(decodedPort))
      throw new Error("occupied port did not decode");

    try {
      const result = await listenOracleHttpServer({
        application,
        host: ORACLE_LOOPBACK_HOST,
        port: decodedPort.right,
      });
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) expect(result.left.tag).toBe("listenFailed");
    } finally {
      await new Promise<void>((resolve, reject) => {
        occupied.close((error) =>
          error === undefined ? resolve() : reject(error),
        );
      });
    }
  });
});
