import { describe, expect, test } from "vitest";

import { Either } from "effect";

import {
  modelUsageFromCodexEvents,
  parseModelInvocationLedgerEntry,
} from "./model-telemetry.ts";

describe("Raw Swarm model invocation telemetry", () => {
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
      schemaVersion: 1,
      phase: "player",
      invocationId: "invocation-1",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      startedAt: "2026-08-14T00:00:00.000Z",
      elapsedMilliseconds: 1_000,
      exit: { tag: "exited", status: 0 },
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
  });
});
