import { describe, expect, test } from "vitest";

import { playerRandomForContinuation } from "./player-random.ts";

describe("SDK player retained randomness", () => {
  test("reproduces named dice from the retained seed and continuation", () => {
    const seed = "0".repeat(64);
    const first = playerRandomForContinuation(seed, 1);
    const replay = playerRandomForContinuation(seed, 1);

    expect(first.rollDie({ draw: "attack", sides: 20 })).toBe(11);
    expect(replay.rollDie({ draw: "attack", sides: 20 })).toBe(11);
    expect(first.rollDie({ draw: "damage", sides: 20 })).toBe(9);
    expect(
      playerRandomForContinuation(seed, 2).rollDie({
        draw: "attack",
        sides: 20,
      }),
    ).toBe(1);
  });
});
