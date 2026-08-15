import { describe, expect, test } from "vitest";

import { reviewInvocationPolicy } from "./review-invocation-policy.ts";

function command(value: string) {
  return {
    type: "item.completed",
    item: {
      type: "command_execution",
      command: value,
      aggregated_output: "",
    },
  };
}

describe("review invocation policy", () => {
  test("accepts a direct response", () => {
    expect(reviewInvocationPolicy([{ type: "turn.completed" }])).toEqual({
      tag: "valid",
    });
  });

  test("rejects commands and tools", () => {
    expect(
      reviewInvocationPolicy([command('/bin/bash -lc "rg -n attack ."')]),
    ).toEqual({
      tag: "invalid",
      message:
        "Reviewer invocation used a tool instead of the evidence packet.",
    });
    expect(
      reviewInvocationPolicy([
        {
          type: "item.started",
          item: { type: "command_execution", command: "rg evidence" },
        },
      ]),
    ).toMatchObject({ tag: "invalid" });
    expect(
      reviewInvocationPolicy([
        {
          type: "item.completed",
          item: { type: "mcp_tool_call", name: "unrelated" },
        },
      ]),
    ).toEqual({
      tag: "invalid",
      message:
        "Reviewer invocation used a tool instead of the evidence packet.",
    });
  });
});
