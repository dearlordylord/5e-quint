import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  d20Roll,
  DieRollResult,
  movementFeet,
  NonNegativeInteger,
  type D20Roll,
} from "@dnd/shared/types";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  battleContinuationFillEquals,
  battleResubmittedFillKeepsAcceptedFill,
  type BattleContinuationComparableFill,
} from "./battle-reducer/battle-fill-equality.ts";
import { combatantId } from "./battle-runtime.test-support.ts";
import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
} from "./identity.ts";
import {
  BARDIC_INSPIRATION_DIE_EFFECT_KIND,
  BATTLE_MOVEMENT_PATH_ACTIVITIES,
  BATTLE_MOVEMENT_PATH_DIFFICULT_TERRAIN,
  type BattleAttackRollResult,
  type BattleD20TestRoll,
  type BattleD20TestMultipleRoll,
  type BattleD20TestNaturalOneRerollDecision,
  type BattleD20TestNaturalOneRerollOutcomeDecision,
  type BattleSpellAttackRerollDecision,
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
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
const d20RollArbitrary: fc.Arbitrary<D20Roll> = fc
  .integer({ min: 1, max: 20 })
  .map((value) => d20Roll(value));
const combatantIdArbitrary = fc
  .integer({ min: 0, max: 8 })
  .map((index) => combatantId(`combatant:equality:${index}`));
const multipleD20TestRollArbitrary: fc.Arbitrary<BattleD20TestMultipleRoll> = fc
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
  }));
