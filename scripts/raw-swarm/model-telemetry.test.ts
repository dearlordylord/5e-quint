import { EventEmitter } from "node:events";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { Either, Schema } from "effect";

import {
  codexInvocationMetadataMatchesArgs,
  codexJsonArgs,
  benchmarkModelInvocationCompletedEvent,
  benchmarkModelInvocationEvidenceFromEvents,
  benchmarkModelInvocationStartedEvent,
  modelInvocationCompletedEvent,
  modelInvocationEvidenceFromEvents,
  modelInvocationResultFromCodexEvents,
  modelInvocationStartedEvent,
  modelUsageFromCodexEvents,
  parseModelInvocationLedgerEntry,
  parseBenchmarkModelInvocationLedgerEntry,
  jsonModelInvocationLastMessageDecoder,
  readCodexEvents,
  invocationEventsSha256,
  CurrentModelInvocationLedgerEntrySchema,
  CurrentModelInvocationLedgerEntryV4Schema,
  CurrentModelInvocationLedgerEntryV5Schema,
  runCodexInvocation,
  signalOwnedProcess,
  type SpawnOwnedCodexProcess,
} from "./model-telemetry.ts";
import {
  decodeHistoricalScenarioId,
  decodeScenarioId,
  GitShaSchema,
  ScenarioIdSchema,
} from "./transcript.ts";

