import { describe, expect, test } from "vitest";

import { Either, Schema } from "effect";

import {
  codexInvocationMetadataMatchesArgs,
  codexJsonArgs,
  modelInvocationCompletedEvent,
  modelInvocationEvidenceFromEvents,
  modelInvocationStartedEvent,
  modelUsageFromCodexEvents,
  parseModelInvocationLedgerEntry,
} from "./model-telemetry.ts";
import { GitShaSchema, ScenarioIdSchema } from "./transcript.ts";

describe("Raw Swarm model invocation telemetry", () => {
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
      schemaVersion: 2,
      scenarioId: "generated-battle-test",
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
          scenarioId: entry.scenarioId,
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

  test("rederives invocation identity and runner-owned timing from events", () => {
    const started = modelInvocationStartedEvent({
      scenarioId: Schema.decodeUnknownSync(ScenarioIdSchema)("scenario"),
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
        schemaVersion: 2,
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
          schemaVersion: 2,
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
      scenarioId: "scenario",
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
      scenarioId: "scenario",
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
      right: { schemaVersion: 2, stagePlanReason: expect.any(String) },
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
        scenarioId: "scenario",
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
        scenarioId: "",
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
});