const d20TestRollArbitrary: fc.Arbitrary<BattleD20TestRoll> = fc.oneof(
  dieRollArbitrary.map((naturalD20) => ({
    tag: "single" as const,
    naturalD20,
  })),
  multipleD20TestRollArbitrary,
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
        fc.integer({ min: -10, max: 40 }),
        multipleD20TestRollArbitrary,
      )
      .map(
        ([die, total, d20TestRoll]): BattleD20TestNaturalOneRerollDecision => ({
          kind: "rerollRolledDie" as const,
          effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
          replacement: { die, result: { total, d20TestRoll } },
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
        multipleD20TestRollArbitrary,
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
    fc.option(naturalOneRerollRollDecisionArbitrary, { nil: undefined }),
    fc.option(spellAttackRerollDecisionArbitrary, { nil: undefined }),
  )
  .map(([holeId, base, naturalOneReroll, spellAttackReroll]) => {
    const [first, ...rest] = [naturalOneReroll, spellAttackReroll].filter(
      (decision) => decision !== undefined,
    );
    return {
      kind: "attackRoll",
      holeId,
      value: {
        ...base,
        ...(first === undefined ? {} : { d20TestRerolls: [first, ...rest] }),
      },
    };
  });
const concentrationSavingThrowArbitrary: fc.Arbitrary<ConcentrationSavingThrowFill> =
  fc
    .tuple(
      battleHoleIdArbitrary,
      fc.boolean(),
      d20TestRollArbitrary,
      fc.option(naturalOneRerollOutcomeDecisionArbitrary, { nil: undefined }),
    )
    .map(([holeId, succeeded, d20TestRoll, naturalOneReroll]) => ({
      kind: "concentrationSavingThrow",
      holeId,
      value: {
        succeeded,
        d20TestRoll,
        ...(naturalOneReroll === undefined
          ? {}
          : { d20TestRerolls: [naturalOneReroll] as const }),
      },
    }));
const naturalOneRerollDieDecisionArbitrary: fc.Arbitrary<
  NonNullable<DeathSavingThrowFill["d20TestRerolls"]>[number]
> = fc.oneof(
  fc.constant({
    kind: "decline",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  } as const),
  d20RollArbitrary.map(
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
        withoutRoll: fc.constant(true as const),
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
const movementPathSegmentArbitrary: fc.Arbitrary<
  MovementFill["value"]["path"][number]
> = fc.record({
  distanceFeet: fc.integer({ min: 1, max: 120 }).map(movementFeet),
  activity: fc.constantFrom(...BATTLE_MOVEMENT_PATH_ACTIVITIES),
  difficultTerrain: fc.constantFrom(...BATTLE_MOVEMENT_PATH_DIFFICULT_TERRAIN),
  movesCloserThroughDirectionalArea: fc.boolean(),
  draggedGrappledTargetIds: fc.array(combatantIdArbitrary, { maxLength: 2 }),
});
const movementPathArbitrary: fc.Arbitrary<MovementFill["value"]["path"]> = fc
  .tuple(
    movementPathSegmentArbitrary,
    fc.array(movementPathSegmentArbitrary, { maxLength: 2 }),
  )
  .map(([first, rest]) => [first, ...rest]);
const movementFillArbitrary: fc.Arbitrary<MovementFill> = fc
  .tuple(
    battleHoleIdArbitrary,
    fc.constantFrom("walk" as const, "fly" as const, "swim" as const),
    movementPathArbitrary,
    fc.option(acrobaticMovementArbitrary, { nil: undefined }),
  )
  .map(([holeId, speedKind, path, acrobaticMovement]) => ({
    kind: "movement",
    holeId,
    value: {
      speedKind,
      path,
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
        value: d20RollArbitrary,
      }),
      fc.record({
        kind: fc.constant("deathSavingThrow" as const),
        holeId: battleHoleIdArbitrary,
        value: d20RollArbitrary,
        d20TestRerolls: fc.tuple(naturalOneRerollDieDecisionArbitrary),
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
      input: Partial<Pick<BattleAttackRollResult, "d20TestRerolls">>,
    ): AttackRollFill => ({
      kind: "attackRoll",
      holeId: holeId("equality-hole:reroll-attack"),
      value: {
        total: 10,
        d20TestRoll: { tag: "single", naturalD20: DieRollResult(10) },
        ...(input.d20TestRerolls === undefined
          ? {}
          : { d20TestRerolls: input.d20TestRerolls }),
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
          d20TestRoll: {
            tag: "multiple",
            first: DieRollResult(13),
            second: DieRollResult(2),
            rollMode: "advantage",
          },
        },
      },
    } as const;

    expect(
      battleContinuationFillEquals(
        attackRoll({ d20TestRerolls: [spellDecline] }),
        attackRoll({ d20TestRerolls: [spellReroll] }),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        attackRoll({ d20TestRerolls: [naturalDecline] }),
        attackRoll({ d20TestRerolls: [naturalReroll] }),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        attackRoll({ d20TestRerolls: [naturalReroll] }),
        attackRoll({ d20TestRerolls: [naturalRolledDie] }),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        attackRoll({ d20TestRerolls: [naturalRolledDie] }),
        attackRoll({ d20TestRerolls: [naturalReroll] }),
      ),
    ).toBe(false);
    const inspirationDecline = {
      kind: "decline",
      effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    } as const;
    expect(
      battleContinuationFillEquals(
        attackRoll({ d20TestRerolls: [naturalReroll, inspirationDecline] }),
        attackRoll({ d20TestRerolls: [naturalReroll, inspirationDecline] }),
      ),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(
        attackRoll({ d20TestRerolls: [naturalReroll, inspirationDecline] }),
        attackRoll({ d20TestRerolls: [inspirationDecline, naturalReroll] }),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        attackRoll({ d20TestRerolls: [naturalReroll, inspirationDecline] }),
        attackRoll({ d20TestRerolls: [naturalReroll] }),
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
        d20TestRerolls: [decision],
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
              tag: "multiple",
              first: DieRollResult(replacementNaturalD20),
              second: DieRollResult(2),
              rollMode: "advantage",
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
      decision: NonNullable<DeathSavingThrowFill["d20TestRerolls"]>[number],
    ): DeathSavingThrowFill => ({
      kind: "deathSavingThrow",
      holeId: holeId("equality-hole:reroll-death-save"),
      value: d20Roll(10),
      d20TestRerolls: [decision],
    });
    const deathReroll = {
      kind: "reroll",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: d20Roll(16),
    } as const;
    expect(
      battleContinuationFillEquals(
        deathSavingThrow(deathReroll),
        deathSavingThrow(naturalDecline),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        deathSavingThrow(naturalDecline),
        deathSavingThrow(deathReroll),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        deathSavingThrow(naturalDecline),
        deathSavingThrow({ ...naturalDecline }),
      ),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(
        deathSavingThrow(deathReroll),
        deathSavingThrow({
          ...deathReroll,
          replacement: d20Roll(17),
        }),
      ),
    ).toBe(false);
  });
});

describe("resubmitted fill continuity", () => {
  const naturalOneRoll = {
    tag: "single",
    naturalD20: DieRollResult(1),
  } as const;
  const naturalOneReroll = {
    kind: "reroll",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    replacement: {
      total: 18,
      d20TestRoll: { tag: "single", naturalD20: DieRollResult(14) },
    },
  } as const;
  const inspirationReroll = {
    kind: "reroll",
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    replacement: {
      total: 21,
      d20TestRoll: { tag: "single", naturalD20: DieRollResult(17) },
    },
  } as const;
  const attackRoll = (
    value: Partial<AttackRollFill["value"]> = {},
  ): AttackRollFill => ({
    kind: "attackRoll",
    holeId: holeId("continuity-hole:attack"),
    value: { total: 5, d20TestRoll: naturalOneRoll, ...value },
  });

  test("an attack roll may add reroll decisions after the accepted ones", () => {
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        attackRoll(),
        attackRoll({ d20TestRerolls: [naturalOneReroll] }),
      ),
    ).toBe(true);
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        attackRoll({ d20TestRerolls: [naturalOneReroll] }),
        attackRoll({ d20TestRerolls: [naturalOneReroll, inspirationReroll] }),
      ),
    ).toBe(true);
  });

  test("an attack roll may not change the accepted roll or decisions", () => {
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        attackRoll(),
        attackRoll({ total: 6 }),
      ),
    ).toBe(false);
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        attackRoll({ d20TestRerolls: [naturalOneReroll] }),
        attackRoll({ d20TestRerolls: [inspirationReroll, naturalOneReroll] }),
      ),
    ).toBe(false);
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        attackRoll({ d20TestRerolls: [naturalOneReroll] }),
        attackRoll(),
      ),
    ).toBe(false);
  });

  test("a saving throw may add a natural-1 decision the accepted fill lacked", () => {
    const outcomeReroll = {
      kind: "reroll",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: {
        succeeded: true,
        d20TestRoll: { tag: "single", naturalD20: DieRollResult(15) },
      },
    } as const;
    const savingThrows = (
      first: Partial<{
        readonly succeeded: boolean;
        readonly d20TestRerolls: readonly [typeof outcomeReroll];
      }>,
    ): SavingThrowOutcomeFill => ({
      kind: "savingThrowOutcome",
      holeId: holeId("continuity-hole:saves"),
      value: {
        outcomes: [
          {
            targetId: combatantId("combatant:continuity:0"),
            succeeded: false,
            d20TestRoll: naturalOneRoll,
            ...first,
          },
          {
            targetId: combatantId("combatant:continuity:1"),
            succeeded: true,
            withoutRoll: true,
          },
        ],
      },
    });
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        savingThrows({}),
        savingThrows({ d20TestRerolls: [outcomeReroll] }),
      ),
    ).toBe(true);
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        savingThrows({}),
        savingThrows({ succeeded: true }),
      ),
    ).toBe(false);
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        savingThrows({ d20TestRerolls: [outcomeReroll] }),
        savingThrows({}),
      ),
    ).toBe(false);

    const concentration = (
      naturalOneReroll?: typeof outcomeReroll,
    ): ConcentrationSavingThrowFill => ({
      kind: "concentrationSavingThrow",
      holeId: holeId("continuity-hole:concentration"),
      value: {
        succeeded: false,
        d20TestRoll: naturalOneRoll,
        ...(naturalOneReroll === undefined
          ? {}
          : { d20TestRerolls: [naturalOneReroll] as const }),
      },
    });
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        concentration(),
        concentration(outcomeReroll),
      ),
    ).toBe(true);
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        concentration(outcomeReroll),
        concentration(),
      ),
    ).toBe(false);
  });

  test("a death saving throw may add a natural-1 decision", () => {
    const deathSavingThrow = (
      value: number,
      naturalOneReroll?: NonNullable<
        DeathSavingThrowFill["d20TestRerolls"]
      >[number],
    ): DeathSavingThrowFill => ({
      kind: "deathSavingThrow",
      holeId: holeId("continuity-hole:death-save"),
      value: d20Roll(value),
      ...(naturalOneReroll === undefined
        ? {}
        : { d20TestRerolls: [naturalOneReroll] as const }),
    });
    const reroll = {
      kind: "reroll",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: d20Roll(12),
    } as const;
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        deathSavingThrow(1),
        deathSavingThrow(1, reroll),
      ),
    ).toBe(true);
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        deathSavingThrow(1),
        deathSavingThrow(2, reroll),
      ),
    ).toBe(false);
  });

  test("a death saving throw may add an added-die decision after its rerolls", () => {
    const reroll = {
      kind: "reroll",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: d20Roll(5),
    } as const;
    const addDie = (dieRoll: number) =>
      ({
        kind: "addDie",
        effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
        dieRoll: DieRollResult(dieRoll),
      }) as const;
    const deathSavingThrow = (
      addedDie?: ReturnType<typeof addDie>,
    ): DeathSavingThrowFill => ({
      kind: "deathSavingThrow",
      holeId: holeId("continuity-hole:death-save-added-die"),
      value: d20Roll(1),
      d20TestRerolls: [reroll],
      ...(addedDie === undefined ? {} : { d20TestAddedDice: [addedDie] }),
    });
    // The roll and its accepted reroll stay; the added die is new.
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        deathSavingThrow(),
        deathSavingThrow(addDie(5)),
      ),
    ).toBe(true);
    // An accepted added die can't be changed or dropped.
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        deathSavingThrow(addDie(5)),
        deathSavingThrow(addDie(6)),
      ),
    ).toBe(false);
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        deathSavingThrow(addDie(5)),
        deathSavingThrow(),
      ),
    ).toBe(false);
    expect(
      battleContinuationFillEquals(
        deathSavingThrow(addDie(5)),
        deathSavingThrow(addDie(6)),
      ),
    ).toBe(false);
  });

  test("a damage roll may not change a choice the accepted fill made", () => {
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("continuity-battle"),
        combatantId("combatant:continuity:0"),
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const damageRoll = (selection: "apply" | "decline"): RolledDiceFill => ({
      kind: "rolledDice",
      holeId: holeId("continuity-hole:damage"),
      value: [{ results: [DieRollResult(4)] }],
      attackDamageAbilityModifierChoice: { procedureRef, selection },
    });
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        damageRoll("apply"),
        damageRoll("apply"),
      ),
    ).toBe(true);
    expect(
      battleResubmittedFillKeepsAcceptedFill(
        damageRoll("apply"),
        damageRoll("decline"),
      ),
    ).toBe(false);
  });

  test("a fill without reroll decisions must equal the accepted fill", () => {
    const movement = (feet: number): MovementFill => ({
      kind: "movement",
      holeId: holeId("continuity-hole:movement"),
      value: {
        speedKind: "walk",
        path: [
          {
            distanceFeet: movementFeet(feet),
            activity: "ordinary",
            difficultTerrain: "none",
            movesCloserThroughDirectionalArea: false,
            draggedGrappledTargetIds: [],
          },
        ],
        provokedOpportunityAttacks: [],
      },
    });
    expect(
      battleResubmittedFillKeepsAcceptedFill(movement(10), movement(10)),
    ).toBe(true);
    expect(
      battleResubmittedFillKeepsAcceptedFill(movement(10), movement(15)),
    ).toBe(false);
  });
});
