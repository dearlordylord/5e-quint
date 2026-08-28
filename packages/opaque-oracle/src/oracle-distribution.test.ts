import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawn, spawnSync, type ChildProcessByStdio } from "node:child_process";
import type { IncomingHttpHeaders } from "node:http";
import { request as requestHttp } from "node:http";
import {
  createInterface,
  type Interface as ReadlineInterface,
} from "node:readline";
import type { Readable, Writable } from "node:stream";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { Either, Match, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { buildOracleDistribution } from "../scripts/build-distribution.ts";
import { checkOracleDistribution } from "../scripts/check-distribution.ts";
import { decodeOracleEvaluationBatchJson } from "./oracle-case-trace.ts";
import { decodeOracleCorpusJson } from "./oracle-corpus.ts";
import type { OracleTrace } from "./oracle-case-trace-schema.ts";
import { evaluateOracleBatch } from "./oracle-evaluation.ts";
import { ORACLE_HTTP_MAX_REQUEST_BYTES } from "./oracle-http.ts";
import {
  computeOracleDistributionId,
  loadOracleApplicationFromDirectory,
  ORACLE_DISTRIBUTION_FILE_NAMES,
} from "./oracle-distribution.ts";
import {
  ORACLE_PUBLICATION_FILE_NAMES,
  ORACLE_PUBLICATION_MEMBERS,
} from "./oracle-publication.ts";
import {
  OracleBatchResponseSchema,
  OracleDefectResponseSchema,
  OracleHttpReadinessSchema,
  OracleIdentityResponseSchema,
  type OracleBatchResponse,
  type OracleDecodeIssues,
  type OracleHttpReadiness,
} from "./oracle-process-contract.ts";

const packageRoot = resolve(import.meta.dirname, "..");
const corpusPath = resolve(packageRoot, "corpus/oracle-evaluation-corpus.json");
const decodedCorpus = decodeOracleCorpusJson(readFileSync(corpusPath, "utf8"));
if (Either.isLeft(decodedCorpus)) {
  throw new Error(
    `The committed Oracle corpus failed canonical decoding: ${JSON.stringify(decodedCorpus.left)}`,
  );
}
const corpus = decodedCorpus.right;

const distributionAssetNames = [
  ORACLE_DISTRIBUTION_FILE_NAMES.executable,
  ORACLE_DISTRIBUTION_FILE_NAMES.identity,
  ORACLE_DISTRIBUTION_FILE_NAMES.projection,
  ...ORACLE_PUBLICATION_MEMBERS.map(
    (member) => ORACLE_PUBLICATION_FILE_NAMES[member],
  ),
];

type ProcessResult = ReturnType<typeof spawnSync>;

type OracleHttpResponse = {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly body: Buffer;
};

type OracleServeProcess = {
  readonly child: ChildProcessByStdio<null, Readable, Readable>;
  readonly readiness: OracleHttpReadiness;
  readonly lines: ReadlineInterface;
  readonly stdout: () => string;
  readonly stderr: () => string;
};

type OracleStreamProcess = {
  readonly child: ChildProcessByStdio<Writable, Readable, Readable>;
  readonly stderr: () => string;
  readonly rawLines: string[];
  readonly pendingWaiters: OracleStreamFrameWaiter[];
  readonly activeWaiters: Set<OracleStreamFrameWaiter>;
  readonly queuedLines: string[];
  readonly frameBytes: number[];
  protocolFailure: Error | undefined;
  fail: (cause: unknown) => void;
  dispose: () => void;
};

type OracleStreamFrameObservation = {
  readonly response: OracleBatchResponse;
  readonly rawLine: string;
};

type OracleStreamFrameWaiter = {
  readonly accept: (rawLine: string) => void;
  readonly fail: (cause: Error) => void;
};

const ORACLE_STREAM_FRAME_TIMEOUT_MS = 10_000;

function writeNetworkDenialPreload(directory: string): string {
  const path = join(directory, "deny-network.cjs");
  writeFileSync(
    path,
    [
      '"use strict";',
      'const deny = () => { throw new Error("network denied by test"); };',
      'const net = require("node:net");',
      "net.connect = deny;",
      "net.createConnection = deny;",
      'const tls = require("node:tls");',
      "tls.connect = deny;",
      'const dns = require("node:dns");',
      'const loopbackHost = "127.0.0.1";',
      "const localLookup = dns.lookup;",
      "dns.lookup = function guardedLookup(hostname, options, callback) {",
      "  if (hostname !== loopbackHost) return deny();",
      '  if (typeof options === "function") return localLookup.call(this, hostname, options);',
      "  return localLookup.call(this, hostname, options, callback);",
      "};",
      "if (dns.promises) {",
      "  const localPromisesLookup = dns.promises.lookup;",
      "  dns.promises.lookup = async function guardedPromisesLookup(hostname, options) {",
      '    if (hostname !== loopbackHost) throw new Error("network denied by test");',
      "    return options === undefined",
      "      ? localPromisesLookup.call(this, hostname)",
      "      : localPromisesLookup.call(this, hostname, options);",
      "  };",
      "}",
      "for (const name of [",
      '  "lookupService",',
      '  "resolve",',
      '  "resolve4",',
      '  "resolve6",',
      '  "resolveAny",',
      '  "resolveCaa",',
      '  "resolveCname",',
      '  "resolveMx",',
      '  "resolveNaptr",',
      '  "resolveNs",',
      '  "resolvePtr",',
      '  "resolveSoa",',
      '  "resolveSrv",',
      '  "resolveTxt",',
      '  "reverse",',
      "]) {",
      '  if (typeof dns[name] === "function") dns[name] = deny;',
      "}",
      "if (dns.promises) {",
      "  for (const name of [",
      '    "resolve",',
      '    "resolve4",',
      '    "resolve6",',
      '    "resolveAny",',
      '    "resolveCaa",',
      '    "resolveCname",',
      '    "resolveMx",',
      '    "resolveNaptr",',
      '    "resolveNs",',
      '    "resolvePtr",',
      '    "resolveSoa",',
      '    "resolveSrv",',
      '    "resolveTxt",',
      '    "reverse",',
      "  ]) {",
      '    if (typeof dns.promises[name] === "function") dns.promises[name] = deny;',
      "  }",
      "}",
      "",
    ].join("\n"),
  );
  return path;
}

function processEnvironment(preload: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_PATH: "",
    NODE_OPTIONS: `--require=${preload}`,
  };
}