describe("Raw Swarm model invocation telemetry", () => {
  async function waitForFile(path: string, timeoutMilliseconds = 1_000) {
    const deadline = Date.now() + timeoutMilliseconds;
    while (!existsSync(path) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    if (!existsSync(path)) {
      throw new Error(`Timed out waiting for readiness file: ${path}`);
    }
  }

  function fakeInvocationInput(root: string, timeoutMilliseconds?: number) {
    const events = resolve(root, "events.jsonl");
    const log = resolve(root, "agent.log");
    const ledger = resolve(root, "ledger.jsonl");
    const output = resolve(root, "output.json");
    return {
      args: [
        "exec",
        "-m",
        "gpt-5.6-sol",
        "-c",
        'model_reasoning_effort="medium"',
      ] as const,
      cwd: root,
      env: { ...process.env, PATH: `${root}:${process.env.PATH ?? ""}` },
      eventPath: events,
      logPath: log,
      ledgerPath: ledger,
      phase: "scenarioGeneration" as const,
      stagePlanReason: "The campaign requires scenario generation.",
      subject: {
        tag: "scenarioCampaign" as const,
        campaignId: "synthetic-campaign",
        evidenceSetId: "synthetic-evidence",
        plannedScenarioId: "synthetic-scenario",
      },
      gitSha: Schema.decodeUnknownSync(GitShaSchema)("a".repeat(40)),
      fallbackInvocationId: "synthetic-fallback",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      timeoutMilliseconds,
      operation: {
        tag: "expectedLastMessage" as const,
        expected: {
          path: output,
          decode: (contents: string) => {
            try {
              return Either.right(JSON.parse(contents));
            } catch {
              return Either.left({
                tag: "malformed",
                message: "synthetic malformed JSON",
              });
            }
          },
        },
      },
    };
  }

  function expectLedgerRereadsFromEvents(
    eventPath: string,
    ledgerPath: string,
  ): void {
    const events = readCodexEvents(eventPath);
    const ledger = parseModelInvocationLedgerEntry(
      JSON.parse(readFileSync(ledgerPath, "utf8")),
    );
    expect(events.tag).toBe("valid");
    expect(ledger._tag).toBe("Right");
    if (events.tag !== "valid" || Either.isLeft(ledger)) return;
    const reread = modelInvocationEvidenceFromEvents(events.events);
    expect(reread.tag).toBe("valid");
    if (reread.tag !== "valid") return;
    const ledgerEntry = Object.fromEntries(
      Object.entries(ledger.right).filter(([key]) => key !== "eventsSha256"),
    );
    expect(reread.entry).toEqual(ledgerEntry);
    expect(invocationEventsSha256(eventPath)).toBe(ledger.right.eventsSha256);
  }

  test("retains timeout telemetry and a failed result when a child stalls without output", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-timeout-"));
    const codex = resolve(root, "codex");
    writeFileSync(
      codex,
      `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} -e 'setTimeout(() => {}, 1000)'\n`,
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root, 25);
      const result = await runCodexInvocation(input);
      expect(result).toMatchObject({
        tag: "failed",
        process: {
          tag: "timedOut",
          timeoutMilliseconds: 25,
          termination: {
            tag: "reaped",
            signalDelivery: { tag: "confirmed", signal: "SIGTERM" },
          },
        },
      });
      const events = readCodexEvents(input.eventPath);
      expect(events.tag).toBe("valid");
      if (events.tag === "valid") {
        expect(events.events.at(-1)).toMatchObject({
          type: "raw-swarm.invocation.completed",
          exit: {
            tag: "timedOut",
            timeoutMilliseconds: 25,
            termination: {
              tag: "reaped",
              signalDelivery: { tag: "confirmed", signal: "SIGTERM" },
            },
          },
          result: { tag: "failed" },
        });
      }
      const ledger = parseModelInvocationLedgerEntry(
        JSON.parse(readFileSync(input.ledgerPath, "utf8")),
      );
      expect(ledger).toMatchObject({
        _tag: "Right",
        right: {
          exit: {
            tag: "timedOut",
            timeoutMilliseconds: 25,
            termination: {
              tag: "reaped",
              signalDelivery: { tag: "confirmed", signal: "SIGTERM" },
            },
          },
          result: { tag: "failed" },
        },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("retains typed timeout evidence when a child leaves a partial JSONL line", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-partial-timeout-"));
    const codex = resolve(root, "codex");
    writeFileSync(
      codex,
      `#!/bin/sh
printf '{"type":"turn.started"}\n{"type":"turn.completed"'
exec ${process.execPath} -e 'setTimeout(() => {}, 1000)'
`,
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root, 25);
      const result = await runCodexInvocation(input);
      expect(result).toMatchObject({
        tag: "failed",
        process: { tag: "timedOut", timeoutMilliseconds: 25 },
        cause: { tag: "codex" },
      });
      const ledger = parseModelInvocationLedgerEntry(
        JSON.parse(readFileSync(input.ledgerPath, "utf8")),
      );
      expect(ledger).toMatchObject({
        _tag: "Right",
        right: {
          schemaVersion: 5,
          exit: { tag: "timedOut", timeoutMilliseconds: 25 },
          result: { tag: "failed", failureKind: "codexEvent" },
        },
      });
      const events = readCodexEvents(input.eventPath);
      expect(events).toMatchObject({ tag: "valid" });
      if (events.tag === "valid") {
        expect(events.events).toContainEqual({
          type: "raw-swarm.invocation.codex-event-failure",
          line: 3,
          message: "Codex event line 3 is malformed JSON.",
          rawLineBase64: Buffer.from('{"type":"turn.completed"').toString(
            "base64",
          ),
        });
      }
      expectLedgerRereadsFromEvents(input.eventPath, input.ledgerPath);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("canonicalizes a full malformed JSONL line before hashing evidence", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-full-malformed-"));
    const codex = resolve(root, "codex");
    writeFileSync(
      codex,
      `#!/bin/sh
printf '{"type":"turn.started"}\nnot-json\n'
exit 7
`,
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root);
      const result = await runCodexInvocation(input);
      expect(result).toMatchObject({
        tag: "failed",
        process: { tag: "exited", status: 7 },
        cause: { tag: "codex" },
      });
      const events = readCodexEvents(input.eventPath);
      expect(events).toMatchObject({ tag: "valid" });
      if (events.tag === "valid") {
        expect(events.events).toContainEqual({
          type: "raw-swarm.invocation.codex-event-failure",
          line: 3,
          message: "Codex event line 3 is malformed JSON.",
          rawLineBase64: Buffer.from("not-json").toString("base64"),
        });
      }
      expectLedgerRereadsFromEvents(input.eventPath, input.ledgerPath);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("records a typed current event-decode failure without a timeout", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-partial-exit-"));
    const codex = resolve(root, "codex");
    writeFileSync(
      codex,
      `#!/bin/sh
printf '{"type":"turn.completed"'
exit 7
`,
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root);
      const result = await runCodexInvocation(input);
      expect(result).toMatchObject({
        tag: "failed",
        process: { tag: "exited", status: 7 },
        cause: { tag: "codex" },
      });
      expect(
        parseModelInvocationLedgerEntry(
          JSON.parse(readFileSync(input.ledgerPath, "utf8")),
        ),
      ).toMatchObject({
        _tag: "Right",
        right: {
          schemaVersion: 5,
          exit: { tag: "exited", status: 7 },
          result: { tag: "failed", failureKind: "codexEvent" },
        },
      });
      expectLedgerRereadsFromEvents(input.eventPath, input.ledgerPath);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("escalates a TERM-ignoring child to KILL without leaving a process behind", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-term-ignore-"));
    const codex = resolve(root, "codex");
    const pidPath = resolve(root, "child.pid");
    const readyPath = resolve(root, "child-ready");
    writeFileSync(
      codex,
      `#!/bin/sh
exec ${process.execPath} -e 'process.on("SIGTERM", () => {}); require("node:fs").writeFileSync(process.env.RAW_CHILD_PID, String(process.pid)); require("node:fs").writeFileSync(process.env.RAW_CHILD_READY, "ready"); setInterval(() => {}, 10000)'
`,
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root, 1_000);
      input.env.RAW_CHILD_PID = pidPath;
      input.env.RAW_CHILD_READY = readyPath;
      const invocation = runCodexInvocation(input);
      await waitForFile(readyPath);
      const startedMilliseconds = Date.now();
      const result = await invocation;
      expect(Date.now() - startedMilliseconds).toBeLessThan(2_000);
      expect(result).toMatchObject({
        tag: "failed",
        process: {
          tag: "timedOut",
          timeoutMilliseconds: 1_000,
          termination: {
            tag: "reaped",
            signalDelivery: { tag: "confirmed", signal: "SIGKILL" },
          },
        },
        cause: { tag: "process" },
      });
      const childPid = Number(readFileSync(pidPath, "utf8"));
      expect(Number.isInteger(childPid)).toBe(true);
      expect(() => process.kill(childPid, 0)).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 10_000);

  test("keeps supervising a TERM-exiting leader until its ignored descendant is gone", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-group-term-ignore-"));
    const codex = resolve(root, "codex");
    const leaderPath = resolve(root, "leader.cjs");
    const descendantPidPath = resolve(root, "descendant.pid");
    const leaderReadyPath = resolve(root, "leader-ready");
    const leaderExitedPath = resolve(root, "leader-exited");
    const leader = `
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const descendant = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 10000)"], { stdio: "ignore" });
fs.writeFileSync(process.env.RAW_DESCENDANT_PID, String(descendant.pid));
process.on("SIGTERM", () => { fs.writeFileSync(process.env.RAW_LEADER_EXITED, "yes"); process.exit(0); });
fs.writeFileSync(process.env.RAW_LEADER_READY, "yes");
setInterval(() => {}, 10000);
`;
    writeFileSync(leaderPath, leader);
    writeFileSync(codex, `#!/bin/sh\nexec ${process.execPath} ${leaderPath}\n`);
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root, 1_000);
      input.env.RAW_DESCENDANT_PID = descendantPidPath;
      input.env.RAW_LEADER_READY = leaderReadyPath;
      input.env.RAW_LEADER_EXITED = leaderExitedPath;
      const invocation = runCodexInvocation(input);
      await waitForFile(leaderReadyPath, 900);
      const result = await invocation;
      expect(result).toMatchObject({
        tag: "failed",
        process: {
          tag: "timedOut",
          termination: {
            tag: "reaped",
            signalDelivery: { tag: "confirmed", signal: "SIGKILL" },
          },
        },
        cause: { tag: "process" },
      });
      expect(readFileSync(leaderExitedPath, "utf8")).toBe("yes");
      const descendantPid = Number(readFileSync(descendantPidPath, "utf8"));
      expect(Number.isInteger(descendantPid)).toBe(true);
      const deadline = Date.now() + 1_000;
      while (Date.now() < deadline) {
        try {
          process.kill(descendantPid, 0);
          await new Promise((resolve) => setTimeout(resolve, 10));
        } catch {
          break;
        }
      }
      expect(() => process.kill(descendantPid, 0)).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 10_000);

  test("settles on a disappeared group even when Node has not emitted exit", async () => {
    if (process.platform === "win32") return;
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-group-gone-"));
    let killCount = 0;
    const child = Object.assign(new EventEmitter(), {
      pid: 99_999_999,
      exitCode: null,
      signalCode: null,
      kill: () => {
        killCount += 1;
        return true;
      },
    });
    const spawnProcess: SpawnOwnedCodexProcess = () => child;
    try {
      const input = fakeInvocationInput(root, 10);
      const result = await runCodexInvocation({ ...input, spawnProcess });
      expect(result).toMatchObject({
        tag: "failed",
        process: {
          tag: "timedOut",
          termination: {
            tag: "reaped",
            signalDelivery: {
              tag: "notDelivered",
              reason: "Owned process group no longer exists.",
            },
          },
        },
      });
      expect(killCount).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("waits for a normal leader exit to clean an ignored descendant before reading evidence", async () => {
    const root = mkdtempSync(
      resolve(tmpdir(), "dnd-model-normal-group-cleanup-"),
    );
    const codex = resolve(root, "codex");
    const leaderPath = resolve(root, "leader.cjs");
    const descendantPidPath = resolve(root, "descendant.pid");
    const leaderReadyPath = resolve(root, "leader-ready");
    const leader = `
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const descendant = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 10000)"], { stdio: "ignore" });
fs.writeFileSync(process.env.RAW_DESCENDANT_PID, String(descendant.pid));
fs.writeFileSync(process.env.RAW_LEADER_READY, "yes");
fs.writeFileSync(process.env.RAW_OUTPUT_PATH, JSON.stringify({ result: "ready" }));
process.stdout.write('{"type":"turn.completed"}\\n');
process.exit(0);
`;
    writeFileSync(leaderPath, leader);
    writeFileSync(codex, `#!/bin/sh\nexec ${process.execPath} ${leaderPath}\n`);
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root, 1_000);
      input.env.RAW_DESCENDANT_PID = descendantPidPath;
      input.env.RAW_LEADER_READY = leaderReadyPath;
      input.env.RAW_OUTPUT_PATH = input.operation.expected.path;
      const invocation = runCodexInvocation(input);
      await waitForFile(leaderReadyPath);
      const result = await invocation;
      expect(result).toEqual({
        tag: "succeeded",
        operation: "expectedLastMessage",
        process: { tag: "exited", status: 0 },
        output: { tag: "decoded", value: { result: "ready" } },
      });
      const descendantPid = Number(readFileSync(descendantPidPath, "utf8"));
      expect(Number.isInteger(descendantPid)).toBe(true);
      expect(() => process.kill(descendantPid, 0)).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 10_000);

  test("bounds a supervisor whose child never emits a settlement event", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-no-settlement-"));
    let killCount = 0;
    const child = Object.assign(new EventEmitter(), {
      pid: undefined,
      exitCode: null,
      signalCode: null,
      kill: () => {
        killCount += 1;
        return true;
      },
    });
    const spawnProcess: SpawnOwnedCodexProcess = () => child;
    try {
      const input = fakeInvocationInput(root, 10);
      const startedMilliseconds = Date.now();
      const result = await runCodexInvocation({ ...input, spawnProcess });
      expect(Date.now() - startedMilliseconds).toBeLessThan(1_000);
      expect(result).toMatchObject({
        tag: "failed",
        process: {
          tag: "timedOut",
          termination: {
            tag: "unreaped",
            signalDelivery: { tag: "confirmed", signal: "SIGKILL" },
          },
        },
      });
      expect(killCount).toBe(2);
      const ledger = parseModelInvocationLedgerEntry(
        JSON.parse(readFileSync(input.ledgerPath, "utf8")),
      );
      expect(ledger).toMatchObject({
        _tag: "Right",
        right: {
          exit: {
            tag: "timedOut",
            termination: { tag: "unreaped" },
          },
          result: { tag: "failed" },
        },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("retains a failed result when a child exits zero without creating output", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-missing-output-"));
    const codex = resolve(root, "codex");
    writeFileSync(
      codex,
      '#!/bin/sh\nprintf \'{"type":"turn.completed"}\\n\'\nexit 0\n',
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root);
      const result = await runCodexInvocation(input);
      expect(result).toMatchObject({
        tag: "failed",
        cause: {
          tag: "lastMessage",
          failureKind: "lastMessageMissing",
          reason: expect.stringContaining("does not exist"),
        },
      });
      const ledger = parseModelInvocationLedgerEntry(
        JSON.parse(readFileSync(input.ledgerPath, "utf8")),
      );
      expect(ledger).toMatchObject({
        _tag: "Right",
        right: {
          exit: { tag: "exited", status: 0 },
          result: {
            tag: "failed",
            reason: expect.stringContaining("does not exist"),
          },
        },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("records a typed failure when a zero-exit stream fails analysis", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-analysis-failure-"));
    const codex = resolve(root, "codex");
    writeFileSync(
      codex,
      '#!/bin/sh\nprintf \'{"type":"turn.started"}\\n\'\nexit 0\n',
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root);
      const result = await runCodexInvocation(input);
      expect(result).toMatchObject({
        tag: "failed",
        process: { tag: "exited", status: 0 },
        cause: { tag: "codex" },
      });
      const events = readCodexEvents(input.eventPath);
      expect(events).toMatchObject({ tag: "valid" });
      if (events.tag === "valid") {
        expect(events.events.at(-1)).toMatchObject({
          type: "raw-swarm.invocation.completed",
          exit: { tag: "exited", status: 0 },
          result: { tag: "failed", failureKind: "codexEvent" },
        });
      }
      expect(
        parseModelInvocationLedgerEntry(
          JSON.parse(readFileSync(input.ledgerPath, "utf8")),
        ),
      ).toMatchObject({
        _tag: "Right",
        right: {
          schemaVersion: 5,
          exit: { tag: "exited", status: 0 },
          result: { tag: "failed", failureKind: "codexEvent" },
        },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects a preexisting expected output before starting the child", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-stale-output-"));
    const codex = resolve(root, "codex");
    const startedPath = resolve(root, "started");
    writeFileSync(
      codex,
      `#!/bin/sh\nprintf '%s' started > ${JSON.stringify(startedPath)}\nexit 0\n`,
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root);
      writeFileSync(input.operation.expected.path, '{"result":"stale"}\n');
      const result = await runCodexInvocation(input);
      expect(result).toMatchObject({
        tag: "failed",
        cause: {
          tag: "process",
          reason: expect.stringContaining(
            "claimed exclusively before invocation",
          ),
        },
      });
      expect(existsSync(startedPath)).toBe(false);
      expect(
        parseModelInvocationLedgerEntry(
          JSON.parse(readFileSync(input.ledgerPath, "utf8")),
        ),
      ).toMatchObject({
        _tag: "Right",
        right: {
          exit: { tag: "failedToStart" },
          result: { tag: "failed" },
        },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects a non-positive timeout instead of disabling the boundary", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-invalid-timeout-"));
    try {
      await expect(
        runCodexInvocation(fakeInvocationInput(root, 0)),
      ).rejects.toThrow("positive integer");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("binds output flags to operations before spawning", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-no-output-flag-"));
    try {
      const input = fakeInvocationInput(root);
      await expect(
        runCodexInvocation({
          ...input,
          args: [
            ...input.args,
            "--output-last-message",
            input.operation.expected.path,
          ] as const,
        }),
      ).rejects.toThrow("expected-last-message operation owns");
      await expect(
        runCodexInvocation({
          ...input,
          args: [
            ...input.args,
            "--output-last-message",
            input.operation.expected.path,
          ] as const,
          operation: { tag: "noOutput" as const },
        }),
      ).rejects.toThrow("no-output invocation cannot include");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("separates completion telemetry from a final JSON event without a newline", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-event-separator-"));
    const codex = resolve(root, "codex");
    writeFileSync(
      codex,
      `#!/bin/sh\nprintf '{"type":"turn.started"}\n{"type":"turn.completed"}'\n`,
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root);
      const result = await runCodexInvocation(input);
      expect(result).toMatchObject({
        tag: "failed",
        cause: { tag: "lastMessage", failureKind: "lastMessageMissing" },
      });
      expect(readCodexEvents(input.eventPath)).toMatchObject({ tag: "valid" });
      expect(existsSync(input.ledgerPath)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("retains a schema-decoded last message before recording success", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-valid-output-"));
    const codex = resolve(root, "codex");
    const argsPath = resolve(root, "args.txt");
    writeFileSync(
      codex,
      `#!/bin/sh
printf '%s\\n' "$@" > "$RAW_ARGS_PATH"
printf '{"type":"turn.completed"}\n'
exec ${process.execPath} -e 'require("node:fs").writeFileSync(process.env.RAW_OUTPUT_PATH, JSON.stringify({result:"ready"}))'
`,
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root);
      input.env.RAW_OUTPUT_PATH = input.operation.expected.path;
      input.env.RAW_ARGS_PATH = argsPath;
      input.operation.expected.decode = jsonModelInvocationLastMessageDecoder(
        Schema.Struct({ result: Schema.Literal("ready") }),
      );
      const result = await runCodexInvocation(input);
      expect(result).toEqual({
        tag: "succeeded",
        operation: "expectedLastMessage",
        process: { tag: "exited", status: 0 },
        output: { tag: "decoded", value: { result: "ready" } },
      });
      const invocationArgs = readFileSync(argsPath, "utf8")
        .trimEnd()
        .split("\n");
      expect(
        invocationArgs.filter((arg) => arg === "--output-last-message"),
      ).toHaveLength(1);
      expect(invocationArgs.at(-1)).toBe(input.operation.expected.path);
      const ledger = parseModelInvocationLedgerEntry(
        JSON.parse(readFileSync(input.ledgerPath, "utf8")),
      );
      expect(ledger).toMatchObject({
        _tag: "Right",
        right: {
          exit: { tag: "exited", status: 0 },
          result: { tag: "succeeded" },
        },
      });
      expect(
        JSON.parse(readFileSync(input.ledgerPath, "utf8")).eventsSha256,
      ).toBe(invocationEventsSha256(input.eventPath));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test.each([
    ["empty", "", "lastMessageEmpty"],
    ["malformed", "{", "lastMessageMalformed"],
    ["schema-invalid", '{"unexpected":true}', "lastMessageSchemaInvalid"],
  ] as const)(
    "classifies %s output as a typed invocation failure",
    async (_label, contents, failureKind) => {
      const root = mkdtempSync(resolve(tmpdir(), "dnd-model-output-failure-"));
      try {
        const input = fakeInvocationInput(root);
        input.env.RAW_OUTPUT_PATH = input.operation.expected.path;
        input.env.RAW_OUTPUT_CONTENT = contents;
        input.operation.expected.decode = (value: string) => {
          try {
            const parsed: unknown = JSON.parse(value);
            if (
              typeof parsed !== "object" ||
              parsed === null ||
              !("result" in parsed)
            ) {
              return Either.left({
                tag: "schemaInvalid",
                message: "result is required",
              });
            }
            return Either.right(parsed);
          } catch (error: unknown) {
            return Either.left({
              tag: "malformed",
              message: error instanceof Error ? error.message : String(error),
            });
          }
        };
        writeFileSync(
          resolve(root, "codex"),
          `#!/bin/sh\nprintf '{"type":"turn.completed"}\n'\nexec ${process.execPath} -e 'require("node:fs").writeFileSync(process.env.RAW_OUTPUT_PATH, process.env.RAW_OUTPUT_CONTENT)'\n`,
        );
        chmodSync(resolve(root, "codex"), 0o755);
        const result = await runCodexInvocation(input);
        expect(result).toMatchObject({
          tag: "failed",
          cause: { tag: "lastMessage", failureKind },
        });
        const ledger = parseModelInvocationLedgerEntry(
          JSON.parse(readFileSync(input.ledgerPath, "utf8")),
        );
        expect(ledger).toMatchObject({
          _tag: "Right",
          right: { result: { tag: "failed", failureKind } },
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  test("requires a candidate authority for composite comparison ledger rows", () => {
    const common = {
      schemaVersion: 4 as const,
      invocationId: "synthetic-invocation",
      model: "gpt-5.6-luna",
      reasoningEffort: "max",
      gitSha: "a".repeat(40),
      eventsSha256: "b".repeat(64),
      phase: "scenarioCompositeReview" as const,
      stagePlanReason: "Synthetic composite comparison.",
      startedAt: "2026-08-19T00:00:00.000Z",
      elapsedMilliseconds: 1,
      exit: { tag: "exited" as const, status: 0 },
      result: { tag: "succeeded" as const },
      usage: { tag: "unavailable" as const, reason: "synthetic" },
    };
    expect(
      Schema.decodeUnknownEither(CurrentModelInvocationLedgerEntrySchema, {
        onExcessProperty: "error",
      })({
        ...common,
        subject: {
          tag: "scenarioCampaign",
          campaignId: "synthetic-campaign",
          evidenceSetId: "synthetic-evidence",
          plannedScenarioId: "synthetic-scenario",
        },
      }),
    ).toMatchObject({ _tag: "Left" });
    expect(
      Schema.decodeUnknownEither(CurrentModelInvocationLedgerEntrySchema, {
        onExcessProperty: "error",
      })({
        ...common,
        subject: {
          tag: "scenarioCandidate",
          campaignId: "synthetic-campaign",
          evidenceSetId: "synthetic-evidence",
          candidateId: "synthetic-candidate",
          candidateScenarioSha256: "c".repeat(64),
          plannedScenarioId: "synthetic-scenario",
        },
      }),
    ).toMatchObject({ _tag: "Right" });
    const timedOut = {
      ...common,
      subject: {
        tag: "scenarioCandidate" as const,
        campaignId: "synthetic-campaign",
        evidenceSetId: "synthetic-evidence",
        candidateId: "synthetic-candidate",
        candidateScenarioSha256: "c".repeat(64),
        plannedScenarioId: "synthetic-scenario",
      },
      exit: {
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
      result: { tag: "failed" as const, reason: "Synthetic timeout." },
    };
    expect(
      Schema.decodeUnknownEither(CurrentModelInvocationLedgerEntryV4Schema, {
        onExcessProperty: "error",
      })(timedOut),
    ).toMatchObject({ _tag: "Left" });
    expect(
      Schema.decodeUnknownEither(CurrentModelInvocationLedgerEntryV5Schema, {
        onExcessProperty: "error",
      })({ ...timedOut, schemaVersion: 5 }),
    ).toMatchObject({ _tag: "Right" });
  });

  test("requires canonical startedAt values for current v4 telemetry", () => {
    const startedAt = "2026-08-19";
    const common = {
      schemaVersion: 4 as const,
      invocationId: "synthetic-invocation",
      model: "gpt-5.6-luna",
      reasoningEffort: "max",
      gitSha: "a".repeat(40),
      eventsSha256: "b".repeat(64),
      phase: "scenarioGeneration" as const,
      stagePlanReason: "The campaign requires scenario generation.",
      startedAt,
      elapsedMilliseconds: 1,
      exit: { tag: "exited" as const, status: 0 },
      result: { tag: "succeeded" as const },
      usage: { tag: "unavailable" as const, reason: "synthetic" },
      subject: {
        tag: "scenarioCampaign" as const,
        campaignId: "synthetic-campaign",
        evidenceSetId: "synthetic-evidence",
        plannedScenarioId: "synthetic-scenario",
      },
    };
    expect(
      Schema.decodeUnknownEither(CurrentModelInvocationLedgerEntrySchema, {
        onExcessProperty: "error",
      })(common),
    ).toMatchObject({ _tag: "Left" });
    expect(
      modelInvocationStartedEvent({
        subject: common.subject,
        gitSha: common.gitSha,
        phase: common.phase,
        stagePlanReason: common.stagePlanReason,
        fallbackInvocationId: "synthetic-fallback",
        model: common.model,
        reasoningEffort: common.reasoningEffort,
        startedAt,
      }),
    ).toMatchObject({ _tag: "Left" });
  });

  test("rejects v5-only output failure detail in historical v2, v3, and v4 records", () => {
    const failure = {
      tag: "failed" as const,
      reason: "The retained output was absent.",
      failureKind: "lastMessageMissing" as const,
    };
    const currentOutputFailure = {
      ...failure,
      operation: "expectedLastMessage" as const,
    };
    const historicalCommon = {
      scenarioId: "generated-battle-123",
      invocationId: "historical-invocation",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      gitSha: "a".repeat(40),
      eventsSha256: "b".repeat(64),
      stagePlanReason: "Historical invocation stage.",
      startedAt: "2026-08-14T00:00:00.000Z",
      elapsedMilliseconds: 1,
      exit: { tag: "exited" as const, status: 0 },
      usage: { tag: "unavailable" as const, reason: "synthetic" },
    };
    expect(
      Either.isLeft(
        parseModelInvocationLedgerEntry({
          schemaVersion: 2,
          ...historicalCommon,
          phase: "scenarioGeneration",
          stagePlanReason: "Historical generation.",
          result: failure,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        parseBenchmarkModelInvocationLedgerEntry({
          schemaVersion: 3,
          profile: "documentDeclarationSet",
          responsibility: "scenarioQuality",
          phase: "scenarioReadiness",
          ...historicalCommon,
          result: failure,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        parseBenchmarkModelInvocationLedgerEntry({
          schemaVersion: 5,
          profile: "documentDeclarationSet",
          responsibility: "scenarioQuality",
          phase: "scenarioReadiness",
          scenarioId: "current-scenario",
          ...historicalCommon,
          result: currentOutputFailure,
        }),
      ),
    ).toBe(true);

    const currentCommon = {
      schemaVersion: 4 as const,
      subject: {
        tag: "scenarioCampaign" as const,
        campaignId: "synthetic-campaign",
        evidenceSetId: "synthetic-evidence",
        plannedScenarioId: "synthetic-scenario",
      },
      invocationId: "current-invocation",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      gitSha: "a".repeat(40),
      eventsSha256: "b".repeat(64),
      phase: "scenarioGeneration" as const,
      stagePlanReason: "Current generation.",
      startedAt: "2026-08-14T00:00:00.000Z",
      elapsedMilliseconds: 1,
      exit: { tag: "exited" as const, status: 0 },
      result: failure,
      usage: { tag: "unavailable" as const, reason: "synthetic" },
    };
    expect(Either.isLeft(parseModelInvocationLedgerEntry(currentCommon))).toBe(
      true,
    );
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(CurrentModelInvocationLedgerEntryV5Schema, {
          onExcessProperty: "error",
        })({
          ...currentCommon,
          schemaVersion: 5,
          result: currentOutputFailure,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(CurrentModelInvocationLedgerEntryV5Schema, {
          onExcessProperty: "error",
        })({
          ...currentCommon,
          schemaVersion: 5,
          result: { ...failure, failureKind: "unknown" },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(CurrentModelInvocationLedgerEntryV5Schema, {
          onExcessProperty: "error",
        })({
          ...currentCommon,
          schemaVersion: 5,
          result: { ...failure, operation: "noOutput" },
        }),
      ),
    ).toBe(true);
  });

  test("reports signal delivery failure instead of claiming termination", () => {
    const falseDelivery = signalOwnedProcess(
      { pid: undefined, kill: () => false },
      "SIGTERM",
    );
    expect(falseDelivery).toEqual({
      tag: "notDelivered",
      signal: "SIGTERM",
      reason: "ChildProcess.kill returned false.",
    });

    const thrownDelivery = signalOwnedProcess(
      {
        pid: undefined,
        kill: () => {
          throw new Error("synthetic signal failure");
        },
      },
      "SIGKILL",
    );
    expect(thrownDelivery).toEqual({
      tag: "notDelivered",
      signal: "SIGKILL",
      reason: "ChildProcess.kill threw: synthetic signal failure",
    });
  });

  test("retains the first-party failure reason instead of only the process status", () => {
    const failureEvents = [
      { type: "error", message: "Synthetic wrapper failure." },
      {
        type: "turn.failed",
        error: { message: "Synthetic service capacity is exhausted." },
      },
    ] as const;
    const result = modelInvocationResultFromCodexEvents(
      { tag: "exited", status: 1 },
      failureEvents,
    );
    expect(result).toEqual(
      Either.right({
        tag: "failed",
        reason: "Synthetic service capacity is exhausted.",
      }),
    );
    expect(
      modelInvocationResultFromCodexEvents({ tag: "exited", status: 7 }, [
        { type: "turn.started" },
      ]),
    ).toEqual(
      Either.right({
        tag: "failed",
        reason: "Codex exited with status 7.",
      }),
    );
    expect(
      modelInvocationResultFromCodexEvents(
        { tag: "exited", status: 0 },
        failureEvents,
      ),
    ).toEqual(
      Either.left(
        "Codex emitted a first-party failure event but exited successfully.",
      ),
    );
    expect(
      modelInvocationResultFromCodexEvents({ tag: "exited", status: 0 }, []),
    ).toEqual(
      Either.left(
        "Codex exited successfully without a first-party turn.completed event.",
      ),
    );
    expect(
      modelInvocationResultFromCodexEvents({ tag: "exited", status: 1 }, [
        { type: "turn.failed", error: { message: 17 } },
      ]),
    ).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("malformed turn.failed event"),
    });

    const started = modelInvocationStartedEvent({
      subject: {
        tag: "scenarioCampaign",
        campaignId: "synthetic-campaign",
        evidenceSetId: "synthetic-evidence",
        plannedScenarioId: "synthetic-scenario",
      },
      gitSha: "a".repeat(40),
      phase: "scenarioGeneration",
      stagePlanReason: "The admitted plan requires scenario generation.",
      fallbackInvocationId: "synthetic-fallback",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      startedAt: "2026-08-19T00:00:00.000Z",
    });
    const completed = modelInvocationCompletedEvent({
      elapsedMilliseconds: 10,
      exit: { tag: "exited", status: 1 },
      result: Either.getOrThrow(result),
    });
    expect(Either.isRight(started)).toBe(true);
    expect(Either.isRight(completed)).toBe(true);
    if (Either.isLeft(started) || Either.isLeft(completed)) return;
    expect(
      modelInvocationEvidenceFromEvents([
        started.right,
        { type: "thread.started", thread_id: "synthetic-thread" },
        ...failureEvents,
        completed.right,
      ]),
    ).toMatchObject({
      tag: "valid",
      entry: {
        invocationId: "synthetic-thread",
        result: {
          tag: "failed",
          reason: "Synthetic service capacity is exhausted.",
        },
      },
    });
  });

  test("enforces JSON events for every Codex invocation", () => {
    expect(codexJsonArgs(["exec", "--model", "gpt-5.6-luna"])).toEqual([
      "exec",
      "--json",
      "--model",
      "gpt-5.6-luna",
    ]);
    expect(
      codexJsonArgs(["exec", "--json", "--model", "gpt-5.6-luna"]),
    ).toEqual(["exec", "--json", "--model", "gpt-5.6-luna"]);
  });

  test("binds ledger model metadata to the Codex command", () => {
    const args = [
      "exec",
      "-m",
      "gpt-5.6-luna",
      "-c",
      'model_reasoning_effort="max"',
    ];
    expect(
      codexInvocationMetadataMatchesArgs({
        args,
        model: "gpt-5.6-luna",
        reasoningEffort: "max",
      }),
    ).toBe(true);
    expect(
      codexInvocationMetadataMatchesArgs({
        args,
        model: "gpt-5.6-sol",
        reasoningEffort: "max",
      }),
    ).toBe(false);
    expect(
      codexInvocationMetadataMatchesArgs({
        args,
        model: "gpt-5.6-luna",
        reasoningEffort: "medium",
      }),
    ).toBe(false);
    expect(
      codexInvocationMetadataMatchesArgs({
        args: [...args, "-c", 'model_reasoning_effort="medium"'],
        model: "gpt-5.6-luna",
        reasoningEffort: "max",
      }),
    ).toBe(false);
  });

  test("retains first-party token dimensions independently", () => {
    expect(
      modelUsageFromCodexEvents([
        {
          type: "turn.completed",
          usage: {
            input_tokens: 100,
            cached_input_tokens: 70,
            output_tokens: 20,
            reasoning_output_tokens: 11,
          },
        },
        {
          type: "turn.completed",
          usage: {
            input_tokens: 50,
            cached_input_tokens: 20,
            output_tokens: 10,
            reasoning_output_tokens: 5,
          },
        },
      ]),
    ).toEqual({
      tag: "available",
      input: { tag: "available", count: 150 },
      cachedInput: { tag: "available", count: 90 },
      cacheWriteInput: { tag: "unavailable" },
      output: { tag: "available", count: 30 },
      reasoningOutput: { tag: "available", count: 16 },
    });
  });

  test("does not turn missing usage into zero", () => {
    expect(modelUsageFromCodexEvents([{ type: "turn.completed" }])).toEqual({
      tag: "unavailable",
      reason:
        "The first-party event stream exposed no turn.completed usage object.",
    });
  });

  test("parses strict invocation ledger entries for downstream evidence", () => {
    const entry = {
      schemaVersion: 4,
      subject: {
        tag: "execution",
        executionId: "synthetic-execution",
        evidenceSetId: "synthetic-evidence",
        scenarioId: "synthetic-model-telemetry-scenario",
      },
      gitSha: "a".repeat(40),
      eventsSha256: "b".repeat(64),
      phase: "player",
      stagePlanReason: "The admitted plan requires player execution.",
      invocationId: "invocation-1",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      startedAt: "2026-08-14T00:00:00.000Z",
      elapsedMilliseconds: 1_000,
      exit: { tag: "exited", status: 0 },
      result: { tag: "succeeded" },
      usage: { tag: "unavailable", reason: "event stream omitted usage" },
    };
    const parsed = parseModelInvocationLedgerEntry(entry);
    expect(Either.isRight(parsed)).toBe(true);
    if (Either.isLeft(parsed)) return;
    expect(parsed.right.invocationId).toBe("invocation-1");

    expect(
      Either.isLeft(
        parseModelInvocationLedgerEntry({ ...entry, unexpected: true }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        parseModelInvocationLedgerEntry({
          ...entry,
          exit: { tag: "exited", status: 1 },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        parseModelInvocationLedgerEntry({
          ...entry,
          exit: { tag: "shellStatus", status: 0 },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        parseModelInvocationLedgerEntry({
          ...entry,
          schemaVersion: 1,
          stagePlanReason: undefined,
          result: undefined,
        }),
      ),
    ).toBe(false);
    expect(
      Either.isRight(
        parseModelInvocationLedgerEntry({
          schemaVersion: 1,
          scenarioId: entry.subject.scenarioId,
          gitSha: entry.gitSha,
          eventsSha256: entry.eventsSha256,
          phase: entry.phase,
          invocationId: entry.invocationId,
          model: entry.model,
          reasoningEffort: entry.reasoningEffort,
          startedAt: entry.startedAt,
          elapsedMilliseconds: entry.elapsedMilliseconds,
          exit: entry.exit,
          usage: entry.usage,
        }),
      ),
    ).toBe(true);
  });

  test("keeps generated sequence identities readable only as historical v1/v2 evidence", () => {
    const historicalScenarioId = decodeHistoricalScenarioId(
      "generated-battle-123",
    );
    expect(Either.isRight(historicalScenarioId)).toBe(true);
    expect(Either.isLeft(decodeScenarioId("generated-battle-123"))).toBe(true);
    const common = {
      scenarioId: "generated-battle-123",
      gitSha: "a".repeat(40),
      eventsSha256: "b".repeat(64),
      invocationId: "historical-invocation",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      startedAt: "2026-08-14T00:00:00.000Z",
      elapsedMilliseconds: 1,
      exit: { tag: "exited" as const, status: 0 },
      usage: { tag: "unavailable" as const, reason: "historical fixture" },
    };
    expect(
      Either.isRight(
        parseModelInvocationLedgerEntry({
          schemaVersion: 1,
          ...common,
          phase: "scenarioReadiness",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        parseModelInvocationLedgerEntry({
          schemaVersion: 2,
          ...common,
          phase: "scenarioCompositeReview",
          stagePlanReason:
            "Historical fixture retained before lifecycle subjects.",
          result: { tag: "succeeded" },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        parseModelInvocationLedgerEntry({
          schemaVersion: 1,
          ...common,
          phase: "scenarioReadiness",
          exit: {
            tag: "timedOut",
            timeoutMilliseconds: 25,
            termination: "sigkill",
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        parseModelInvocationLedgerEntry({
          schemaVersion: 2,
          ...common,
          phase: "scenarioCompositeReview",
          stagePlanReason:
            "Historical fixture retained before lifecycle subjects.",
          result: { tag: "failed", reason: "timed out" },
          exit: {
            tag: "timedOut",
            timeoutMilliseconds: 25,
            termination: "sigkill",
          },
        }),
      ),
    ).toBe(true);
  });

  test("rederives invocation identity and runner-owned timing from events", () => {
    const started = modelInvocationStartedEvent({
      subject: {
        tag: "execution",
        executionId: "execution",
        evidenceSetId: "evidence",
        scenarioId: Schema.decodeUnknownSync(ScenarioIdSchema)("scenario"),
      },
      gitSha: Schema.decodeUnknownSync(GitShaSchema)("a".repeat(40)),
      phase: "postPlayReview",
      stagePlanReason: "The admitted plan requires post-play review.",
      fallbackInvocationId: "fallback",
      model: "gpt-5.6-luna",
      reasoningEffort: "max",
      startedAt: "2026-08-14T00:00:00.000Z",
    });
    const completed = modelInvocationCompletedEvent({
      elapsedMilliseconds: 123,
      exit: { tag: "exited", status: 0 },
      result: { tag: "succeeded" },
    });
    expect(Either.isRight(started)).toBe(true);
    expect(Either.isRight(completed)).toBe(true);
    if (Either.isLeft(started) || Either.isLeft(completed)) return;
    const events = [
      started.right,
      { type: "thread.started", thread_id: "thread" },
      {
        type: "turn.completed",
        usage: {
          input_tokens: 10,
          cached_input_tokens: 2,
          cache_write_input_tokens: 0,
          output_tokens: 3,
          reasoning_output_tokens: 1,
        },
      },
      completed.right,
    ];
    expect(modelInvocationEvidenceFromEvents(events)).toMatchObject({
      tag: "valid",
      entry: {
        schemaVersion: 4,
        phase: "postPlayReview",
        stagePlanReason: "The admitted plan requires post-play review.",
        invocationId: "thread",
        model: "gpt-5.6-luna",
        reasoningEffort: "max",
        elapsedMilliseconds: 123,
        exit: { tag: "exited", status: 0 },
        result: { tag: "succeeded" },
        usage: { tag: "available", input: { count: 10 } },
      },
    });
    const currentEvidence = modelInvocationEvidenceFromEvents(events);
    if (currentEvidence.tag === "valid") {
      expect(currentEvidence.entry).toEqual(
        expect.objectContaining({
          schemaVersion: 4,
          stagePlanReason: expect.any(String),
          result: expect.objectContaining({ tag: "succeeded" }),
        }),
      );
    }
    expect(modelInvocationEvidenceFromEvents(events.slice(1))).toMatchObject({
      tag: "invalid",
    });
  });

  test("rejects malformed recognized runner events while ignoring unknown Codex events", () => {
    const started = modelInvocationStartedEvent({
      subject: {
        tag: "execution",
        executionId: "execution",
        evidenceSetId: "evidence",
        scenarioId: "scenario",
      },
      gitSha: "a".repeat(40),
      phase: "player",
      stagePlanReason: "The admitted stage requires player execution.",
      fallbackInvocationId: "fallback",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      startedAt: "2026-08-14T00:00:00.000Z",
    });
    const completed = modelInvocationCompletedEvent({
      elapsedMilliseconds: 10,
      exit: { tag: "exited", status: 0 },
      result: { tag: "succeeded" },
    });
    expect(Either.isRight(started)).toBe(true);
    expect(Either.isRight(completed)).toBe(true);
    if (Either.isLeft(started) || Either.isLeft(completed)) return;
    const valid = modelInvocationEvidenceFromEvents([
      started.right,
      { type: "thread.started", thread_id: "thread" },
      completed.right,
    ]);
    expect(valid.tag).toBe("valid");

    const malformedStarted = modelInvocationEvidenceFromEvents([
      { ...started.right, stagePlanReason: "" },
      completed.right,
    ]);
    expect(malformedStarted).toMatchObject({
      tag: "invalid",
      message: expect.stringContaining(
        "Recognized raw-swarm.invocation.started event",
      ),
    });

    const malformedCompleted = modelInvocationEvidenceFromEvents([
      started.right,
      {
        ...completed.right,
        result: { tag: "succeeded" },
        exit: { tag: "exited", status: 1 },
      },
    ]);
    expect(malformedCompleted).toMatchObject({
      tag: "invalid",
      message: expect.stringContaining(
        "Recognized raw-swarm.invocation.completed event",
      ),
    });
  });

  test("requires positive first-party terminal evidence for v5 success", () => {
    const started = {
      type: "raw-swarm.invocation.started",
      schemaVersion: 5,
      subject: {
        tag: "execution",
        executionId: "execution",
        evidenceSetId: "evidence",
        scenarioId: "scenario",
      },
      gitSha: "a".repeat(40),
      phase: "postPlayReview",
      stagePlanReason: "The admitted plan requires post-play review.",
      fallbackInvocationId: "fallback",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      startedAt: "2026-08-14T00:00:00.000Z",
    } as const;
    const completed = {
      type: "raw-swarm.invocation.completed",
      schemaVersion: 5,
      elapsedMilliseconds: 10,
      exit: { tag: "exited", status: 0 },
      result: { tag: "succeeded" },
    } as const;
    expect(modelInvocationEvidenceFromEvents([started, completed])).toEqual({
      tag: "invalid",
      message:
        "Successful v5 invocation evidence requires a first-party turn.completed event.",
    });
    expect(
      modelInvocationEvidenceFromEvents([
        started,
        { type: "turn.failed", error: { message: "Synthetic failure." } },
        { type: "turn.completed" },
        completed,
      ]),
    ).toEqual({
      tag: "invalid",
      message:
        "Successful v5 invocation evidence cannot include a first-party failure event.",
    });

    const benchmarkStarted = {
      type: "raw-swarm.invocation.started",
      schemaVersion: 5,
      profile: "documentDeclarationSet",
      responsibility: "scenarioQuality",
      phase: "scenarioReadiness",
      scenarioId: "scenario",
      gitSha: "a".repeat(40),
      stagePlanReason: "The retained benchmark quality pass.",
      fallbackInvocationId: "benchmark-fallback",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      startedAt: "2026-08-14T00:00:00.000Z",
    } as const;
    const benchmarkCompleted = {
      type: "raw-swarm.invocation.completed",
      schemaVersion: 5,
      elapsedMilliseconds: 10,
      exit: { tag: "exited", status: 0 },
      result: { tag: "succeeded" },
    } as const;
    expect(
      benchmarkModelInvocationEvidenceFromEvents([
        benchmarkStarted,
        benchmarkCompleted,
      ]),
    ).toEqual({
      tag: "invalid",
      message:
        "Successful v5 benchmark evidence requires a first-party turn.completed event.",
    });
    expect(
      benchmarkModelInvocationEvidenceFromEvents([
        benchmarkStarted,
        { type: "turn.failed", error: { message: "Synthetic failure." } },
        { type: "turn.completed" },
        benchmarkCompleted,
      ]),
    ).toEqual({
      tag: "invalid",
      message:
        "Successful v5 benchmark evidence cannot include a first-party failure event.",
    });
  });

  test("binds v2 results to exited and shell status outcomes", () => {
    const success = {
      elapsedMilliseconds: 1,
      exit: { tag: "exited", status: 0 },
      result: { tag: "succeeded" },
    } as const;
    expect(Either.isRight(modelInvocationCompletedEvent(success))).toBe(true);
    expect(
      Either.isRight(
        modelInvocationCompletedEvent({
          elapsedMilliseconds: 1,
          exit: { tag: "shellStatus", status: 0 },
          result: { tag: "succeeded" },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        modelInvocationCompletedEvent({
          ...success,
          exit: { tag: "exited", status: 1 },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        modelInvocationCompletedEvent({
          ...success,
          exit: { tag: "shellStatus", status: 1 },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        modelInvocationCompletedEvent({
          ...success,
          result: { tag: "failed", reason: "unexpected success" },
        }),
      ),
    ).toBe(true);
  });

  test("keeps historical v1 events distinct from current v2 evidence", () => {
    const legacy = modelInvocationEvidenceFromEvents([
      {
        type: "raw-swarm.invocation.started",
        schemaVersion: 1,
        scenarioId: "scenario",
        gitSha: "a".repeat(40),
        phase: "player",
        fallbackInvocationId: "legacy",
        model: "gpt-5.6-sol",
        reasoningEffort: "medium",
        startedAt: "2026-08-14T00:00:00.000Z",
      },
      {
        type: "raw-swarm.invocation.completed",
        schemaVersion: 1,
        elapsedMilliseconds: 5,
        exit: { tag: "exited", status: 0 },
      },
    ]);
    expect(legacy).toMatchObject({
      tag: "valid",
      entry: { schemaVersion: 1 },
    });
    const current = modelInvocationStartedEvent({
      subject: {
        tag: "execution",
        executionId: "execution",
        evidenceSetId: "evidence",
        scenarioId: "scenario",
      },
      gitSha: "a".repeat(40),
      phase: "player",
      stagePlanReason: "The admitted stage requires player execution.",
      fallbackInvocationId: "current",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      startedAt: "2026-08-14T00:00:00.000Z",
    });
    expect(current).toMatchObject({
      _tag: "Right",
      right: { schemaVersion: 4, stagePlanReason: expect.any(String) },
    });
    const historicalReadiness = modelInvocationEvidenceFromEvents([
      {
        type: "raw-swarm.invocation.started",
        schemaVersion: 1,
        scenarioId: "scenario",
        gitSha: "a".repeat(40),
        phase: "scenarioReadiness",
        fallbackInvocationId: "historical-readiness",
        model: "gpt-5.6-sol",
        reasoningEffort: "medium",
        startedAt: "2026-08-14T00:00:00.000Z",
      },
      {
        type: "raw-swarm.invocation.completed",
        schemaVersion: 1,
        elapsedMilliseconds: 5,
        exit: { tag: "exited", status: 0 },
      },
    ]);
    expect(historicalReadiness).toMatchObject({
      tag: "valid",
      entry: { schemaVersion: 1, phase: "scenarioReadiness" },
    });
    expect(
      modelInvocationStartedEvent({
        subject: { tag: "scenario", scenarioId: "scenario" },
        gitSha: "a".repeat(40),
        phase: "scenarioReadiness",
        stagePlanReason: "Readiness is historical only.",
        fallbackInvocationId: "current-readiness",
        model: "gpt-5.6-sol",
        reasoningEffort: "medium",
        startedAt: "2026-08-14T00:00:00.000Z",
      }),
    ).toMatchObject({ _tag: "Left" });
  });

  test("returns parse failures instead of throwing for invalid event primitives", () => {
    expect(
      modelInvocationStartedEvent({
        subject: { tag: "scenario", scenarioId: "" },
        gitSha: "not-a-sha",
        phase: "not-a-phase",
        fallbackInvocationId: "",
        model: "",
        reasoningEffort: "",
        startedAt: "not-a-date",
      }),
    ).toMatchObject({ _tag: "Left" });
    expect(
      modelInvocationCompletedEvent({
        elapsedMilliseconds: -1,
        exit: { tag: "exited", status: "not-a-number" },
      }),
    ).toMatchObject({ _tag: "Left" });
  });

  test("keeps benchmark auxiliary responsibilities outside production v2", () => {
    const readiness = {
      schemaVersion: 3,
      profile: "documentDeclarationSet",
      responsibility: "scenarioQuality",
      phase: "scenarioReadiness",
      scenarioId: "scenario",
      gitSha: "a".repeat(40),
      eventsSha256: "b".repeat(64),
      stagePlanReason: "The benchmark retained the historical quality pass.",
      invocationId: "readiness",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      startedAt: "2026-08-14T00:00:00.000Z",
      elapsedMilliseconds: 5,
      exit: { tag: "exited", status: 0 },
      result: { tag: "succeeded" },
      usage: { tag: "unavailable", reason: "historical event stream" },
    } as const;
    expect(Either.isLeft(parseModelInvocationLedgerEntry(readiness))).toBe(
      true,
    );
    const parsed = parseBenchmarkModelInvocationLedgerEntry(readiness);
    expect(Either.isRight(parsed)).toBe(true);
    if (Either.isLeft(parsed)) return;
    expect(parsed.right).toMatchObject({
      schemaVersion: 3,
      profile: "documentDeclarationSet",
      responsibility: "scenarioQuality",
      phase: "scenarioReadiness",
      result: { tag: "succeeded" },
    });

    const character = {
      ...readiness,
      responsibility: "redundantCharacterPreparation" as const,
      phase: "scenarioCharacterAuthoring" as const,
      invocationId: "character-authoring-1",
    };
    expect(parseBenchmarkModelInvocationLedgerEntry(character)).toMatchObject({
      _tag: "Right",
      right: {
        responsibility: "redundantCharacterPreparation",
        phase: "scenarioCharacterAuthoring",
      },
    });
  });

  test("derives benchmark auxiliary result and identity from schema-3 events", () => {
    const started = benchmarkModelInvocationStartedEvent({
      scenarioId: "scenario",
      gitSha: "a".repeat(40),
      profile: "documentDeclarationSet",
      responsibility: "redundantCharacterPreparation",
      phase: "scenarioCharacterAuthoring",
      stagePlanReason: "The baseline retained document declarations.",
      fallbackInvocationId: "fallback",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      startedAt: "2026-08-14T00:00:00.000Z",
    });
    const completed = benchmarkModelInvocationCompletedEvent({
      elapsedMilliseconds: 123,
      exit: { tag: "exited", status: 0 },
      result: { tag: "succeeded" },
    });
    expect(Either.isRight(started)).toBe(true);
    expect(Either.isRight(completed)).toBe(true);
    if (Either.isLeft(started) || Either.isLeft(completed)) return;
    const evidence = benchmarkModelInvocationEvidenceFromEvents([
      started.right,
      { type: "thread.started", thread_id: "benchmark-thread" },
      {
        type: "turn.completed",
        usage: {
          input_tokens: 10,
          cached_input_tokens: 2,
          cache_write_input_tokens: 0,
          output_tokens: 3,
          reasoning_output_tokens: 1,
        },
      },
      completed.right,
    ]);
    expect(
      modelInvocationEvidenceFromEvents([started.right, completed.right]),
    ).toMatchObject({ tag: "invalid" });
    expect(evidence).toMatchObject({
      tag: "valid",
      entry: {
        schemaVersion: 3,
        profile: "documentDeclarationSet",
        responsibility: "redundantCharacterPreparation",
        phase: "scenarioCharacterAuthoring",
        invocationId: "benchmark-thread",
        result: { tag: "succeeded" },
        usage: { tag: "available", input: { count: 10 } },
      },
    });
    const currentEvidence = benchmarkModelInvocationEvidenceFromEvents([
      {
        type: "raw-swarm.invocation.started",
        schemaVersion: 5,
        profile: "documentDeclarationSet",
        responsibility: "scenarioQuality",
        phase: "scenarioReadiness",
        scenarioId: "scenario",
        gitSha: "a".repeat(40),
        stagePlanReason: "The current benchmark retained the quality pass.",
        fallbackInvocationId: "current-fallback",
        model: "gpt-5.6-luna",
        reasoningEffort: "max",
        startedAt: "2026-08-14T00:00:00.000Z",
      },
      {
        type: "raw-swarm.invocation.completed",
        schemaVersion: 5,
        elapsedMilliseconds: 123,
        exit: {
          tag: "timedOut",
          timeoutMilliseconds: 25,
          termination: {
            tag: "reaped",
            signalDelivery: { tag: "confirmed", signal: "SIGKILL" },
          },
        },
        result: { tag: "failed", reason: "Synthetic timeout." },
      },
    ]);
    expect(currentEvidence).toMatchObject({
      tag: "valid",
      entry: {
        schemaVersion: 5,
        responsibility: "scenarioQuality",
        exit: {
          tag: "timedOut",
          termination: {
            tag: "reaped",
            signalDelivery: { tag: "confirmed", signal: "SIGKILL" },
          },
        },
        result: { tag: "failed" },
      },
    });
  });
});
