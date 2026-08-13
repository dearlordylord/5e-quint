import { describe, expect, test } from "vitest";

import { decodeSdkCallInput } from "./sdk-replay-input.ts";

describe("SDK replay input", () => {
  test("accepts the omitted optional End Turn fills recorded by the tracer", () => {
    expect(
      decodeSdkCallInput({
        operation: "endBattleRuntimeTurn",
        input: { actorId: "goblin-warrior" },
      }),
    ).toStrictEqual({
      tag: "valid",
      value: {
        operation: "endBattleRuntimeTurn",
        input: { actorId: "goblin-warrior" },
      },
    });
  });
});