function runExecutable(
  executable: string,
  args: readonly string[],
  cwd: string,
  preload: string,
  input?: Uint8Array,
): ProcessResult {
  return spawnSync(executable, [...args], {
    cwd,
    env: processEnvironment(preload),
    input,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function launchOracleStream(
  executable: string,
  cwd: string,
  preload: string,
  args: readonly string[] = ["stream"],
): OracleStreamProcess {
  const child: ChildProcessByStdio<Writable, Readable, Readable> = spawn(
    executable,
    [...args],
    {
      cwd,
      env: processEnvironment(preload),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  child.stderr.setEncoding("utf8");
  const stderrChunks: string[] = [];
  const onStderrData = (chunk: string | Buffer): void => {
    stderrChunks.push(typeof chunk === "string" ? chunk : chunk.toString());
  };
  child.stderr.on("data", onStderrData);
  const streamProcess: OracleStreamProcess = {
    child,
    stderr: () => stderrChunks.join(""),
    rawLines: [],
    pendingWaiters: [],
    activeWaiters: new Set(),
    queuedLines: [],
    frameBytes: [],
    protocolFailure: undefined,
    fail: () => undefined,
    dispose: () => undefined,
  };

  const failProcess = (cause: unknown): void => {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    streamProcess.protocolFailure ??= error;
    const waiters = new Set([
      ...streamProcess.pendingWaiters,
      ...streamProcess.activeWaiters,
    ]);
    streamProcess.pendingWaiters.length = 0;
    streamProcess.activeWaiters.clear();
    for (const waiter of waiters) waiter.fail(streamProcess.protocolFailure);
  };
  streamProcess.fail = failProcess;

  const onStdoutData = (chunk: Buffer | string): void => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const combined = Buffer.concat([
      Buffer.from(streamProcess.frameBytes),
      bytes,
    ]);
    let lineStart = 0;
    for (let index = 0; index < combined.length; index += 1) {
      if (combined[index] !== 0x0a) continue;
      const rawLine = combined.subarray(lineStart, index).toString("utf8");
      streamProcess.rawLines.push(rawLine);
      streamProcess.queuedLines.push(rawLine);
      lineStart = index + 1;
    }
    streamProcess.frameBytes.length = 0;
    for (const byte of combined.subarray(lineStart)) {
      streamProcess.frameBytes.push(byte);
    }
    drainOracleStreamLines(streamProcess);
  };
  const onChildError = (cause: Error): void => failProcess(cause);
  const onChildExit = (
    code: number | null,
    signal: NodeJS.Signals | null,
  ): void => {
    if (
      streamProcess.pendingWaiters.length > 0 ||
      streamProcess.activeWaiters.size > 0
    ) {
      failProcess(
        new Error(
          `Oracle stream exited before all responses (${String(code)}, ${String(signal)}).`,
        ),
      );
    }
  };
  const onStdinError = (cause: Error): void => failProcess(cause);
  child.stdout.on("data", onStdoutData);
  child.once("error", onChildError);
  child.once("exit", onChildExit);
  child.stdin.once("error", onStdinError);
  streamProcess.dispose = (): void => {
    child.stdout.removeListener("data", onStdoutData);
    child.stderr.removeListener("data", onStderrData);
    child.removeListener("error", onChildError);
    child.removeListener("exit", onChildExit);
    child.stdin.removeListener("error", onStdinError);
  };
  return streamProcess;
}

function evaluateOracleStreamFrame(
  process: OracleStreamProcess,
  body: Uint8Array,
  options: { readonly timeoutMs?: number } = {},
): Promise<OracleStreamFrameObservation> {
  return new Promise<OracleStreamFrameObservation>((resolve, reject) => {
    if (process.protocolFailure !== undefined) {
      reject(process.protocolFailure);
      return;
    }
    let settled = false;
    let response: OracleBatchResponse | undefined;
    let rawLine: string | undefined;
    let writesRemaining = 2;
    const timeoutMs = options.timeoutMs ?? ORACLE_STREAM_FRAME_TIMEOUT_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const waiter: OracleStreamFrameWaiter = {
      accept: (line) => {
        try {
          response = decodeJson(OracleBatchResponseSchema, line);
          rawLine = line;
          settleIfReady();
        } catch (cause) {
          fail(
            cause instanceof Error
              ? cause
              : new Error(`Invalid Oracle stream response: ${String(cause)}`),
          );
        }
      },
      fail: (cause) => fail(cause),
    };
    const cleanup = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      process.activeWaiters.delete(waiter);
      const index = process.pendingWaiters.indexOf(waiter);
      if (index >= 0) process.pendingWaiters.splice(index, 1);
    };
    const finish = (operation: () => void): void => {
      if (settled) return;
      settled = true;
      cleanup();
      operation();
    };
    const fail = (cause: Error): void => {
      finish(() => {
        process.protocolFailure ??= cause;
        reject(cause);
      });
    };
    const settleIfReady = (): void => {
      if (response === undefined || rawLine === undefined) return;
      if (writesRemaining !== 0) return;
      const decodedResponse = response;
      const decodedRawLine = rawLine;
      finish(() =>
        resolve({ response: decodedResponse, rawLine: decodedRawLine }),
      );
    };
    const writeFinished = (cause?: Error | null): void => {
      if (cause !== undefined && cause !== null) {
        fail(cause);
        return;
      }
      writesRemaining -= 1;
      settleIfReady();
    };
    timer = setTimeout(() => {
      fail(
        new Error(
          `Oracle stream frame timed out after ${timeoutMs}ms without one response.`,
        ),
      );
    }, timeoutMs);
    process.activeWaiters.add(waiter);
    process.pendingWaiters.push(waiter);
    try {
      process.child.stdin.write(Buffer.from(body), writeFinished);
      process.child.stdin.write("\n", writeFinished);
    } catch (cause) {
      fail(
        cause instanceof Error
          ? cause
          : new Error(`Oracle stream write failed: ${String(cause)}`),
      );
    }
    drainOracleStreamLines(process);
  });
}

function drainOracleStreamLines(process: OracleStreamProcess): void {
  if (process.protocolFailure !== undefined) return;
  if (process.queuedLines.length > process.pendingWaiters.length) {
    process.fail(
      new Error(
        `Oracle stream emitted ${process.queuedLines.length} response lines for ${process.pendingWaiters.length} pending frame(s).`,
      ),
    );
    return;
  }
  while (process.queuedLines.length > 0 && process.pendingWaiters.length > 0) {
    const rawLine = process.queuedLines.shift();
    const waiter = process.pendingWaiters.shift();
    if (rawLine === undefined || waiter === undefined) {
      process.fail(new Error("Oracle stream response queue lost a line."));
      return;
    }
    waiter.accept(rawLine);
  }
}

async function waitForOracleStreamExit(
  process: OracleStreamProcess,
): Promise<void> {
  const { child } = process;
  let onExit:
    | ((code: number | null, signal: NodeJS.Signals | null) => void)
    | undefined;
  const exit =
    child.exitCode !== null || child.signalCode !== null
      ? Promise.resolve({ code: child.exitCode, signal: child.signalCode })
      : new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
          (resolve) => {
            onExit = (code, signal) => resolve({ code, signal });
            child.once("exit", onExit);
          },
        );
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    child.stdin.end();
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error("Oracle stream did not close.")),
        10_000,
      );
    });
    const result = await Promise.race([exit, timeoutPromise]);
    expect(result.code).toBe(0);
    expect(result.signal).toBeNull();
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    if (onExit !== undefined) child.removeListener("exit", onExit);
  }
  if (process.protocolFailure !== undefined) {
    throw process.protocolFailure;
  }
  if (process.frameBytes.length > 0) {
    throw new Error("Oracle stream ended with an incomplete response line.");
  }
  expect(process.pendingWaiters).toHaveLength(0);
  expect(process.activeWaiters.size).toBe(0);
  expect(process.queuedLines).toHaveLength(0);
}

async function terminateOracleStream(
  process: OracleStreamProcess,
): Promise<void> {
  let onExit: (() => void) | undefined;
  const exit =
    process.child.exitCode !== null || process.child.signalCode !== null
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          onExit = () => resolve();
          process.child.once("exit", onExit);
        });
  try {
    if (process.child.exitCode === null && process.child.signalCode === null) {
      process.child.kill("SIGKILL");
    }
    await exit;
  } finally {
    if (onExit !== undefined) process.child.removeListener("exit", onExit);
    process.dispose();
  }
}

function onlyOracleResponse(
  responses: readonly OracleBatchResponse[],
  description: string,
): OracleBatchResponse {
  let onlyResponse: OracleBatchResponse | undefined;
  for (const response of responses) {
    if (onlyResponse !== undefined) {
      throw new Error(`Expected one ${description} response.`);
    }
    onlyResponse = response;
  }
  if (onlyResponse === undefined) {
    throw new Error(`Expected one ${description} response.`);
  }
  return onlyResponse;
}

function parseResponseLines(
  result: ProcessResult,
): readonly OracleBatchResponse[] {
  const output = result.stdout.toString("utf8");
  expect(output.endsWith("\n")).toBe(true);
  const frames = output.slice(0, -1).split("\n");
  return frames.map((frame) => decodeJson(OracleBatchResponseSchema, frame));
}

