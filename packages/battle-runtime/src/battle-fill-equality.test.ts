import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { DieRollResult, movementFeet } from "@dnd/shared/types";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  battleContinuationFillEquals,
  type BattleContinuationComparableFill,
} from "./battle-reducer/battle-fill-equality.ts";
import { combatantId } from "./battle-runtime.test-support.ts";
import {
  type BattleAttackRollResult,
  type BattleD20TestNaturalOneRerollDecision,
  type BattleD20TestNaturalOneRerollOutcomeDecision,
  type BattleSpellAttackRerollDecision,
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  type BattleFill,
} from "./battle-state-execution.ts";

type DeathSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "deathSavingThrow" }
>;
type AttackRollFill = Extract<BattleFill, { readonly kind: "attackRoll" }>;
type ConcentrationSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "concentrationSavingThrow" }
>;
type RolledDiceFill = Extract<BattleFill, { readonly kind: "rolledDice" }>;
type SavingThrowOutcomeFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;
type MovementFill = Extract<BattleFill, { readonly kind: "movement" }>;

const battleHoleIdArbitrary = fc
  .integer({ min: 0, max: 8 })
  .map((index) => holeId(`equality-hole:${index}`));
const dieRollArbitrary = fc.integer({ min: 1, max: 20 }).map(DieRollResult);
const combatantIdArbitrary = fc
  .integer({ min: 0, max: 8 })
  .map((index) => combatantId(`combatant:equality:${index}`));
const rolledD20sArbitrary = fc.record({
  first: dieRollArbitrary,
  second: dieRollArbitrary,
  selected: fc.constantFrom("first" as const, "second" as const),
});
const baseAttackRollArbitrary: fc.Arbitrary<BattleAttackRollResult> = fc
  .tuple(
    fc.integer({ min: -10, max: 40 }),
    dieRollArbitrary,
    fc.option(rolledD20sArbitrary, { nil: undefined }),
  )
  .map(([total, naturalD20, rolledD20s]) => ({
    total,
    naturalD20,
    ...(rolledD20s === undefined ? {} : { rolledD20s }),
  }));
const spellAttackRerollDecisionArbitrary: fc.Arbitrary<BattleSpellAttackRerollDecision> =
  fc.oneof(
    fc.constant({
      kind: "decline",
      effectKind: "missed_spell_attack_reroll",
    } as const),
    baseAttackRollArbitrary.map((replacement) => ({
      kind: "reroll" as const,
      effectKind: "missed_spell_attack_reroll" as const,
      replacement,
    })),
  );
const naturalOneRerollRollDecisionArbitrary: fc.Arbitrary<BattleD20TestNaturalOneRerollDecision> =
  fc.oneof(
    fc.constant({
      kind: "decline",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    } as const),
    baseAttackRollArbitrary.map(
      (replacement): BattleD20TestNaturalOneRerollDecision => ({
        kind: "reroll" as const,
        effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
        replacement,
      }),
    ),
    fc
      .tuple(
        fc.constantFrom("first" as const, "second" as const),
        dieRollArbitrary,
        baseAttackRollArbitrary,
      )
      .map(
        ([die, naturalD20, result]): BattleD20TestNaturalOneRerollDecision => ({
          kind: "rerollRolledDie" as const,
          effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
          replacement: { die, naturalD20, result },
        }),
      ),
  );
const naturalOneRerollOutcomeDecisionArbitrary: fc.Arbitrary<BattleD20TestNaturalOneRerollOutcomeDecision> =
  fc.oneof(
    fc.constant({
      kind: "decline",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    } as const),
    fc.tuple(fc.boolean(), dieRollArbitrary).map(
      ([
        succeeded,
        naturalD20,
      ]): BattleD20TestNaturalOneRerollOutcomeDecision => ({
        kind: "reroll" as const,
        effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
        replacement: { succeeded, naturalD20 },
      }),
    ),
    fc
      .tuple(
        fc.constantFrom("first" as const, "second" as const),
        dieRollArbitrary,
        fc.boolean(),
        dieRollArbitrary,
      )
      .map(
        ([
          die,
          naturalD20,
          succeeded,
          resultNaturalD20,
        ]): BattleD20TestNaturalOneRerollOutcomeDecision => ({
          kind: "rerollRolledDie" as const,
          effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
          replacement: {
            die,
            naturalD20,
            result: { succeeded, naturalD20: resultNaturalD20 },
          },
        }),
      ),
  );
