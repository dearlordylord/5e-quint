import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

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
      "dns.lookup = deny;",
      "if (dns.promises) dns.promises.lookup = deny;",
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
