import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";
import { Either, Schema } from "effect";

import {
  finalizeSdkPlayerExecution,
  reconcilePlayerInvocation,
} from "./run-sdk-player.ts";
import {
  ModelInvocationNonZeroExitStatusSchema,
  terminateOwnedProcess,
  type SpawnedCodexProcess,
} from "./model-telemetry.ts";

describe("SDK player invocation lifecycle", () => {
  async function waitForFile(path: string, timeoutMilliseconds = 1_000) {
    const deadline = Date.now() + timeoutMilliseconds;
    while (!existsSync(path) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    if (!existsSync(path)) {
      throw new Error(`Timed out waiting for readiness file: ${path}`);
    }
  }

  test("retains a terminal obstruction when the model exits nonzero", () => {
    const result = reconcilePlayerInvocation(
      {
        tag: "failed",
        process: {
          tag: "exited",
          status: Schema.decodeUnknownSync(
            ModelInvocationNonZeroExitStatusSchema,
          )(1),
        },
        cause: { tag: "process", reason: "Codex exited with status 1." },
      },
      {
        tag: "obstructed",
        recordedContinuations: 128,
        obstruction: {
          kind: "continuationLimit",
          limit: 128,
          message: "Synthetic terminal SDK obstruction.",
        },
      },
    );
    expect(Either.isRight(result)).toBe(true);
    expect(result).toMatchObject({
      _tag: "Right",
      right: {
        tag: "obstructed",
        recordedContinuations: 128,
      },
    });
  });

  test("does not turn an active or concluded player into obstruction success", () => {
    const lifecycle = {
      tag: "failed" as const,
      operation: "expectedLastMessage" as const,
      process: {
        tag: "timedOut" as const,
        timeoutMilliseconds: 25,
        termination: {
          tag: "reaped" as const,
          signalDelivery: {
            tag: "confirmed" as const,
            signal: "SIGKILL" as const,
          },
        },
      },
      cause: { tag: "process" as const, reason: "Codex timed out." },
    };
    expect(
      reconcilePlayerInvocation(lifecycle, {
        tag: "active",
        recordedContinuations: 2,
      }),
    ).toMatchObject({ _tag: "Left" });
    expect(
      reconcilePlayerInvocation(lifecycle, {
        tag: "concluded",
        recordedContinuations: 2,
      }),
    ).toMatchObject({ _tag: "Left" });
  });

  test("bounds TERM-ignoring supervisor cleanup with KILL escalation", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-supervisor-cleanup-"));
    const readyPath = resolve(root, "ready");
    const supervisor = spawn(
      process.execPath,
      [
        "-e",
        'process.on("SIGTERM", () => {}); require("node:fs").writeFileSync(process.env.RAW_SUPERVISOR_READY, "ready"); setInterval(() => {}, 10000);',
      ],
      {
        env: { ...process.env, RAW_SUPERVISOR_READY: readyPath },
        detached: process.platform !== "win32",
        stdio: "ignore",
      },
    );
    try {
      await waitForFile(readyPath);
      const termination = await terminateOwnedProcess(supervisor, {
        detached: process.platform !== "win32",
      });
      expect(termination.tag).toBe("reaped");
      if (process.platform !== "win32" && termination.tag === "reaped") {
        expect(termination.signalDelivery).toMatchObject({
          tag: "confirmed",
          signal: "SIGKILL",
        });
      }
    } finally {
      if (supervisor.exitCode === null) supervisor.kill("SIGKILL");
      rmSync(root, { recursive: true, force: true });
    }
  }, 10_000);

  test("fails unreaped supervisor execution without deleting diagnostic directories", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-player-unreaped-"));
    const scratch = resolve(root, "scratch");
    const trusted = resolve(root, "trusted");
    const codexHome = resolve(root, "codex-home");
    const output = resolve(root, "output");
    mkdirSync(resolve(trusted, "evidence"), { recursive: true });
    mkdirSync(resolve(output, "evidence"), { recursive: true });
    for (const directory of [scratch, codexHome]) mkdirSync(directory);
    writeFileSync(resolve(trusted, "evidence/supervisor.log"), "diagnostic");
    writeFileSync(resolve(output, "execution.json"), "diagnostic");
    writeFileSync(
      resolve(output, "evidence/execution-start.json"),
      "diagnostic",
    );
    const supervisor: SpawnedCodexProcess = Object.assign(new EventEmitter(), {
      pid: undefined,
      exitCode: null,
      signalCode: null,
      kill: () => true,
    });
    try {
      const finalization = await finalizeSdkPlayerExecution({
        supervisorProcess: supervisor,
        detached: false,
        directories: {
          scratch,
          trusted,
          codexHome,
          output,
        },
        onReaped: () => {
          writeFileSync(resolve(output, "replay-supervisor.mjs"), "success");
        },
      });
      expect(finalization).toMatchObject({
        tag: "failed",
        failure: {
          kind: "unreapedSupervisorCleanup",
        },
      });
      expect(existsSync(scratch)).toBe(true);
      expect(existsSync(trusted)).toBe(true);
      expect(existsSync(resolve(trusted, "evidence"))).toBe(true);
      expect(existsSync(codexHome)).toBe(true);
      expect(existsSync(output)).toBe(true);
      expect(existsSync(resolve(output, "evidence"))).toBe(true);
      expect(existsSync(resolve(output, "replay-supervisor.mjs"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 10_000);

  test("cleans temporary roots only after a reaped finalization", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-player-reaped-"));
    const scratch = resolve(root, "scratch");
    const trusted = resolve(root, "trusted");
    const codexHome = resolve(root, "codex-home");
    const output = resolve(root, "output");
    for (const directory of [scratch, trusted, codexHome, output])
      mkdirSync(directory);
    try {
      const finalization = await finalizeSdkPlayerExecution({
        supervisorProcess: undefined,
        detached: false,
        directories: {
          scratch,
          trusted,
          codexHome,
          output,
        },
        onReaped: () => {
          writeFileSync(resolve(output, "reaped-success"), "success");
        },
      });
      expect(finalization).toMatchObject({
        tag: "reaped",
      });
      expect(existsSync(scratch)).toBe(false);
      expect(existsSync(trusted)).toBe(false);
      expect(existsSync(codexHome)).toBe(false);
      expect(existsSync(output)).toBe(true);
      expect(existsSync(resolve(output, "reaped-success"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("preserves diagnostic roots when evidence retention fails", async () => {
    const root = mkdtempSync(
      resolve(tmpdir(), "dnd-player-retention-failure-"),
    );
    const scratch = resolve(root, "scratch");
    const trusted = resolve(root, "trusted");
    const codexHome = resolve(root, "codex-home");
    const output = resolve(root, "output");
    for (const directory of [scratch, trusted, codexHome, output])
      mkdirSync(directory);
    try {
      const finalization = await finalizeSdkPlayerExecution({
        supervisorProcess: undefined,
        detached: false,
        directories: {
          scratch,
          trusted,
          codexHome,
          output,
        },
        onReaped: () => {
          throw new Error("synthetic evidence retention failure");
        },
      });
      expect(finalization).toEqual({
        tag: "failed",
        failure: {
          kind: "evidenceRetentionFailure",
          reason: "synthetic evidence retention failure",
        },
      });
      expect(existsSync(scratch)).toBe(true);
      expect(existsSync(trusted)).toBe(true);
      expect(existsSync(codexHome)).toBe(true);
      expect(existsSync(output)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
