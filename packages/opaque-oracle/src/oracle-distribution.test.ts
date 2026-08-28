import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  spawn,
  spawnSync,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import type { IncomingHttpHeaders } from "node:http";
import { request as requestHttp } from "node:http";
import {
  createInterface,
  type Interface as ReadlineInterface,
} from "node:readline";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { buildOracleDistribution } from "../scripts/build-distribution.ts";
import { checkOracleDistribution } from "../scripts/check-distribution.ts";
import { decodeOracleEvaluationBatchJson } from "./oracle-case-trace.ts";
import { evaluateOracleBatch } from "./oracle-evaluation.ts";
import {
  computeOracleDistributionId,
  loadOracleApplicationFromDirectory,
  ORACLE_DISTRIBUTION_FILE_NAMES,
} from "./oracle-distribution.ts";
import {
  ORACLE_PUBLICATION_FILE_NAMES,
  ORACLE_PUBLICATION_MEMBERS,
} from "./oracle-publication.ts";

const packageRoot = resolve(import.meta.dirname, "..");
const corpusPath = resolve(packageRoot, "corpus/oracle-evaluation-corpus.json");
const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as {
  readonly batch: {
    readonly cases: readonly Record<string, unknown>[];
  };
};

const distributionAssetNames = [
  ORACLE_DISTRIBUTION_FILE_NAMES.executable,
  ORACLE_DISTRIBUTION_FILE_NAMES.identity,
  ORACLE_DISTRIBUTION_FILE_NAMES.projection,
  ...ORACLE_PUBLICATION_MEMBERS.map(
    (member) => ORACLE_PUBLICATION_FILE_NAMES[member],
  ),
];

type ProcessResult = ReturnType<typeof spawnSync>;

type OracleReadiness = {
  readonly host: string;
  readonly port: number;
};

type OracleHttpResponse = {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly body: Buffer;
};

type OracleServeProcess = {
  readonly child: ChildProcessWithoutNullStreams;
  readonly readiness: OracleReadiness;
  readonly lines: ReadlineInterface;
  readonly stdout: () => string;
  readonly stderr: () => string;
};

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

