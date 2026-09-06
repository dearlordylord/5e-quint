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

const grantedAreaSaveDamageSourceProcedureRef = JSON.stringify({
  scopeRef: JSON.stringify({
    battleId: "battle:gh377",
    combatantId: "combatant:source",
    kind: "characterExecution",
    ordinal: 0,
  }),
  kind: "procedure",
  ordinal: 0,
});

const grantedAreaSaveDamageHole = (dieSize: number) => ({
  holeInstanceKey: "battle:gh377:granted-area-damage",
  holeId: "battle:gh377:granted-area-damage",
  label: "Roll granted-area damage",
  kind: "rolledDice",
  grantedAreaSaveDamageAction: {
    sourceCombatantId: "combatant:source",
    sourceProcedureRef: grantedAreaSaveDamageSourceProcedureRef,
    damageType: "fire",
    expr: { dice: 1, dieSize },
  },
});

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

  test.each([
    [6, true],
    [4, false],
  ] as const)(
    "granted-area damage result accepts only the fixed d6 die size (%i)",
    (dieSize, expectedSuccess) => {
      const decoded = Schema.decodeUnknownResult(BattleHoleSchema)(
        grantedAreaSaveDamageHole(dieSize),
      );
      expect(Result.isSuccess(decoded)).toBe(expectedSuccess);
    },
  );
});