const attackRollArbitrary: fc.Arbitrary<AttackRollFill> = fc
  .tuple(
    battleHoleIdArbitrary,
    baseAttackRollArbitrary,
    fc.option(spellAttackRerollDecisionArbitrary, { nil: undefined }),
    fc.option(naturalOneRerollRollDecisionArbitrary, { nil: undefined }),
  )
  .map(([holeId, base, spellAttackReroll, d20TestNaturalOneReroll]) => ({
    kind: "attackRoll",
    holeId,
    value: {
      ...base,
      ...(spellAttackReroll === undefined ? {} : { spellAttackReroll }),
      ...(d20TestNaturalOneReroll === undefined
        ? {}
        : { d20TestNaturalOneReroll }),
    },
  }));
const concentrationSavingThrowArbitrary: fc.Arbitrary<ConcentrationSavingThrowFill> =
  fc
    .tuple(
      battleHoleIdArbitrary,
      fc.boolean(),
      dieRollArbitrary,
      fc.option(rolledD20sArbitrary, { nil: undefined }),
      fc.option(naturalOneRerollOutcomeDecisionArbitrary, { nil: undefined }),
    )
    .map(
      ([
        holeId,
        succeeded,
        naturalD20,
        rolledD20s,
        d20TestNaturalOneReroll,
      ]) => ({
        kind: "concentrationSavingThrow",
        holeId,
        value: {
          succeeded,
          naturalD20,
          ...(rolledD20s === undefined ? {} : { rolledD20s }),
          ...(d20TestNaturalOneReroll === undefined
            ? {}
            : { d20TestNaturalOneReroll }),
        },
      }),
    );
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
const rolledDiceGroupArbitrary = fc.record({
  results: fc.array(dieRollArbitrary, { minLength: 1, maxLength: 3 }),
});
const rolledDiceGroupsArbitrary: fc.Arbitrary<RolledDiceFill["value"]> = fc
  .tuple(
    rolledDiceGroupArbitrary,
    fc.array(rolledDiceGroupArbitrary, { maxLength: 2 }),
  )
  .map(([first, remaining]): RolledDiceFill["value"] => [first, ...remaining]);
const rolledDiceFillArbitrary: fc.Arbitrary<RolledDiceFill> = fc
  .tuple(battleHoleIdArbitrary, rolledDiceGroupsArbitrary)
  .map(([holeId, value]) => ({ kind: "rolledDice", holeId, value }));
const savingThrowOutcomeFillArbitrary: fc.Arbitrary<SavingThrowOutcomeFill> = fc
  .tuple(
    battleHoleIdArbitrary,
    fc.array(
      fc.record({
        targetId: combatantIdArbitrary,
        succeeded: fc.boolean(),
      }),
      { maxLength: 3 },
    ),
  )
  .map(([holeId, outcomes]) => ({
    kind: "savingThrowOutcome",
    holeId,
    value: { outcomes },
  }));
const acrobaticMovementArbitrary: fc.Arbitrary<
  NonNullable<MovementFill["value"]["acrobaticMovement"]>
> = fc
  .constantFrom("alongVerticalSurface" as const, "acrossLiquid" as const)
  .map((path) => ({
    kind: "acrobaticMovement",
    paths: [path],
    withoutFallingDuringMovement: true,
  }));
const movementFillArbitrary: fc.Arbitrary<MovementFill> = fc
  .tuple(
    battleHoleIdArbitrary,
    fc.constantFrom("walk" as const, "fly" as const, "swim" as const),
    fc.integer({ min: 0, max: 120 }).map(movementFeet),
    fc.option(acrobaticMovementArbitrary, { nil: undefined }),
  )
  .map(([holeId, speedKind, movementCostFeet, acrobaticMovement]) => ({
    kind: "movement",
    holeId,
    value: {
      speedKind,
      movementCostFeet,
      provokedOpportunityAttacks: [],
      ...(acrobaticMovement === undefined ? {} : { acrobaticMovement }),
    },
  }));

