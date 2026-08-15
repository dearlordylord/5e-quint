import { describe, expect, test } from "vitest";

import { modelUsageFromCodexEvents } from "./model-telemetry.ts";

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
});