function decodeJson<T extends Schema.Schema.AnyNoContext>(
  schema: T,
  text: string,
): Schema.Schema.Type<T> {
  const value: unknown = JSON.parse(text);
  const decoded = Schema.decodeUnknownEither(schema)(value);
  if (Either.isLeft(decoded)) {
    throw new Error(`Unexpected JSON contract value: ${String(decoded.left)}`);
  }
  return decoded.right;
}

function assertSuccessfulProcess(result: ProcessResult): void {
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
}

async function launchOracleServe(
  executable: string,
  cwd: string,
  preload: string,
  port = "0",
): Promise<OracleServeProcess> {
  const child: ChildProcessByStdio<null, Readable, Readable> = spawn(
    executable,
    ["serve", "--host", "127.0.0.1", "--port", port],
    {
      cwd,
      env: processEnvironment(preload),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  child.stdout.on("data", (chunk: string | Buffer) => {
    stdoutChunks.push(typeof chunk === "string" ? chunk : chunk.toString());
  });
  child.stderr.on("data", (chunk: string | Buffer) => {
    stderrChunks.push(typeof chunk === "string" ? chunk : chunk.toString());
  });
  const lines = createInterface({ input: child.stdout });
  let readiness: OracleHttpReadiness;
  try {
    readiness = await new Promise<OracleHttpReadiness>((resolve, reject) => {
      let settled = false;
      let timeout: ReturnType<typeof setTimeout>;
      const finish = (operation: () => void): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        operation();
      };
      function fail(cause: Error): void {
        finish(() => {
          lines.close();
          if (child.exitCode === null && child.signalCode === null) {
            child.kill("SIGTERM");
          }
          reject(cause);
        });
      }
      timeout = setTimeout(() => {
        fail(new Error("Oracle serve readiness timed out."));
      }, 10_000);
      lines.once("line", (line) => {
        try {
          const decoded = decodeJson(OracleHttpReadinessSchema, line);
          finish(() => resolve(decoded));
        } catch (cause) {
          fail(
            cause instanceof Error
              ? cause
              : new Error(`Invalid Oracle readiness: ${String(cause)}`),
          );
        }
      });
      child.once("error", (cause) => {
        fail(cause instanceof Error ? cause : new Error(String(cause)));
      });
      child.once("exit", (code, signal) => {
        fail(
          new Error(
            `Oracle serve exited before readiness (${String(code)}, ${String(signal)}).`,
          ),
        );
      });
    });
  } catch (cause) {
    lines.close();
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
    throw cause;
  }
  return {
    child,
    readiness,
    lines,
    stdout: () => stdoutChunks.join(""),
    stderr: () => stderrChunks.join(""),
  };
}

function requestOracle(
  port: number,
  input: {
    readonly method: string;
    readonly path: string;
    readonly body?: Uint8Array;
    readonly contentType?: string;
    readonly declaredContentLength?: number;
  },
): Promise<OracleHttpResponse> {
  const body = input.body ?? new Uint8Array();
  const headers: Record<string, string | number> = {
    "content-length": input.declaredContentLength ?? body.byteLength,
  };
  if (input.contentType !== undefined) {
    headers["content-type"] = input.contentType;
  }
  return new Promise((resolve, reject) => {
    const request = requestHttp(
      {
        host: "127.0.0.1",
        port,
        path: input.path,
        method: input.method,
        headers,
        agent: false,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.once("aborted", () => {
          reject(new Error("Oracle HTTP response was aborted."));
        });
        response.once("error", reject);
        response.once("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    request.once("error", reject);
    request.setTimeout(10_000, () => {
      request.destroy(new Error("Oracle HTTP request timed out."));
    });
    request.end(Buffer.from(body));
  });
}

async function waitForOracleExit(
  process: OracleServeProcess,
  signal: NodeJS.Signals,
): Promise<void> {
  const { child } = process;
  const exit =
    child.exitCode !== null || child.signalCode !== null
      ? Promise.resolve({ code: child.exitCode, signal: child.signalCode })
      : new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
          (resolve) => {
            child.once("exit", (code, childSignal) =>
              resolve({ code, signal: childSignal }),
            );
          },
        );
  if (child.exitCode === null && child.signalCode === null) {
    expect(child.kill(signal)).toBe(true);
  }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error("Oracle serve did not close.")),
        10_000,
      );
    });
    const result = await Promise.race([exit, timeoutPromise]);
    expect(result.code).toBe(0);
    expect(result.signal).toBeNull();
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
  process.lines.close();
  expect(process.stdout()).toBe(`${JSON.stringify(process.readiness)}\n`);
}

function assertEvaluated(
  response: OracleBatchResponse,
): readonly OracleTrace[] {
  if (response.tag !== "evaluated") {
    throw new Error(`Expected evaluated response, got ${response.tag}.`);
  }
  return response.traces;
}

