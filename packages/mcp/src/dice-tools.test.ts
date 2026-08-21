import { Either, Random, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  createMcpApplicationServices,
  createMcpPlaySessionRoot,
} from "./composition-root.ts";
import { decodeDiceToolCall, RollDiceArgsSchema } from "./dice-tool-input.ts";
import { handleDiceToolCall, rollDice } from "./dice-tools.ts";
import { jsonContentPayload } from "./tool-content.ts";

const request = {
  groups: [
    { dice: 2, dieSize: 6 },
    { dice: 1, dieSize: 4 },
  ],
} as const;

describe("structured MCP bulk dice roller", () => {
  test("rejects empty groups and caller correlation/idempotency fields", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(RollDiceArgsSchema)({ groups: [] }),
      ),
    ).toBe(true);

    const decoded = decodeDiceToolCall({
      name: "roll_dice",
      args: { ...request, correlationId: "caller-supplied" },
    });
    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("returns ordered visible faces in each requested group", () => {
    const result = rollDice(request, Random.fixed([1, 2, 3]));

    expect(result.groups).toEqual([
      { dice: 2, dieSize: 6, results: [1, 2] },
      { dice: 1, dieSize: 4, results: [3] },
    ]);
    expect(result.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    for (const group of result.groups) {
      expect(group.results).toHaveLength(group.dice);
      for (const face of group.results) {
        expect(face).toBeGreaterThanOrEqual(1);
        expect(face).toBeLessThanOrEqual(group.dieSize);
      }
    }
  });

  test("reproduces a seeded sequence while separate streams remain isolated", () => {
    const first = Random.make("dice-seed");
    const second = Random.make("dice-seed");

    const firstCall = rollDice(request, first);
    const secondCall = rollDice(request, first);
    const isolatedCall = rollDice(request, second);

    expect(firstCall.groups).toEqual(isolatedCall.groups);
    expect(secondCall.groups).not.toEqual(firstCall.groups);
    expect(secondCall.correlationId).not.toBe(firstCall.correlationId);
  });

  test("does not read or mutate Battle pending-fill state", () => {
    const services = createMcpApplicationServices();
    const root = createMcpPlaySessionRoot(
      services,
      services.configuredAdminMirrorSessionId,
      Random.fixed([1]),
    );
    const before = root.sessionStore.snapshot();
    const content = handleDiceToolCall(root, {
      name: "roll_dice",
      args: request,
    });

    expect(jsonContentPayload(content)).toMatchObject({
      groups: [
        { dice: 2, dieSize: 6, results: [1, 1] },
        { dice: 1, dieSize: 4, results: [1] },
      ],
    });
    expect(root.sessionStore.snapshot()).toEqual(before);
    expect(root.sessionStore.pendingBattleFills).toBeNull();
  });
});
