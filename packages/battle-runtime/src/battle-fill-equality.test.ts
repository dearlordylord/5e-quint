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
  type BattleD20TestRoll,
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
const rolledD20sArbitrary: fc.Arbitrary<BattleD20TestRoll> = fc
  .tuple(
    dieRollArbitrary,
    dieRollArbitrary,
    fc.constantFrom("advantage" as const, "disadvantage" as const),
  )
  .map(([first, second, rollMode]) => ({
    tag: "multiple" as const,
    first,
    second,
    rollMode,
    selected:
      rollMode === "advantage"
        ? first >= second
          ? ("first" as const)
          : ("second" as const)
        : first <= second
          ? ("first" as const)
          : ("second" as const),
  }));
const d20TestRollArbitrary: fc.Arbitrary<BattleD20TestRoll> = fc.oneof(
  dieRollArbitrary.map((naturalD20) => ({
    tag: "single" as const,
    naturalD20,
  })),
  rolledD20sArbitrary,
);
const baseAttackRollArbitrary: fc.Arbitrary<BattleAttackRollResult> = fc
  .tuple(fc.integer({ min: -10, max: 40 }), d20TestRollArbitrary)
  .map(([total, d20TestRoll]) => ({
    total,
    d20TestRoll,
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
        baseAttackRollArbitrary,
      )
      .map(
        ([die, result]): BattleD20TestNaturalOneRerollDecision => ({
          kind: "rerollRolledDie" as const,
          effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
          replacement: { die, result },
        }),
      ),
  );
const naturalOneRerollOutcomeDecisionArbitrary: fc.Arbitrary<BattleD20TestNaturalOneRerollOutcomeDecision> =
  fc.oneof(
    fc.constant({
      kind: "decline",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    } as const),
    fc.tuple(fc.boolean(), d20TestRollArbitrary).map(
      ([
        succeeded,
        d20TestRoll,
      ]): BattleD20TestNaturalOneRerollOutcomeDecision => ({
        kind: "reroll" as const,
        effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
        replacement: { succeeded, d20TestRoll },
      }),
    ),
    fc
      .tuple(
        fc.constantFrom("first" as const, "second" as const),
        fc.boolean(),
        d20TestRollArbitrary,
      )
      .map(
        ([
          die,
          succeeded,
          d20TestRoll,
        ]): BattleD20TestNaturalOneRerollOutcomeDecision => ({
          kind: "rerollRolledDie" as const,
          effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
          replacement: {
            die,
            result: { succeeded, d20TestRoll },
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
      d20TestRollArbitrary,
      fc.option(naturalOneRerollOutcomeDecisionArbitrary, { nil: undefined }),
    )
    .map(([holeId, succeeded, d20TestRoll, d20TestNaturalOneReroll]) => ({
      kind: "concentrationSavingThrow",
      holeId,
      value: {
        succeeded,
        d20TestRoll,
        ...(d20TestNaturalOneReroll === undefined
          ? {}
          : { d20TestNaturalOneReroll }),
      },
    }));
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
        d20TestRoll: { tag: "single", naturalD20: DieRollResult(10) },
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
      replacement: {
        total: 11,
        d20TestRoll: { tag: "single", naturalD20: DieRollResult(11) },
      },
    } as const;
    const naturalDecline = {
      kind: "decline",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    } as const;
    const naturalReroll = {
      kind: "reroll",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: {
        total: 12,
        d20TestRoll: { tag: "single", naturalD20: DieRollResult(12) },
      },
    } as const;
    const naturalRolledDie = {
      kind: "rerollRolledDie",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: {
        die: "first",
        result: {
          total: 13,
          d20TestRoll: { tag: "single", naturalD20: DieRollResult(13) },
        },
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
    expect(
      battleContinuationFillEquals(
        attackRoll({ d20TestNaturalOneReroll: naturalRolledDie }),
        attackRoll({ d20TestNaturalOneReroll: naturalReroll }),
      ),
    ).toBe(false);

    const concentration = (
      decision: BattleD20TestNaturalOneRerollOutcomeDecision,
    ): ConcentrationSavingThrowFill => ({
      kind: "concentrationSavingThrow",
      holeId: holeId("equality-hole:reroll-concentration"),
      value: {
        succeeded: false,
        d20TestRoll: { tag: "single", naturalD20: DieRollResult(1) },
        d20TestNaturalOneReroll: decision,
      },
    });
    const outcomeReroll = {
      kind: "reroll",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: {
        succeeded: true,
        d20TestRoll: { tag: "single", naturalD20: DieRollResult(14) },
      },
    } as const;
    type ConcentrationRerollOverrides = {
      readonly die?: "first" | "second";
      readonly replacementNaturalD20?: number;
      readonly resultSucceeded?: boolean;
    };
    const concentrationReroll = ({
      die = "first",
      replacementNaturalD20 = 15,
      resultSucceeded = true,
    }: ConcentrationRerollOverrides = {}) =>
      concentration({
        kind: "rerollRolledDie",
        effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
        replacement: {
          die,
          result: {
            succeeded: resultSucceeded,
            d20TestRoll: {
              tag: "single",
              naturalD20: DieRollResult(replacementNaturalD20),
            },
          },
        },
      });
    expect(
      battleContinuationFillEquals(
        concentrationReroll(),
        concentrationReroll(),
      ),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(
        concentration(naturalDecline),
        concentration(outcomeReroll),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        concentration(outcomeReroll),
        concentrationReroll(),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        concentrationReroll(),
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

    const concentrationRerollDifferences = [
      {
        name: "selected die",
        left: { die: "first" },
        right: { die: "second" },
      },
      {
        name: "replacement natural d20",
        left: { replacementNaturalD20: 15 },
        right: { replacementNaturalD20: 14 },
      },
      {
        name: "result succeeded",
        left: { resultSucceeded: true },
        right: { resultSucceeded: false },
      },
    ] satisfies readonly {
      readonly name: string;
      readonly left: ConcentrationRerollOverrides;
      readonly right: ConcentrationRerollOverrides;
    }[];
    for (const difference of concentrationRerollDifferences) {
      expect(
        battleContinuationFillEquals(
          concentrationReroll(difference.left),
          concentrationReroll(difference.right),
        ),
        difference.name,
      ).toBe(false);
    }

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