describe("Opaque Oracle source-free distribution", () => {
  test("is deterministic, verifies identity, runs offline from another directory, and preserves stream laws", async () => {
    const temporaryRoot = mkdtempSync(
      join(tmpdir(), "opaque-oracle-distribution-"),
    );
    try {
      const firstDirectory = join(temporaryRoot, "first");
      const secondDirectory = join(temporaryRoot, "second");
      const firstBuild = buildOracleDistribution({
        destination: firstDirectory,
      });
      const secondBuild = buildOracleDistribution({
        destination: secondDirectory,
      });

      expect(firstBuild.distributionId).toBe(secondBuild.distributionId);
      expect(
        firstBuild.bundledInputs.some((input) =>
          input.includes("packages/surface/content/"),
        ),
      ).toBe(false);
      expect(
        firstBuild.bundledInputs.some((input) =>
          input.endsWith("/unit-catalog-data.ts"),
        ),
      ).toBe(false);
      expect(
        firstBuild.bundledInputs.some((input) =>
          input.endsWith("/stat-block-catalog-data.ts"),
        ),
      ).toBe(false);
      const executableText = readFileSync(
        join(firstDirectory, ORACLE_DISTRIBUTION_FILE_NAMES.executable),
        "utf8",
      );
      expect(executableText).not.toContain("packages/surface/content/");
      for (const assetName of distributionAssetNames) {
        expect(readFileSync(join(firstDirectory, assetName))).toEqual(
          readFileSync(join(secondDirectory, assetName)),
        );
      }

      const identity = decodeJson(
        OracleIdentityResponseSchema,
        readFileSync(
          join(firstDirectory, ORACLE_DISTRIBUTION_FILE_NAMES.identity),
          "utf8",
        ),
      );
      expect(Object.keys(identity)).toEqual(["distributionId"]);
      expect(identity.distributionId).toBe(firstBuild.distributionId);
      expect(
        computeOracleDistributionId({
          executable: readFileSync(
            join(firstDirectory, ORACLE_DISTRIBUTION_FILE_NAMES.executable),
          ),
          projection: readFileSync(
            join(firstDirectory, ORACLE_DISTRIBUTION_FILE_NAMES.projection),
          ),
          schemas: {
            case: readFileSync(
              join(firstDirectory, ORACLE_PUBLICATION_FILE_NAMES.case),
            ),
            trace: readFileSync(
              join(firstDirectory, ORACLE_PUBLICATION_FILE_NAMES.trace),
            ),
            evaluationBatch: readFileSync(
              join(
                firstDirectory,
                ORACLE_PUBLICATION_FILE_NAMES.evaluationBatch,
              ),
            ),
          },
        }),
      ).toBe(firstBuild.distributionId);

      const loaded = loadOracleApplicationFromDirectory({
        directory: firstDirectory,
      });
      expect(Either.isRight(loaded)).toBe(true);
      if (Either.isRight(loaded)) {
        expect(Object.isFrozen(loaded.right)).toBe(true);
        expect(Object.hasOwn(loaded.right, "distributionId")).toBe(false);
        expect(Object.isFrozen(loaded.right.identity)).toBe(true);
        expect(Object.isFrozen(loaded.right.projection)).toBe(true);
        expect(Object.isFrozen(loaded.right.services)).toBe(true);
      }

      const stagedDirectory = join(temporaryRoot, "staged", "oracle");
      cpSync(firstDirectory, stagedDirectory, {
        recursive: true,
        dereference: true,
      });
      expect(Either.isRight(checkOracleDistribution(stagedDirectory))).toBe(
        true,
      );
      const cleanWorkingDirectory = mkdtempSync(
        join(temporaryRoot, "clean-cwd-"),
      );
      const preload = writeNetworkDenialPreload(temporaryRoot);
      const executable = join(
        stagedDirectory,
        ORACLE_DISTRIBUTION_FILE_NAMES.executable,
      );

      const callbackDnsProbe = spawnSync(
        process.execPath,
        ["-e", "require('node:dns').lookup('example.com', () => {})"],
        {
          cwd: cleanWorkingDirectory,
          env: processEnvironment(preload),
          maxBuffer: 32 * 1024 * 1024,
        },
      );
      expect(callbackDnsProbe.status).not.toBe(0);
      expect(callbackDnsProbe.stderr.toString("utf8")).toContain(
        "network denied by test",
      );
      const promiseDnsProbe = spawnSync(
        process.execPath,
        [
          "-e",
          "require('node:dns').promises.lookup('example.com').then(() => { process.exitCode = 2; }, () => { process.exitCode = 1; })",
        ],
        {
          cwd: cleanWorkingDirectory,
          env: processEnvironment(preload),
          maxBuffer: 32 * 1024 * 1024,
        },
      );
      expect(promiseDnsProbe.status).toBe(1);

      const identityProcess = runExecutable(
        executable,
        ["identity"],
        cleanWorkingDirectory,
        preload,
      );
      assertSuccessfulProcess(identityProcess);
      expect(identityProcess.stdout.toString("utf8")).toBe(
        `${JSON.stringify(identity)}\n`,
      );
      expect(identityProcess.stderr.toString("utf8")).toBe("");

      const firstCase = corpus.batch.cases[0];
      const secondCase = corpus.batch.cases[1];
      const thirdCase = corpus.batch.cases[2];
      if (
        firstCase === undefined ||
        secondCase === undefined ||
        thirdCase === undefined
      ) {
        throw new Error("The Oracle corpus must contain three Cases.");
      }
      const firstSingleton = JSON.stringify({ cases: [firstCase] });
      const secondSingleton = JSON.stringify({ cases: [secondCase] });
      const thirdSingleton = JSON.stringify({ cases: [thirdCase] });
      const selectedBatch = JSON.stringify({
        cases: [firstCase, secondCase, thirdCase],
      });
      const malformedFrames = {
        invalidJson: Buffer.from("not-json", "utf8"),
        blank: Buffer.alloc(0),
        duplicateMember: Buffer.from('{"cases":[],"cases":[]}', "utf8"),
        emptyBatch: Buffer.from('{"cases":[]}', "utf8"),
        structurallyInvalidCase: Buffer.from(
          '{"cases":[{}],"extra":true}',
          "utf8",
        ),
        invalidUtf8: Buffer.from([0xc3, 0x28]),
      } as const;
      const decomposition = runExecutable(
        executable,
        ["stream"],
        cleanWorkingDirectory,
        preload,
        Buffer.from(
          `${selectedBatch}\n${firstSingleton}\n${secondSingleton}\n${thirdSingleton}\n`,
        ),
      );
      assertSuccessfulProcess(decomposition);
      const decompositionResponses = parseResponseLines(decomposition);
      expect(decompositionResponses).toHaveLength(4);
      const firstDecompositionResponse = decompositionResponses[0];
      if (firstDecompositionResponse === undefined) {
        throw new Error("The Oracle stream returned no batch response.");
      }
      const batchTraces = assertEvaluated(firstDecompositionResponse);
      const stagedApplication = loadOracleApplicationFromDirectory({
        directory: stagedDirectory,
      });
      expect(Either.isRight(stagedApplication)).toBe(true);
      if (Either.isLeft(stagedApplication)) return;
      const decodedSelectedBatch =
        decodeOracleEvaluationBatchJson(selectedBatch);
      expect(Either.isRight(decodedSelectedBatch)).toBe(true);
      if (Either.isLeft(decodedSelectedBatch)) return;
      expect(batchTraces).toEqual(
        evaluateOracleBatch({
          batch: decodedSelectedBatch.right,
          services: stagedApplication.right.services,
        }),
      );
      const singletonTraces = decompositionResponses
        .slice(1)
        .flatMap((response) => assertEvaluated(response));
      expect(batchTraces).toEqual(singletonTraces);

      const isolation = runExecutable(
        executable,
        ["stream"],
        cleanWorkingDirectory,
        preload,
        Buffer.from(
          `${firstSingleton}\n${secondSingleton}\n${firstSingleton}\n`,
        ),
      );
      assertSuccessfulProcess(isolation);
      const isolationResponses = parseResponseLines(isolation);
      expect(isolationResponses).toHaveLength(3);
      expect(isolationResponses[0]).toEqual(isolationResponses[2]);
      expect(isolationResponses[0]?.distributionId).toBe(
        identity.distributionId,
      );

      const namedMalformedFrames = {
        ...malformedFrames,
        finalValidCase: Buffer.from(firstSingleton),
      } as const;
      type NamedMalformedFrame = keyof typeof namedMalformedFrames;
      const malformedFrameNames = Object.keys(
        namedMalformedFrames,
      ) as NamedMalformedFrame[];
      const malformedProcess = launchOracleStream(
        executable,
        cleanWorkingDirectory,
        preload,
      );
      const malformedObservations = new Map<
        NamedMalformedFrame,
        OracleStreamFrameObservation
      >();
      const observationForMalformedFrame = (
        name: NamedMalformedFrame,
      ): OracleStreamFrameObservation => {
        const observation = malformedObservations.get(name);
        if (observation === undefined) {
          throw new Error(`Response missing for ${name}.`);
        }
        return observation;
      };
      try {
        for (const name of malformedFrameNames) {
          const observation = await evaluateOracleStreamFrame(
            malformedProcess,
            namedMalformedFrames[name],
          );
          malformedObservations.set(name, observation);
        }
        await waitForOracleStreamExit(malformedProcess);
        expect(malformedProcess.stderr()).toBe("");
        expect(malformedProcess.rawLines).toHaveLength(
          malformedFrameNames.length,
        );
        expect(malformedProcess.rawLines).toEqual(
          malformedFrameNames.map(
            (name) => observationForMalformedFrame(name).rawLine,
          ),
        );
      } finally {
        await terminateOracleStream(malformedProcess);
      }
      const responseForMalformedFrame = (
        name: NamedMalformedFrame,
      ): OracleBatchResponse => observationForMalformedFrame(name).response;
      for (const name of malformedFrameNames) {
        const response = responseForMalformedFrame(name);
        expect(response.distributionId).toBe(identity.distributionId);
        if (name === "finalValidCase") {
          expect(assertEvaluated(response)).toHaveLength(1);
        } else if (response.tag !== "decodeRejected") {
          throw new Error(`Malformed frame ${name} was not rejected.`);
        }
      }

      const duplicateMemberResponse =
        responseForMalformedFrame("duplicateMember");
      if (duplicateMemberResponse.tag !== "decodeRejected") {
        throw new Error("The named duplicate-key frame was not rejected.");
      }
      expect(duplicateMemberResponse.issues.length).toBeGreaterThan(0);
      const invalidUtf8Response = responseForMalformedFrame("invalidUtf8");
      if (invalidUtf8Response.tag !== "decodeRejected") {
        throw new Error("The named invalid UTF-8 frame was not rejected.");
      }
      expect(invalidUtf8Response.issues).toEqual([
        { path: "", code: "invalidJson" },
      ]);

      const workflowRejection = runExecutable(
        executable,
        ["stream"],
        cleanWorkingDirectory,
        preload,
        Buffer.from(`${JSON.stringify({ cases: [corpus.batch.cases[10]] })}\n`),
      );
      assertSuccessfulProcess(workflowRejection);
      const workflowResponse = parseResponseLines(workflowRejection)[0];
      if (workflowResponse === undefined) {
        throw new Error("The workflow response was missing.");
      }
      const rejectedTrace = assertEvaluated(workflowResponse)[0];
      if (rejectedTrace === undefined) {
        throw new Error("The workflow response contained no trace.");
      }
      expect(rejectedTrace.creation.outcome.tag).toBe("fillRejected");

      const invalidMode = runExecutable(
        executable,
        [],
        cleanWorkingDirectory,
        preload,
      );
      expect(invalidMode.status).toBe(2);
      expect(invalidMode.stdout.toString("utf8")).toBe("");
      expect(invalidMode.stderr.toString("utf8")).toContain(
        "Usage: oracle identity | oracle stream",
      );

      const tamperedDirectory = join(temporaryRoot, "tampered");
      cpSync(stagedDirectory, tamperedDirectory, {
        recursive: true,
        dereference: true,
      });
      const tamperedProjection = readFileSync(
        join(tamperedDirectory, ORACLE_DISTRIBUTION_FILE_NAMES.projection),
      );
      tamperedProjection[0] = tamperedProjection[0]! ^ 1;
      writeFileSync(
        join(tamperedDirectory, ORACLE_DISTRIBUTION_FILE_NAMES.projection),
        tamperedProjection,
      );
      expect(Either.isLeft(checkOracleDistribution(tamperedDirectory))).toBe(
        true,
      );
      const tamperedIdentity = runExecutable(
        join(tamperedDirectory, ORACLE_DISTRIBUTION_FILE_NAMES.executable),
        ["identity"],
        cleanWorkingDirectory,
        preload,
      );
      expect(tamperedIdentity.status).not.toBe(0);
      expect(tamperedIdentity.stdout.toString("utf8")).toBe("");
      expect(tamperedIdentity.stderr.toString("utf8")).toContain(
        "distribution rejected",
      );
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }, 300_000);

  test("serves the packaged application over loopback with atomic request defects", async () => {
    const temporaryRoot = mkdtempSync(
      join(tmpdir(), "opaque-oracle-http-distribution-"),
    );
    let running: OracleServeProcess | undefined;
    try {
      const build = buildOracleDistribution({
        destination: join(temporaryRoot, "distribution"),
      });
      const cleanWorkingDirectory = mkdtempSync(
        join(temporaryRoot, "clean-cwd-"),
      );
      const preload = writeNetworkDenialPreload(temporaryRoot);
      const executable = build.executablePath;
      const identity = decodeJson(
        OracleIdentityResponseSchema,
        readFileSync(
          join(build.destination, ORACLE_DISTRIBUTION_FILE_NAMES.identity),
          "utf8",
        ),
      );
      const loaded = loadOracleApplicationFromDirectory({
        directory: build.destination,
      });
      expect(Either.isRight(loaded)).toBe(true);
      if (Either.isLeft(loaded)) return;

      const firstCase = corpus.batch.cases[0];
      const secondCase = corpus.batch.cases[1];
      const thirdCase = corpus.batch.cases[2];
      const workflowCase = corpus.batch.cases[10];
      if (
        firstCase === undefined ||
        secondCase === undefined ||
        thirdCase === undefined ||
        workflowCase === undefined
      ) {
        throw new Error("The Oracle corpus is missing HTTP contract cases.");
      }
      const firstSingleton = JSON.stringify({ cases: [firstCase] });
      const secondSingleton = JSON.stringify({ cases: [secondCase] });
      const selectedBatch = JSON.stringify({
        cases: [firstCase, secondCase, thirdCase],
      });
      const jsonContentType = "application/json; charset=utf-8";
      const assertJsonContract = (response: OracleHttpResponse): void => {
        expect(response.headers["content-type"]).toBe(jsonContentType);
      };

      const runningProcess = await launchOracleServe(
        executable,
        cleanWorkingDirectory,
        preload,
      );
      running = runningProcess;
      const post = (
        body: Uint8Array,
        contentType = jsonContentType,
      ): Promise<OracleHttpResponse> =>
        requestOracle(runningProcess.readiness.port, {
          method: "POST",
          path: "/oracle/evaluations",
          body,
          contentType,
        });
      expect(runningProcess.readiness.host).toBe("127.0.0.1");
      expect(Number.isInteger(runningProcess.readiness.port)).toBe(true);
      expect(runningProcess.readiness.port).toBeGreaterThan(0);
      expect(runningProcess.stderr()).toBe("");

      const identityResponse = await requestOracle(
        runningProcess.readiness.port,
        {
          method: "GET",
          path: "/oracle/identity",
        },
      );
      expect(identityResponse.status).toBe(200);
      assertJsonContract(identityResponse);
      expect(identityResponse.body.toString("utf8")).toBe(
        JSON.stringify(identity),
      );

      const decodedBatch = decodeOracleEvaluationBatchJson(selectedBatch);
      expect(Either.isRight(decodedBatch)).toBe(true);
      if (Either.isLeft(decodedBatch)) return;
      const expectedBatchResponse = {
        tag: "evaluated",
        distributionId: identity.distributionId,
        traces: evaluateOracleBatch({
          batch: decodedBatch.right,
          services: loaded.right.services,
        }),
      };
      const batchResponse = await post(Buffer.from(selectedBatch));
      expect(batchResponse.status).toBe(200);
      assertJsonContract(batchResponse);
      expect(batchResponse.body.toString("utf8")).toBe(
        JSON.stringify(expectedBatchResponse),
      );

      const firstResponse = await post(Buffer.from(firstSingleton));
      const secondResponse = await post(Buffer.from(secondSingleton));
      const firstAgainResponse = await post(Buffer.from(firstSingleton));
      for (const response of [
        firstResponse,
        secondResponse,
        firstAgainResponse,
      ]) {
        expect(response.status).toBe(200);
        assertJsonContract(response);
      }
      expect(firstResponse.body).toEqual(firstAgainResponse.body);
      expect(firstResponse.body).not.toEqual(secondResponse.body);

      const workflowResponse = await post(
        Buffer.from(JSON.stringify({ cases: [workflowCase] })),
      );
      expect(workflowResponse.status).toBe(200);
      assertJsonContract(workflowResponse);
      const workflowJson = decodeJson(
        OracleBatchResponseSchema,
        workflowResponse.body.toString("utf8"),
      );
      expect(workflowJson.tag).toBe("evaluated");
      if (workflowJson.tag !== "evaluated") {
        throw new Error("The workflow batch response was not evaluated.");
      }
      const workflowTrace = workflowJson.traces[0];
      if (workflowTrace === undefined) {
        throw new Error("The workflow response contained no trace.");
      }
      expect(workflowTrace.creation.outcome.tag).toBe("fillRejected");

      const malformedResponses = {
        emptyInput: await post(Buffer.alloc(0)),
        invalidJson: await post(Buffer.from("not-json")),
        duplicateMember: await post(Buffer.from('{"cases":[],"cases":[]}')),
        structurallyInvalidCase: await post(Buffer.from('{"cases":[{}]}')),
        invalidUtf8: await post(Buffer.from([0xc3, 0x28])),
      } as const;
      for (const response of Object.values(malformedResponses)) {
        expect(response.status).toBe(400);
        assertJsonContract(response);
        const value = decodeJson(
          OracleBatchResponseSchema,
          response.body.toString("utf8"),
        );
        expect(value.tag).toBe("decodeRejected");
        if (value.tag !== "decodeRejected") {
          throw new Error("The malformed batch response was evaluated.");
        }
        expect(value.distributionId).toBe(identity.distributionId);
      }
      const invalidUtf8Response = malformedResponses.invalidUtf8;
      expect(invalidUtf8Response.body.toString("utf8")).toBe(
        `{"tag":"decodeRejected","distributionId":"${identity.distributionId}","issues":[{"path":"","code":"invalidJson"}]}`,
      );

      const unknownRoute = await requestOracle(runningProcess.readiness.port, {
        method: "GET",
        path: "/oracle/unknown",
      });
      expect(unknownRoute.status).toBe(404);
      const wrongMethod = await requestOracle(runningProcess.readiness.port, {
        method: "POST",
        path: "/oracle/identity",
      });
      expect(wrongMethod.status).toBe(405);
      const unsupportedMedia = await post(
        Buffer.from(firstSingleton),
        "text/plain; charset=utf-8",
      );
      expect(unsupportedMedia.status).toBe(415);
      const oversized = await requestOracle(runningProcess.readiness.port, {
        method: "POST",
        path: "/oracle/evaluations",
        body: Buffer.alloc(0),
        contentType: jsonContentType,
        declaredContentLength: ORACLE_HTTP_MAX_REQUEST_BYTES + 1,
      });
      expect(oversized.status).toBe(413);

      await waitForOracleExit(runningProcess, "SIGINT");
      running = undefined;

      const secondRunningProcess = await launchOracleServe(
        executable,
        cleanWorkingDirectory,
        preload,
      );
      running = secondRunningProcess;
      expect(secondRunningProcess.readiness.port).toBeGreaterThan(0);
      await waitForOracleExit(secondRunningProcess, "SIGTERM");
      running = undefined;

      const defectBuild = buildOracleDistribution({
        destination: join(temporaryRoot, "defect-distribution"),
        entryPoint: resolve(packageRoot, "scripts/oracle-defect-test-entry.ts"),
      });
      const defectProcess = await launchOracleServe(
        defectBuild.executablePath,
        cleanWorkingDirectory,
        preload,
      );
      running = defectProcess;
      const defectResponse = await requestOracle(defectProcess.readiness.port, {
        method: "POST",
        path: "/oracle/evaluations",
        body: Buffer.from(JSON.stringify({ cases: [firstCase, secondCase] })),
        contentType: jsonContentType,
      });
      expect(defectResponse.status).toBe(500);
      assertJsonContract(defectResponse);
      expect(defectResponse.body.toString("utf8")).toBe(
        JSON.stringify({
          tag: "defect",
          distributionId: defectBuild.distributionId,
        }),
      );
      const afterDefect = await requestOracle(defectProcess.readiness.port, {
        method: "POST",
        path: "/oracle/evaluations",
        body: Buffer.from(firstSingleton),
        contentType: jsonContentType,
      });
      expect(afterDefect.status).toBe(200);
      assertJsonContract(afterDefect);
      expect(afterDefect.body.toString("utf8")).toContain(
        `"distributionId":"${defectBuild.distributionId}"`,
      );
      await waitForOracleExit(defectProcess, "SIGTERM");
      running = undefined;
    } finally {
      if (running !== undefined) {
        if (
          running.child.exitCode === null &&
          running.child.signalCode === null
        ) {
          running.child.kill("SIGKILL");
        }
        running.lines.close();
      }
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }, 300_000);

  test("proves packaged stream and HTTP parity for one persistent scenario table", async () => {
    const temporaryRoot = mkdtempSync(
      join(tmpdir(), "opaque-oracle-parity-distribution-"),
    );
    let running: OracleServeProcess | undefined;
    try {
      const ordinaryBuild = buildOracleDistribution({
        destination: join(temporaryRoot, "ordinary-distribution"),
      });
      const cleanWorkingDirectory = mkdtempSync(
        join(temporaryRoot, "clean-cwd-"),
      );
      const preload = writeNetworkDenialPreload(temporaryRoot);
      const ordinaryIdentity = decodeJson(
        OracleIdentityResponseSchema,
        readFileSync(
          join(
            ordinaryBuild.destination,
            ORACLE_DISTRIBUTION_FILE_NAMES.identity,
          ),
          "utf8",
        ),
      );
      expect(ordinaryIdentity.distributionId).toBe(
        ordinaryBuild.distributionId,
      );

      const aCase = corpus.batch.cases[0];
      const bCase = corpus.batch.cases[1];
      const priorCase = corpus.batch.cases[10];
      if (
        aCase === undefined ||
        bCase === undefined ||
        priorCase === undefined
      ) {
        throw new Error("The Oracle corpus is missing parity Cases.");
      }

      const jsonBody = (input: object): Buffer =>
        Buffer.from(JSON.stringify(input), "utf8");
      const wholeBatchBody = jsonBody({ cases: corpus.batch.cases });
      const aSingletonBody = jsonBody({ cases: [aCase] });
      const bSingletonBody = jsonBody({ cases: [bCase] });
      const defectBatchBody = jsonBody({
        cases: [aCase, bCase],
      });
      const lineFeed = Buffer.from("\n");

      type ParityScenario = {
        readonly name: string;
        readonly body: Buffer;
        readonly expectedTag: "evaluated" | "decodeRejected";
      };
      const expectedInvalidJsonIssues = [
        { path: "", code: "invalidJson" },
      ] as const satisfies OracleDecodeIssues;
      const expectedMixedDecodeIssues = [
        { path: "/cases/1/battle", code: "missingMember" },
        { path: "/cases/1/creation", code: "missingMember" },
        { path: "/cases/1/sheet", code: "missingMember" },
        { path: "/cases/2/battle", code: "missingMember" },
        { path: "/cases/2/creation/fillBatches", code: "missingMember" },
        { path: "/cases/2/sheet", code: "missingMember" },
      ] as const satisfies OracleDecodeIssues;
      const evaluatedScenario = (
        name: string,
        body: Buffer,
      ): ParityScenario => ({
        name,
        body,
        expectedTag: "evaluated",
      });
      const rejectedScenario = (
        name: string,
        body: Buffer,
      ): ParityScenario => ({
        name,
        body,
        expectedTag: "decodeRejected",
      });

      const wholeBatchBeforePrior = evaluatedScenario(
        "whole corpus before prior message",
        wholeBatchBody,
      );
      const priorMessage = evaluatedScenario(
        "prior message",
        jsonBody({ cases: [priorCase] }),
      );
      const wholeBatchAfterPrior = evaluatedScenario(
        "whole corpus after prior message",
        wholeBatchBody,
      );
      const singletonScenarios = corpus.batch.cases.map((caseValue) =>
        evaluatedScenario("corpus singleton", jsonBody({ cases: [caseValue] })),
      );
      const emptyInputScenario = rejectedScenario(
        "empty input",
        Buffer.alloc(0),
      );
      const blankInputScenario = rejectedScenario(
        "blank input",
        Buffer.from("   ", "utf8"),
      );
      const invalidJsonScenario = rejectedScenario(
        "invalid JSON",
        Buffer.from("not-json", "utf8"),
      );
      const duplicateMemberScenario = rejectedScenario(
        "duplicate object member",
        Buffer.from('{"cases":[],"cases":[]}', "utf8"),
      );
      const emptyBatchScenario = rejectedScenario(
        "empty batch",
        Buffer.from('{"cases":[]}', "utf8"),
      );
      const structurallyInvalidCaseScenario = rejectedScenario(
        "structurally invalid Case",
        Buffer.from('{"cases":[{}]}', "utf8"),
      );
      const mixedMalformedScenario = rejectedScenario(
        "valid and multiple structurally invalid Cases",
        jsonBody({ cases: [aCase, {}, { creation: {} }] }),
      );
      const invalidUtf8Scenario = rejectedScenario(
        "fatal invalid UTF-8",
        Buffer.from([0xc3, 0x28]),
      );
      const malformedScenarios: readonly ParityScenario[] = [
        emptyInputScenario,
        blankInputScenario,
        invalidJsonScenario,
        duplicateMemberScenario,
        emptyBatchScenario,
        structurallyInvalidCaseScenario,
        mixedMalformedScenario,
        invalidUtf8Scenario,
      ];
      const aScenario = evaluatedScenario("A", aSingletonBody);
      const bScenario = evaluatedScenario("B", bSingletonBody);
      const repeatedAScenario = evaluatedScenario("A again", aSingletonBody);
      const scenarios: readonly ParityScenario[] = [
        wholeBatchBeforePrior,
        priorMessage,
        wholeBatchAfterPrior,
        ...singletonScenarios,
        aScenario,
        bScenario,
        repeatedAScenario,
        ...malformedScenarios,
      ];

      const cliByScenario = new Map<ParityScenario, OracleBatchResponse>();
      const cliObservations: OracleStreamFrameObservation[] = [];
      const streamProcess = launchOracleStream(
        ordinaryBuild.executablePath,
        cleanWorkingDirectory,
        preload,
      );
      try {
        for (const scenario of scenarios) {
          const observation = await evaluateOracleStreamFrame(
            streamProcess,
            scenario.body,
          );
          cliByScenario.set(scenario, observation.response);
          cliObservations.push(observation);
        }
        await waitForOracleStreamExit(streamProcess);
        expect(streamProcess.stderr()).toBe("");
        expect(streamProcess.rawLines).toHaveLength(cliObservations.length);
        expect(streamProcess.rawLines).toEqual(
          cliObservations.map(({ rawLine }) => rawLine),
        );
        expect(
          streamProcess.rawLines.map((rawLine) =>
            decodeJson(OracleBatchResponseSchema, rawLine),
          ),
        ).toEqual(cliObservations.map(({ response }) => response));
      } finally {
        await terminateOracleStream(streamProcess);
      }

      const ordinaryIdentityProcess = runExecutable(
        ordinaryBuild.executablePath,
        ["identity"],
        cleanWorkingDirectory,
        preload,
      );
      assertSuccessfulProcess(ordinaryIdentityProcess);
      expect(
        decodeJson(
          OracleIdentityResponseSchema,
          ordinaryIdentityProcess.stdout.toString("utf8"),
        ),
      ).toEqual(ordinaryIdentity);

      const runningProcess = await launchOracleServe(
        ordinaryBuild.executablePath,
        cleanWorkingDirectory,
        preload,
      );
      running = runningProcess;
      expect(runningProcess.readiness.host).toBe("127.0.0.1");
      expect(runningProcess.readiness.port).toBeGreaterThan(0);
      expect(runningProcess.stderr()).toBe("");

      const identityResponse = await requestOracle(
        runningProcess.readiness.port,
        { method: "GET", path: "/oracle/identity" },
      );
      expect(identityResponse.status).toBe(200);
      expect(identityResponse.headers["content-type"]).toBe(
        "application/json; charset=utf-8",
      );
      expect(
        decodeJson(
          OracleIdentityResponseSchema,
          identityResponse.body.toString("utf8"),
        ),
      ).toEqual(ordinaryIdentity);

      const httpByScenario = new Map<
        ParityScenario,
        { readonly response: OracleBatchResponse; readonly status: number }
      >();
      for (const scenario of scenarios) {
        const httpResponse = await requestOracle(
          runningProcess.readiness.port,
          {
            method: "POST",
            path: "/oracle/evaluations",
            body: scenario.body,
            contentType: "application/json; charset=utf-8",
          },
        );
        expect(httpResponse.headers["content-type"]).toBe(
          "application/json; charset=utf-8",
        );
        const decodedResponse = decodeJson(
          OracleBatchResponseSchema,
          httpResponse.body.toString("utf8"),
        );
        expect(httpResponse.body.toString("utf8")).toBe(
          JSON.stringify(decodedResponse),
        );
        httpByScenario.set(scenario, {
          response: decodedResponse,
          status: httpResponse.status,
        });
      }

      const responseFor = (scenario: ParityScenario): OracleBatchResponse => {
        const response = cliByScenario.get(scenario);
        if (response === undefined) {
          throw new Error(`CLI response missing for ${scenario.name}.`);
        }
        return response;
      };
      const httpResponseFor = (
        scenario: ParityScenario,
      ): {
        readonly response: OracleBatchResponse;
        readonly status: number;
      } => {
        const observation = httpByScenario.get(scenario);
        if (observation === undefined) {
          throw new Error(`HTTP response missing for ${scenario.name}.`);
        }
        return observation;
      };

      for (const scenario of scenarios) {
        const cliResponse = responseFor(scenario);
        const httpObservation = httpResponseFor(scenario);
        expect(httpObservation.response).toEqual(cliResponse);
        expect(cliResponse.tag).toBe(scenario.expectedTag);
        expect(cliResponse.distributionId).toBe(
          ordinaryIdentity.distributionId,
        );
        expect(httpObservation.status).toBe(
          Match.value(scenario.expectedTag).pipe(
            Match.when("evaluated", () => 200),
            Match.when("decodeRejected", () => 400),
            Match.exhaustive,
          ),
        );
      }

      const wholeBeforeResponse = responseFor(wholeBatchBeforePrior);
      const wholeAfterResponse = responseFor(wholeBatchAfterPrior);
      expect(wholeAfterResponse).toEqual(wholeBeforeResponse);
      const singletonTraces = singletonScenarios.flatMap((scenario) => {
        const response = responseFor(scenario);
        return assertEvaluated(response);
      });
      expect(assertEvaluated(wholeAfterResponse)).toEqual(singletonTraces);
      expect(responseFor(aScenario)).toEqual(responseFor(repeatedAScenario));
      expect(responseFor(aScenario)).not.toEqual(responseFor(bScenario));

      const mixedResponse = responseFor(mixedMalformedScenario);
      if (mixedResponse.tag !== "decodeRejected") {
        throw new Error("The mixed malformed batch was evaluated.");
      }
      expect(mixedResponse.issues).toEqual(expectedMixedDecodeIssues);
      const invalidJsonResponse = responseFor(invalidJsonScenario);
      if (invalidJsonResponse.tag !== "decodeRejected") {
        throw new Error("The invalid JSON batch was evaluated.");
      }
      expect(invalidJsonResponse.issues).toEqual(expectedInvalidJsonIssues);
      const invalidUtf8Response = responseFor(invalidUtf8Scenario);
      if (invalidUtf8Response.tag !== "decodeRejected") {
        throw new Error("The invalid UTF-8 batch was evaluated.");
      }
      expect(invalidUtf8Response.issues).toEqual(expectedInvalidJsonIssues);

      await waitForOracleExit(runningProcess, "SIGTERM");
      running = undefined;

      const defectBuild = buildOracleDistribution({
        destination: join(temporaryRoot, "defect-distribution"),
        entryPoint: resolve(packageRoot, "scripts/oracle-defect-test-entry.ts"),
      });
      expect(defectBuild.distributionId).not.toBe(
        ordinaryIdentity.distributionId,
      );
      const defectIdentity = decodeJson(
        OracleIdentityResponseSchema,
        readFileSync(
          join(
            defectBuild.destination,
            ORACLE_DISTRIBUTION_FILE_NAMES.identity,
          ),
          "utf8",
        ),
      );
      expect(defectIdentity.distributionId).toBe(defectBuild.distributionId);

      const defectIdentityProcess = runExecutable(
        defectBuild.executablePath,
        ["identity"],
        cleanWorkingDirectory,
        preload,
      );
      assertSuccessfulProcess(defectIdentityProcess);
      expect(
        decodeJson(
          OracleIdentityResponseSchema,
          defectIdentityProcess.stdout.toString("utf8"),
        ),
      ).toEqual(defectIdentity);

      const defectCliResult = runExecutable(
        defectBuild.executablePath,
        ["stream"],
        cleanWorkingDirectory,
        preload,
        Buffer.concat([defectBatchBody, lineFeed, bSingletonBody, lineFeed]),
      );
      expect(defectCliResult.signal).toBeNull();
      expect(defectCliResult.status).not.toBeNull();
      if (defectCliResult.status === null) {
        throw new Error("The defect CLI did not report an exit status.");
      }
      expect(defectCliResult.status).not.toBe(0);
      expect(defectCliResult.stdout.toString("utf8")).toBe("");
      expect(defectCliResult.stderr.toString("utf8")).toContain(
        "injected later-Case evaluator defect",
      );

      const defectProcess = await launchOracleServe(
        defectBuild.executablePath,
        cleanWorkingDirectory,
        preload,
      );
      running = defectProcess;
      expect(defectProcess.readiness.host).toBe("127.0.0.1");
      const defectIdentityResponse = await requestOracle(
        defectProcess.readiness.port,
        { method: "GET", path: "/oracle/identity" },
      );
      expect(defectIdentityResponse.status).toBe(200);
      expect(
        decodeJson(
          OracleIdentityResponseSchema,
          defectIdentityResponse.body.toString("utf8"),
        ),
      ).toEqual(defectIdentity);

      const defectHttpResponse = await requestOracle(
        defectProcess.readiness.port,
        {
          method: "POST",
          path: "/oracle/evaluations",
          body: defectBatchBody,
          contentType: "application/json; charset=utf-8",
        },
      );
      expect(defectHttpResponse.status).toBe(500);
      expect(defectHttpResponse.headers["content-type"]).toBe(
        "application/json; charset=utf-8",
      );
      const decodedDefect = decodeJson(
        OracleDefectResponseSchema,
        defectHttpResponse.body.toString("utf8"),
      );
      expect(decodedDefect).toEqual({
        tag: "defect",
        distributionId: defectIdentity.distributionId,
      });
      expect(defectHttpResponse.body.toString("utf8")).toBe(
        JSON.stringify(decodedDefect),
      );

      const expectedRecoveryProcess = runExecutable(
        defectBuild.executablePath,
        ["stream"],
        cleanWorkingDirectory,
        preload,
        Buffer.concat([bSingletonBody, lineFeed]),
      );
      assertSuccessfulProcess(expectedRecoveryProcess);
      const expectedRecoveryResponse = onlyOracleResponse(
        parseResponseLines(expectedRecoveryProcess),
        "defect-build recovery",
      );

      const afterDefect = await requestOracle(defectProcess.readiness.port, {
        method: "POST",
        path: "/oracle/evaluations",
        body: bSingletonBody,
        contentType: "application/json; charset=utf-8",
      });
      expect(afterDefect.status).toBe(200);
      const afterDefectResponse = decodeJson(
        OracleBatchResponseSchema,
        afterDefect.body.toString("utf8"),
      );
      expect(afterDefectResponse).toEqual(expectedRecoveryResponse);

      await waitForOracleExit(defectProcess, "SIGTERM");
      running = undefined;
    } finally {
      if (running !== undefined) {
        if (
          running.child.exitCode === null &&
          running.child.signalCode === null
        ) {
          running.child.kill("SIGKILL");
        }
        running.lines.close();
      }
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }, 300_000);

  test("does not drop extra stream lines and bounds silent frames", async () => {
    const temporaryRoot = mkdtempSync(
      join(tmpdir(), "opaque-oracle-stream-observer-"),
    );
    try {
      const cleanWorkingDirectory = mkdtempSync(
        join(temporaryRoot, "clean-cwd-"),
      );
      const preload = writeNetworkDenialPreload(temporaryRoot);
      const response = JSON.stringify({
        tag: "decodeRejected",
        distributionId: `sha256:${"0".repeat(64)}`,
        issues: [{ path: "", code: "invalidJson" }],
      });
      const extraLinesScript = [
        `const response = ${JSON.stringify(`${response}\n${response}\n`)};`,
        'process.stdin.once("data", () => process.stdout.write(response));',
      ].join("\n");
      const extraLinesProcess = launchOracleStream(
        process.execPath,
        cleanWorkingDirectory,
        preload,
        ["-e", extraLinesScript],
      );
      try {
        await expect(
          evaluateOracleStreamFrame(extraLinesProcess, Buffer.from("{}"), {
            timeoutMs: 1_000,
          }),
        ).rejects.toThrow(
          "Oracle stream emitted 2 response lines for 1 pending frame(s).",
        );
        expect(extraLinesProcess.rawLines).toEqual([response, response]);
      } finally {
        await terminateOracleStream(extraLinesProcess);
      }

      const silentProcess = launchOracleStream(
        process.execPath,
        cleanWorkingDirectory,
        preload,
        ["-e", 'process.stdin.on("data", () => undefined);'],
      );
      try {
        await expect(
          evaluateOracleStreamFrame(silentProcess, Buffer.from("{}"), {
            timeoutMs: 25,
          }),
        ).rejects.toThrow(
          "Oracle stream frame timed out after 25ms without one response.",
        );
        expect(silentProcess.pendingWaiters).toHaveLength(0);
        expect(silentProcess.activeWaiters.size).toBe(0);
      } finally {
        await terminateOracleStream(silentProcess);
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("rejects a test entrypoint that imports eager catalog data", () => {
    const temporaryRoot = mkdtempSync(
      join(tmpdir(), "opaque-oracle-eager-catalog-entrypoint-"),
    );
    try {
      const entryPoint = join(temporaryRoot, "eager-catalog-entrypoint.ts");
      writeFileSync(
        entryPoint,
        [
          `import ${JSON.stringify(
            resolve(packageRoot, "../surface/src/surface/unit-catalog-data.ts"),
          )};`,
          `import ${JSON.stringify(
            resolve(
              packageRoot,
              "../surface/src/surface/stat-block-catalog-data.ts",
            ),
          )};`,
          "",
        ].join("\n"),
      );

      expect(() =>
        buildOracleDistribution({
          destination: join(temporaryRoot, "distribution"),
          entryPoint,
        }),
      ).toThrow(/Oracle executable bundled canonical catalog inputs/);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }, 300_000);

  test("uses the test evaluator seam to abort atomically on a later-Case defect", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "opaque-oracle-defect-"));
    try {
      const defectBuild = buildOracleDistribution({
        destination: join(temporaryRoot, "distribution"),
        entryPoint: resolve(packageRoot, "scripts/oracle-defect-test-entry.ts"),
      });
      const cleanWorkingDirectory = mkdtempSync(
        join(temporaryRoot, "clean-cwd-"),
      );
      const preload = writeNetworkDenialPreload(temporaryRoot);
      const firstCase = corpus.batch.cases[0];
      const secondCase = corpus.batch.cases[1];
      if (firstCase === undefined || secondCase === undefined) {
        throw new Error("The Oracle corpus must contain two Cases.");
      }
      const result = runExecutable(
        defectBuild.executablePath,
        ["stream"],
        cleanWorkingDirectory,
        preload,
        Buffer.from(
          `${JSON.stringify({ cases: [firstCase, secondCase] })}\n${JSON.stringify({ cases: [firstCase] })}\n`,
        ),
      );
      expect(result.status).not.toBe(0);
      expect(result.stdout.toString("utf8")).toBe("");
      expect(result.stderr.toString("utf8")).toContain(
        "injected later-Case evaluator defect",
      );
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }, 300_000);
});
