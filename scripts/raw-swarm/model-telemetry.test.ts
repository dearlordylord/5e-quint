import { spawnSync } from "node:child_process";
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
  CurrentModelInvocationLedgerEntrySchema,
  runCodexInvocation,
} from "./model-telemetry.ts";
import {
  decodeHistoricalScenarioId,
  decodeScenarioId,
  GitShaSchema,
  repoRoot,
  ScenarioIdSchema,
} from "./transcript.ts";

const modelTelemetryCli = resolve(
  repoRoot,
  "scripts/raw-swarm/model-telemetry-cli.ts",
);

describe("Raw Swarm model invocation telemetry", () => {
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
      ] as [string, ...string[]],
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
      expectedLastMessage: {
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
    };
  }

  test("retains timeout telemetry and a failed result when a child stalls without output", () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-timeout-"));
    const codex = resolve(root, "codex");
    writeFileSync(
      codex,
      `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} -e 'setTimeout(() => {}, 1000)'\n`,
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root, 25);
      const result = runCodexInvocation(input);
      expect(result.invocationResult).toMatchObject({
        tag: "failed",
        reason: expect.stringContaining("timed out"),
      });
      const events = readCodexEvents(input.eventPath);
      expect(events.tag).toBe("valid");
      if (events.tag === "valid") {
        expect(events.events.at(-1)).toMatchObject({
          type: "raw-swarm.invocation.completed",
          exit: { tag: "timedOut", timeoutMilliseconds: 25 },
          result: { tag: "failed" },
        });
      }
      const ledger = parseModelInvocationLedgerEntry(
        JSON.parse(readFileSync(input.ledgerPath, "utf8")),
      );
      expect(ledger).toMatchObject({
        _tag: "Right",
        right: {
          exit: { tag: "timedOut", timeoutMilliseconds: 25 },
          result: { tag: "failed" },
        },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("retains a failed result when a child exits zero without creating output", () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-missing-output-"));
    const codex = resolve(root, "codex");
    writeFileSync(codex, "#!/bin/sh\nexit 0\n");
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root);
      const result = runCodexInvocation(input);
      expect(result.invocationResult).toMatchObject({
        tag: "failed",
        failureKind: "lastMessageMissing",
        reason: expect.stringContaining("does not exist"),
      });
      expect(result.status).toBe(0);
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

  test("retains a schema-decoded last message before recording success", () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-model-valid-output-"));
    const codex = resolve(root, "codex");
    writeFileSync(
      codex,
      `#!/bin/sh
exec ${process.execPath} -e 'require("node:fs").writeFileSync(process.env.RAW_OUTPUT_PATH, JSON.stringify({result:"ready"}))'
`,
    );
    chmodSync(codex, 0o755);
    try {
      const input = fakeInvocationInput(root);
      input.env.RAW_OUTPUT_PATH = input.expectedLastMessage.path;
      input.expectedLastMessage.decode = jsonModelInvocationLastMessageDecoder(
        Schema.Struct({ result: Schema.Literal("ready") }),
      );
      const result = runCodexInvocation(input);
      expect(result.invocationResult).toEqual({ tag: "succeeded" });
      expect(result.decodedLastMessage).toEqual({ result: "ready" });
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
    (_label, contents, failureKind) => {
      const root = mkdtempSync(resolve(tmpdir(), "dnd-model-output-failure-"));
      try {
        const input = fakeInvocationInput(root);
        input.env.RAW_OUTPUT_PATH = input.expectedLastMessage.path;
        input.env.RAW_OUTPUT_CONTENT = contents;
        input.expectedLastMessage.decode = (value: string) => {
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
          `#!/bin/sh\nexec ${process.execPath} -e 'require("node:fs").writeFileSync(process.env.RAW_OUTPUT_PATH, process.env.RAW_OUTPUT_CONTENT)'\n`,
        );
        chmodSync(resolve(root, "codex"), 0o755);
        const result = runCodexInvocation(input);
        expect(result.invocationResult).toMatchObject({
          tag: "failed",
          failureKind,
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
        "Codex emitted a terminal failure event but exited successfully.",
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

  test("binds the shell telemetry CLI to first-party failure semantics", () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), "dnd-telemetry-cli-"));
    const eventsPath = resolve(temporaryRoot, "events.jsonl");
    const ledgerPath = resolve(temporaryRoot, "ledger.jsonl");
    const args = (
      status: number,
      startedAt = "2026-08-19T00:00:00.000Z",
      eventFile = eventsPath,
      ledgerFile = ledgerPath,
    ) => [
      "exec",
      "tsx",
      modelTelemetryCli,
      "--phase",
      "postPlayReview",
      "--scenario-id",
      "synthetic-scenario",
      "--execution-id",
      "synthetic-execution",
      "--evidence-set-id",
      "synthetic-evidence",
      "--git-sha",
      "a".repeat(40),
      "--events",
      eventFile,
      "--ledger",
      ledgerFile,
      "--model",
      "gpt-5.6-luna",
      "--reasoning-effort",
      "max",
      "--started-at",
      startedAt,
      "--elapsed-ms",
      "10",
      "--shell-status",
      String(status),
    ];
    try {
      writeFileSync(
        eventsPath,
        `${JSON.stringify({
          type: "turn.failed",
          error: { message: "Synthetic service capacity is exhausted." },
        })}\n`,
      );
      const failed = spawnSync("pnpm", args(1), {
        cwd: repoRoot,
        encoding: "utf8",
      });
      expect(failed.status).toBe(0);
      expect(JSON.parse(readFileSync(ledgerPath, "utf8"))).toMatchObject({
        exit: { tag: "shellStatus", status: 1 },
        result: {
          tag: "failed",
          reason: "Synthetic service capacity is exhausted.",
        },
      });

      const invalidEventsPath = resolve(temporaryRoot, "invalid-events.jsonl");
      const invalidLedgerPath = resolve(temporaryRoot, "invalid-ledger.jsonl");
      writeFileSync(
        invalidEventsPath,
        `${JSON.stringify({
          type: "turn.failed",
          error: { message: "Synthetic malformed timestamp input." },
        })}\n`,
      );
      const invalidStartedAt = spawnSync(
        "pnpm",
        args(1, "2026-08-19", invalidEventsPath, invalidLedgerPath),
        {
          cwd: repoRoot,
          encoding: "utf8",
        },
      );
      expect(invalidStartedAt.status).not.toBe(0);
      expect(`${invalidStartedAt.stdout}${invalidStartedAt.stderr}`).toContain(
        "startedAt must be a canonical ISO timestamp",
      );
      expect(existsSync(invalidLedgerPath)).toBe(false);

      rmSync(eventsPath);
      rmSync(ledgerPath);
      writeFileSync(
        eventsPath,
        `${JSON.stringify({
          type: "turn.failed",
          error: { message: "Synthetic contradictory failure." },
        })}\n`,
      );
      const contradictory = spawnSync("pnpm", args(0), {
        cwd: repoRoot,
        encoding: "utf8",
      });
      expect(contradictory.status).not.toBe(0);
      expect(existsSync(ledgerPath)).toBe(false);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
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
    if (Either.isRight(currentEvidence)) {
      expect(currentEvidence.right.entry).toEqual(
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
  });
});
