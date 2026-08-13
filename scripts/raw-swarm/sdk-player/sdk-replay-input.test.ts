import { describe, expect, test } from "vitest";

import { decodeSdkCallInput } from "./sdk-replay-input.ts";

describe("SDK replay input", () => {
  test("decodes an ordinary scenario Movement route", () => {
    expect(
      decodeSdkCallInput({
        operation: "resolveScenarioMovement",
        input: {
          kind: "route",
          subject: {
            tag: "runtimeCommand",
            actorId: "goblin-warrior",
            command: "move",
          },
          route: [{ x: 2, y: 3 }],
          speedKind: "walk",
          fills: [],
        },
      }),
    ).toMatchObject({
      tag: "valid",
      value: {
        operation: "resolveScenarioMovement",
        input: {
          kind: "route",
          subject: { command: "move" },
          route: [{ x: 2, y: 3 }],
          speedKind: "walk",
        },
      },
    });
  });

  test("decodes a pending scenario Movement continuation without route restatement", () => {
    expect(
      decodeSdkCallInput({
        operation: "resolveScenarioMovement",
        input: { kind: "continue", fills: [] },
      }),
    ).toStrictEqual({
      tag: "valid",
      value: {
        operation: "resolveScenarioMovement",
        input: { kind: "continue", fills: [] },
      },
    });
  });

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