const comparableBattleFillArbitrary: fc.Arbitrary<BattleContinuationComparableFill> =
  fc.oneof(
    attackRollArbitrary,
    rolledDiceFillArbitrary,
    savingThrowOutcomeFillArbitrary,
    movementFillArbitrary,
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
    fc.oneof(
      concentrationSavingThrowArbitrary,
      fc.record({
        kind: fc.constant("concentrationSavingThrow" as const),
        holeId: battleHoleIdArbitrary,
        value: fc.record({
          succeeded: fc.boolean(),
          withoutRoll: fc.constant(true as const),
        }),
      }),
    ),
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

  test("distinguishes reroll decision variants and their replacements", () => {
    const attackRoll = (
      input: Pick<
        BattleAttackRollResult,
        "spellAttackReroll" | "d20TestNaturalOneReroll"
      >,
    ): AttackRollFill => ({
      kind: "attackRoll",
      holeId: holeId("equality-hole:reroll-attack"),
      value: {
        total: 10,
        naturalD20: DieRollResult(10),
        ...(input.spellAttackReroll === undefined
          ? {}
          : { spellAttackReroll: input.spellAttackReroll }),
        ...(input.d20TestNaturalOneReroll === undefined
          ? {}
          : { d20TestNaturalOneReroll: input.d20TestNaturalOneReroll }),
      },
    });
    const spellDecline = {
      kind: "decline",
      effectKind: "missed_spell_attack_reroll",
    } as const;
    const spellReroll = {
      kind: "reroll",
      effectKind: "missed_spell_attack_reroll",
      replacement: { total: 11, naturalD20: DieRollResult(11) },
    } as const;
    const naturalDecline = {
      kind: "decline",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    } as const;
    const naturalReroll = {
      kind: "reroll",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: { total: 12, naturalD20: DieRollResult(12) },
    } as const;
    const naturalRolledDie = {
      kind: "rerollRolledDie",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: {
        die: "first",
        naturalD20: DieRollResult(13),
        result: { total: 13, naturalD20: DieRollResult(13) },
      },
    } as const;

    expect(
      battleContinuationFillEquals(
        attackRoll({ spellAttackReroll: spellDecline }),
        attackRoll({ spellAttackReroll: spellReroll }),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        attackRoll({ d20TestNaturalOneReroll: naturalDecline }),
        attackRoll({ d20TestNaturalOneReroll: naturalReroll }),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        attackRoll({ d20TestNaturalOneReroll: naturalReroll }),
        attackRoll({ d20TestNaturalOneReroll: naturalRolledDie }),
      ),
    ).toBe(false);

    const concentration = (
      decision: BattleD20TestNaturalOneRerollOutcomeDecision,
    ): ConcentrationSavingThrowFill => ({
      kind: "concentrationSavingThrow",
      holeId: holeId("equality-hole:reroll-concentration"),
      value: {
        succeeded: false,
        naturalD20: DieRollResult(1),
        d20TestNaturalOneReroll: decision,
      },
    });
    const outcomeReroll = {
      kind: "reroll",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: { succeeded: true, naturalD20: DieRollResult(14) },
    } as const;
    const outcomeRolledDie = {
      kind: "rerollRolledDie",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: {
        die: "second",
        naturalD20: DieRollResult(15),
        result: { succeeded: true, naturalD20: DieRollResult(15) },
      },
    } as const;
    expect(
      battleContinuationFillEquals(
        concentration(outcomeReroll),
        concentration(outcomeRolledDie),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        concentration(outcomeRolledDie),
        concentration(outcomeReroll),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        concentration(outcomeReroll),
        concentration({
          ...outcomeReroll,
          replacement: {
            ...outcomeReroll.replacement,
            succeeded: false,
          },
        }),
      ),
    ).toBe(false);

    const deathSavingThrow = (
      decision: NonNullable<DeathSavingThrowFill["d20TestNaturalOneReroll"]>,
    ): DeathSavingThrowFill => ({
      kind: "deathSavingThrow",
      holeId: holeId("equality-hole:reroll-death-save"),
      value: DieRollResult(10),
      d20TestNaturalOneReroll: decision,
    });
    const deathReroll = {
      kind: "reroll",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: DieRollResult(16),
    } as const;
    expect(
      battleContinuationFillEquals(
        deathSavingThrow(deathReroll),
        deathSavingThrow(naturalDecline),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        deathSavingThrow(deathReroll),
        deathSavingThrow({
          ...deathReroll,
          replacement: DieRollResult(17),
        }),
      ),
    ).toBe(false);
  });
});
