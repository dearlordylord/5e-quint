import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  BattleFillSchema,
  BattleHoleSchema,
} from "./battle-reducer/battle-codecs.ts";

const foundationHole = {
  holeInstanceKey: "battle:gh377:foundation-target",
  holeId: "battle:gh377:foundation-target",
  label: "Choose a target",
  kind: "targetChoice",
  choices: ["combatant:source", "combatant:target"],
};

const foundationFill = {
  kind: "targetChoice",
  holeId: foundationHole.holeId,
  value: "combatant:target",
};

describe("GH-377 battle protocol codecs", () => {
  test("round-trips the smallest target-choice hole/fill pair with ordering and identity", () => {
    const decodedHole =
      Schema.decodeUnknownResult(BattleHoleSchema)(foundationHole);
    const decodedFill =
      Schema.decodeUnknownResult(BattleFillSchema)(foundationFill);

    expect(Result.isSuccess(decodedHole)).toBe(true);
    expect(Result.isSuccess(decodedFill)).toBe(true);
    if (Result.isFailure(decodedHole) || Result.isFailure(decodedFill)) return;
    if (decodedHole.success.kind !== "targetChoice") return;

    expect(decodedHole.success.choices).toEqual(foundationHole.choices);
    expect(decodedFill.success.holeId).toBe(decodedHole.success.holeId);
    expect(Schema.encodeSync(BattleHoleSchema)(decodedHole.success)).toEqual(
      foundationHole,
    );
    expect(Schema.encodeSync(BattleFillSchema)(decodedFill.success)).toEqual(
      foundationFill,
    );
  });

  test("rejects malformed holes and mismatched fill shapes", () => {
    const malformedHole = Schema.decodeUnknownResult(BattleHoleSchema)({
      ...foundationHole,
      choices: ["combatant:source", 42],
    });
    const mismatchedFill = Schema.decodeUnknownResult(BattleFillSchema)({
      ...foundationFill,
      value: 42,
    });

    expect(Result.isFailure(malformedHole)).toBe(true);
    expect(Result.isFailure(mismatchedFill)).toBe(true);
    if (Result.isSuccess(malformedHole)) return;
    if (Result.isSuccess(mismatchedFill)) return;
    expect(String(malformedHole.failure)).toContain("choices");
    expect(String(mismatchedFill.failure)).toContain("value");
  });
});