function parseResponseLines(
  result: ProcessResult,
): readonly Record<string, unknown>[] {
  const output = result.stdout.toString("utf8");
  expect(output.endsWith("\n")).toBe(true);
  const frames = output.slice(0, -1).split("\n");
  return frames.map((frame) => JSON.parse(frame) as Record<string, unknown>);
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
  const child = spawn(
    executable,
    ["serve", "--host", "127.0.0.1", "--port", port],
    {
      cwd,
      env: processEnvironment(preload),
      stdio: ["ignore", "pipe", "pipe"],
    },
  ) as unknown as ChildProcessWithoutNullStreams;
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
  let readiness: OracleReadiness;
  try {
    readiness = await new Promise<OracleReadiness>((resolve, reject) => {
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
          const value: unknown = JSON.parse(line);
          const record =
            typeof value === "object" && value !== null
              ? (value as { readonly host?: unknown; readonly port?: unknown })
              : undefined;
          const host = record?.host;
          const port = record?.port;
          if (
            record === undefined ||
            typeof host !== "string" ||
            typeof port !== "number"
          ) {
            throw new Error("Oracle readiness has the wrong shape.");
          }
          finish(() => resolve({ host, port }));
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
  },
): Promise<OracleHttpResponse> {
  const body = input.body ?? new Uint8Array();
  const headers: Record<string, string | number> = {
    "content-length": body.byteLength,
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
  let timeout: ReturnType<typeof setTimeout>;
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
    clearTimeout(timeout!);
  }
  process.lines.close();
  expect(process.stdout()).toBe(`${JSON.stringify(process.readiness)}\n`);
}

function assertEvaluated(
  response: Record<string, unknown>,
): readonly Record<string, unknown>[] {
  expect(response.tag).toBe("evaluated");
  expect(Array.isArray(response.traces)).toBe(true);
  return response.traces as readonly Record<string, unknown>[];
}

describe("Opaque Oracle source-free distribution", () => {
  test("is deterministic, verifies identity, runs offline from another directory, and preserves stream laws", () => {
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

      const identity = JSON.parse(
        readFileSync(
          join(firstDirectory, ORACLE_DISTRIBUTION_FILE_NAMES.identity),
          "utf8",
        ),
      ) as { readonly distributionId: string };
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
      const batchTraces = assertEvaluated(decompositionResponses[0]!);
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

      const malformed = runExecutable(
        executable,
        ["stream"],
        cleanWorkingDirectory,
        preload,
        Buffer.concat([
          Buffer.from(
            'not-json\n\n{"cases":[],"cases":[]}\n{"cases":[]}\n{"cases":[{}],"extra":true}\n',
          ),
          Buffer.from([0xc3, 0x28, 0x0a]),
          Buffer.from(firstSingleton),
        ]),
      );
      assertSuccessfulProcess(malformed);
      const malformedResponses = parseResponseLines(malformed);
      expect(malformedResponses).toHaveLength(7);
      for (const response of malformedResponses.slice(0, 6)) {
        expect(response.tag).toBe("decodeRejected");
        expect(response.distributionId).toBe(identity.distributionId);
      }
      expect(
        (malformedResponses[2]?.issues as readonly unknown[]).length,
      ).toBeGreaterThan(0);
      expect(
        (malformedResponses[4]?.issues as readonly unknown[]).length,
      ).toBeGreaterThan(1);
      expect(assertEvaluated(malformedResponses[6]!)).toHaveLength(1);

      const workflowRejection = runExecutable(
        executable,
        ["stream"],
        cleanWorkingDirectory,
        preload,
        Buffer.from(`${JSON.stringify({ cases: [corpus.batch.cases[10]] })}\n`),
      );
      assertSuccessfulProcess(workflowRejection);
      const rejectedTrace = assertEvaluated(
        parseResponseLines(workflowRejection)[0]!,
      )[0];
      expect(
        (
          rejectedTrace?.creation as {
            readonly outcome: { readonly tag: string };
          }
        ).outcome.tag,
      ).toBe("fillRejected");

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

      const finalFrame = runExecutable(
        executable,
        ["stream"],
        cleanWorkingDirectory,
        preload,
        Buffer.from(firstSingleton),
      );
      assertSuccessfulProcess(finalFrame);
      expect(finalFrame.stdout.toString("utf8").endsWith("\n")).toBe(true);
      expect(parseResponseLines(finalFrame)).toHaveLength(1);

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
      const identity = JSON.parse(
        readFileSync(
          join(build.destination, ORACLE_DISTRIBUTION_FILE_NAMES.identity),
          "utf8",
        ),
      ) as { readonly distributionId: string };
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
      const post = (
        body: Uint8Array,
        contentType = jsonContentType,
      ): Promise<OracleHttpResponse> =>
        requestOracle(running!.readiness.port, {
          method: "POST",
          path: "/oracle/evaluations",
          body,
          contentType,
        });
      const assertJsonContract = (response: OracleHttpResponse): void => {
        expect(response.headers["content-type"]).toBe(jsonContentType);
      };

      running = await launchOracleServe(
        executable,
        cleanWorkingDirectory,
        preload,
      );
      expect(running.readiness.host).toBe("127.0.0.1");
      expect(Number.isInteger(running.readiness.port)).toBe(true);
      expect(running.readiness.port).toBeGreaterThan(0);
      expect(running.stderr()).toBe("");

      const identityResponse = await requestOracle(running.readiness.port, {
        method: "GET",
        path: "/oracle/identity",
      });
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
      const workflowJson = JSON.parse(
        workflowResponse.body.toString("utf8"),
      ) as {
        readonly tag: string;
        readonly traces: readonly {
          readonly creation: { readonly outcome: { readonly tag: string } };
        }[];
      };
      expect(workflowJson.tag).toBe("evaluated");
      expect(workflowJson.traces[0]?.creation.outcome.tag).toBe("fillRejected");

      const malformedResponses = await Promise.all([
        post(Buffer.alloc(0)),
        post(Buffer.from("not-json")),
        post(Buffer.from('{"cases":[],"cases":[]}')),
        post(Buffer.from('{"cases":[{}]}')),
        post(Buffer.from([0xc3, 0x28])),
      ]);
      for (const response of malformedResponses) {
        expect(response.status).toBe(400);
        assertJsonContract(response);
        const value = JSON.parse(response.body.toString("utf8")) as {
          readonly tag: string;
          readonly distributionId: string;
        };
        expect(value.tag).toBe("decodeRejected");
        expect(value.distributionId).toBe(identity.distributionId);
      }
      expect(malformedResponses[4]!.body.toString("utf8")).toBe(
        `{"tag":"decodeRejected","distributionId":"${identity.distributionId}","issues":[{"path":"","code":"invalidJson"}]}`,
      );

      const unknownRoute = await requestOracle(running.readiness.port, {
        method: "GET",
        path: "/oracle/unknown",
      });
      expect(unknownRoute.status).toBe(404);
      const wrongMethod = await requestOracle(running.readiness.port, {
        method: "POST",
        path: "/oracle/identity",
      });
      expect(wrongMethod.status).toBe(405);
      const unsupportedMedia = await post(
        Buffer.from(firstSingleton),
        "text/plain; charset=utf-8",
      );
      expect(unsupportedMedia.status).toBe(415);
      const oversized = await post(Buffer.alloc(2_000_000, 0x20));
      expect(oversized.status).toBe(413);

      await waitForOracleExit(running, "SIGINT");
      running = undefined;

      running = await launchOracleServe(
        executable,
        cleanWorkingDirectory,
        preload,
      );
      expect(running.readiness.port).toBeGreaterThan(0);
      await waitForOracleExit(running, "SIGTERM");
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
