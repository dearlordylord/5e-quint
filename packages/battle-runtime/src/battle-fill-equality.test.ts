import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { DieRollResult } from "@dnd/shared/types";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  battleContinuationFillEquals,
  type BattleContinuationComparableFill,
} from "./battle-reducer/dispatcher.ts";
import { combatantId } from "./battle-runtime.test-support.ts";
import {
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  type BattleFill,
} from "./battle-state-execution.ts";

type DeathSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "deathSavingThrow" }
>;

const battleHoleIdArbitrary = fc
  .integer({ min: 0, max: 8 })
  .map((index) => holeId(`equality-hole:${index}`));
const dieRollArbitrary = fc.integer({ min: 1, max: 20 }).map(DieRollResult);
const combatantIdArbitrary = fc
  .integer({ min: 0, max: 8 })
  .map((index) => combatantId(`combatant:equality:${index}`));
const naturalOneRerollDieDecisionArbitrary: fc.Arbitrary<
  NonNullable<DeathSavingThrowFill["d20TestNaturalOneReroll"]>
> = fc.oneof(
  fc.constant({
    kind: "decline",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  } as const),
  dieRollArbitrary.map(
    (replacement) =>
      ({
        kind: "reroll" as const,
        effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
        replacement,
      }) as const,
  ),
);

const comparableBattleFillArbitrary: fc.Arbitrary<BattleContinuationComparableFill> =
  fc.oneof(
    fc.record({
      kind: fc.constant("targetChoice" as const),
      holeId: battleHoleIdArbitrary,
      value: combatantIdArbitrary,
    }),
    fc.record({
      kind: fc.constant("attackDamageDisposition" as const),
      holeId: battleHoleIdArbitrary,
      value: fc.constantFrom(
        { kind: "ordinaryDamage" as const },
        { kind: "knockOut" as const },
      ),
    }),
    fc.record({
      kind: fc.constant("concentrationSavingThrow" as const),
      holeId: battleHoleIdArbitrary,
      value: fc.oneof(
        fc.record({
          succeeded: fc.boolean(),
          withoutRoll: fc.constant(true as const),
        }),
        fc.record({
          succeeded: fc.boolean(),
          naturalD20: dieRollArbitrary,
        }),
      ),
    }),
    fc.record({
      kind: fc.constant("toolPossessionFacts" as const),
      holeId: battleHoleIdArbitrary,
      value: fc.record({
        toolIdsOnPerson: fc.array(fc.constant("poisoners_kit" as const), {
          maxLength: 3,
        }),
      }),
    }),
    fc.record({
      kind: fc.constant("cunningStrikeEndTurnCoverFacts" as const),
      holeId: battleHoleIdArbitrary,
      value: fc.record({
        cover: fc.constantFrom(
          "none" as const,
          "half" as const,
          "threeQuarters" as const,
          "total" as const,
        ),
      }),
    }),
    fc.oneof(
      fc.record({
        kind: fc.constant("deathSavingThrow" as const),
        holeId: battleHoleIdArbitrary,
        value: dieRollArbitrary,
      }),
      fc.record({
        kind: fc.constant("deathSavingThrow" as const),
        holeId: battleHoleIdArbitrary,
        value: dieRollArbitrary,
        d20TestNaturalOneReroll: naturalOneRerollDieDecisionArbitrary,
      }),
    ),
  );

describe("battle fill equality", () => {
  test("is reflexive and symmetric across continuation fill values", () => {
    fc.assert(
      fc.property(
        comparableBattleFillArbitrary,
        comparableBattleFillArbitrary,
        (left, right) => {
          expect(battleContinuationFillEquals(left, left)).toBe(true);
          expect(battleContinuationFillEquals(left, { ...left })).toBe(true);
          expect(battleContinuationFillEquals(left, right)).toBe(
            battleContinuationFillEquals(right, left),
          );
        },
      ),
    );
  });
});
