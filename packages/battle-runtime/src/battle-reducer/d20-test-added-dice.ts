// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.bardic-inspiration-failed-d20-test
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.failed-ability-check-resource-boost
// The dice added to a D20 Test that stands failed once its rerolls are
// decided (ASSUMPTIONS.md A67): a Bardic Inspiration die on an ability check
// or a saving throw, and a failed ability check resource boost on an ability
// check. Each source is offered while the test as it stands fails, in the
// order the roller chooses, and every added die counts before the test is
// judged. An ability check's added die adds to its total, which the engine
// compares with the DC; a saving throw's carries the table's ruling.

import type { DifficultyClass } from "@dnd/shared/types";
import { Match } from "effect";

import {
  BARDIC_INSPIRATION_DIE_EFFECT_KIND,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
  type BattleAbilityCheckAddedDieDecision,
  type BattleAbilityCheckAddedDieHoleOptions,
  type BattleBardicInspirationDieOption,
  type BattleD20TestAddedDieHoleOptions,
  type BattleD20TestOutcome,
  type BattleD20TestRollKey,
  type BattleFailedAbilityCheckResourceBoostOption,
  type BattleRolledOutcomeAddedDieDecision,
  type BattleState,
} from "../battle-state-execution.ts";
import {
  battleStateAfterBardicInspirationDie,
  bardicInspirationDieDecisionIssue,
  bardicInspirationDieForRoll,
  bardicInspirationDieOption,
  bardicInspirationDieUseForRoll,
  NO_BARDIC_INSPIRATION_DIE_USE,
  type BardicInspirationDieUse,
} from "./bardic-inspiration-failed-d20-test.ts";
import { d20TestAddedDieOffered } from "./d20-test-added-die.ts";
import {
  abilityCheckAfterAddedDie,
  d20TestAddedDieDecisionTakesDie,
  rolledOutcomeAfterAddedDie,
} from "./d20-test-added-die-roll.ts";
import {
  d20TestDecisions,
  type D20TestAddedDieSource,
} from "./d20-test-decision-sequence.ts";
import type { D20TestSpendScope } from "./d20-test-source-spend.ts";
import type { D20TestAbilityCheckValue } from "./d20-test-rolls-that-stand.ts";
import {
  battleStateAfterFailedAbilityCheckResourceBoost,
  failedAbilityCheckResourceBoostDecisionIssue,
  failedAbilityCheckResourceBoostForRoll,
  failedAbilityCheckResourceBoostOption,
  failedAbilityCheckResourceBoostUseForRoll,
  NO_FAILED_ABILITY_CHECK_RESOURCE_BOOST_USE,
  type FailedAbilityCheckResourceBoostUse,
} from "./failed-ability-check-resource-boost.ts";

const D20_TEST_ADDED_DIE_HOLE_REQUIRED_MESSAGE =
  "Dice added to an ability check need the discovered hole that states its DC.";

/** The sources that may add a die to an ability check. */
const ABILITY_CHECK_ADDED_DIE_SOURCES = [
  "bardicInspiration",
  "failedAbilityCheckResourceBoost",
] as const satisfies readonly D20TestAddedDieSource[];

/** The sources that may add a die to a saving throw. */
const SAVING_THROW_ADDED_DIE_SOURCES = [
  "bardicInspiration",
] as const satisfies readonly D20TestAddedDieSource[];

/** The dice a saving throw hole is asked again with. */
export type SavingThrowAddedDieOptions = {
  readonly bardicInspirationDie?: BattleBardicInspirationDieOption;
};

/** The dice an ability check hole is asked again with. */
export type AbilityCheckAddedDieOptions = SavingThrowAddedDieOptions & {
  readonly failedAbilityCheckResourceBoost?: BattleFailedAbilityCheckResourceBoostOption;
};

/** What the dice an admitted saving throw took cost its roller. */
export type SavingThrowAddedDieUses = {
  readonly bardicInspiration: BardicInspirationDieUse;
};

/** What the dice an admitted ability check took cost its roller. */
export type AbilityCheckAddedDieUses = SavingThrowAddedDieUses & {
  readonly failedAbilityCheckResourceBoost: FailedAbilityCheckResourceBoostUse;
};

/** What a test that took no die costs. */
const NO_SAVING_THROW_ADDED_DIE_USES: SavingThrowAddedDieUses = {
  bardicInspiration: NO_BARDIC_INSPIRATION_DIE_USE,
};

const NO_ABILITY_CHECK_ADDED_DIE_USES: AbilityCheckAddedDieUses = {
  ...NO_SAVING_THROW_ADDED_DIE_USES,
  failedAbilityCheckResourceBoost: NO_FAILED_ABILITY_CHECK_RESOURCE_BOOST_USE,
};

/** Spends what each admitted saving throw's added dice cost, in order. */
export function battleStateAfterSavingThrowAddedDieUses(
  state: BattleState,
  uses: readonly SavingThrowAddedDieUses[],
): BattleState {
  return uses.reduce(
    (current, use) =>
      battleStateAfterBardicInspirationDie(current, use.bardicInspiration),
    state,
  );
}

/** Spends what each admitted ability check's added dice cost, in order. */
export function battleStateAfterAbilityCheckAddedDieUses(
  state: BattleState,
  uses: readonly AbilityCheckAddedDieUses[],
): BattleState {
  return uses.reduce(
    (current, use) =>
      battleStateAfterFailedAbilityCheckResourceBoost(
        battleStateAfterSavingThrowAddedDieUses(current, [use]),
        use.failedAbilityCheckResourceBoost,
      ),
    state,
  );
}

/** Where one roll's added dice stand. */
export type D20TestAddedDice<Roll, Options, Uses> =
  | { readonly tag: "decisionsRequired"; readonly options: Options }
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "resolved";
      /** The roll that stands with every added die. */
      readonly roll: Roll;
      readonly uses: Uses;
    };

/** The roll being checked: where it belongs, and who rolled it for which hole. */
type D20TestAddedDieContext = {
  readonly state: BattleState;
  readonly scope: D20TestSpendScope;
  readonly roll: BattleD20TestRollKey;
};

/**
 * A rolled saving throw's added dice, on the roll its rerolls leave: whether
 * it succeeds, by the table's ruling with every added die.
 */
export function rolledOutcomeAddedDice<T extends BattleD20TestOutcome>(
  input: D20TestAddedDieContext & { readonly outcome: T },
): D20TestAddedDice<T, SavingThrowAddedDieOptions, SavingThrowAddedDieUses> {
  // A saving throw failed without a roll has nothing to add a die to.
  if (input.outcome.withoutRoll === true)
    return {
      tag: "resolved",
      roll: input.outcome,
      uses: NO_SAVING_THROW_ADDED_DIE_USES,
    };
  const die = bardicInspirationDieForRoll(input.state, input.scope, input.roll);
  const decisions = d20TestDecisions<
    T,
    BattleRolledOutcomeAddedDieDecision,
    (typeof SAVING_THROW_ADDED_DIE_SOURCES)[number]
  >({
    roll: input.outcome,
    decisions: input.outcome.d20TestAddedDice ?? [],
    rules: {
      sources: SAVING_THROW_ADDED_DIE_SOURCES,
      step: (outcome, decision) =>
        Match.value(decision).pipe(
          Match.discriminatorsExhaustive("effectKind")({
            [BARDIC_INSPIRATION_DIE_EFFECT_KIND]: (bardicInspiration) => ({
              source: "bardicInspiration" as const,
              issue: bardicInspirationDieDecisionIssue({
                die,
                standsFailed: !outcome.succeeded,
                decision: bardicInspiration,
              }),
            }),
          }),
        ),
      takes: d20TestAddedDieDecisionTakesDie,
      rollAfter: rolledOutcomeAfterAddedDie,
      offered: {
        bardicInspiration: (outcome) =>
          d20TestAddedDieOffered({
            source: die,
            standsFailed: !outcome.succeeded,
          }),
      },
    },
  });
  return Match.value(decisions).pipe(
    Match.discriminatorsExhaustive("tag")({
      invalid: (invalid) => invalid,
      decisionsRequired: ({ options }) => {
        const bardicInspirationDie =
          options.bardicInspiration && die.availability === "available"
            ? bardicInspirationDieOption(die, input.roll)
            : undefined;
        return {
          tag: "decisionsRequired" as const,
          options:
            bardicInspirationDie === undefined ? {} : { bardicInspirationDie },
        };
      },
      resolved: (resolved) => ({
        tag: "resolved" as const,
        roll: resolved.roll,
        uses: {
          bardicInspiration: bardicInspirationDieUseForRoll({
            ...input,
            added: resolved.taken.bardicInspiration,
          }),
        },
      }),
    }),
  );
}

/**
 * An ability check's added dice, on the total its rerolls leave: the total
 * with every added die, which the engine compares with the DC.
 */
export function abilityCheckAddedDice<T extends D20TestAbilityCheckValue>(
  input: D20TestAddedDieContext & {
    readonly value: T;
    /** The DC the discovered hole states; undefined without one. */
    readonly dc: DifficultyClass | undefined;
  },
): D20TestAddedDice<T, AbilityCheckAddedDieOptions, AbilityCheckAddedDieUses> {
  const dc = input.dc;
  if (dc === undefined) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: added dice on an ability check the subject never asked for. */
    return input.value.d20TestAddedDice === undefined
      ? {
          tag: "resolved",
          roll: input.value,
          uses: NO_ABILITY_CHECK_ADDED_DIE_USES,
        }
      : { tag: "invalid", issue: D20_TEST_ADDED_DIE_HOLE_REQUIRED_MESSAGE };
    /* v8 ignore stop -- @preserve */
  }
  const fails = (check: { readonly total: number }) => check.total < Number(dc);
  const die = bardicInspirationDieForRoll(input.state, input.scope, input.roll);
  const boost = failedAbilityCheckResourceBoostForRoll(
    input.state,
    input.scope,
    input.roll,
  );
  const decisions = d20TestDecisions<
    T,
    BattleAbilityCheckAddedDieDecision,
    (typeof ABILITY_CHECK_ADDED_DIE_SOURCES)[number]
  >({
    roll: input.value,
    decisions: input.value.d20TestAddedDice ?? [],
    rules: {
      sources: ABILITY_CHECK_ADDED_DIE_SOURCES,
      step: (check, decision) =>
        Match.value(decision).pipe(
          Match.discriminatorsExhaustive("effectKind")({
            [BARDIC_INSPIRATION_DIE_EFFECT_KIND]: (bardicInspiration) => ({
              source: "bardicInspiration" as const,
              issue: bardicInspirationDieDecisionIssue({
                die,
                standsFailed: fails(check),
                decision: bardicInspiration,
              }),
            }),
            [FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND]: (
              resourceBoost,
            ) => ({
              source: "failedAbilityCheckResourceBoost" as const,
              issue: failedAbilityCheckResourceBoostDecisionIssue({
                boost,
                standsFailed: fails(check),
                decision: resourceBoost,
              }),
            }),
          }),
        ),
      takes: d20TestAddedDieDecisionTakesDie,
      rollAfter: abilityCheckAfterAddedDie,
      offered: {
        bardicInspiration: (check) =>
          d20TestAddedDieOffered({ source: die, standsFailed: fails(check) }),
        failedAbilityCheckResourceBoost: (check) =>
          d20TestAddedDieOffered({
            source: boost,
            standsFailed: fails(check),
          }),
      },
    },
  });
  return Match.value(decisions).pipe(
    Match.discriminatorsExhaustive("tag")({
      invalid: (invalid) => invalid,
      decisionsRequired: ({ options }) => {
        const bardicInspirationDie =
          options.bardicInspiration && die.availability === "available"
            ? bardicInspirationDieOption(die, input.roll)
            : undefined;
        const failedAbilityCheckResourceBoost =
          options.failedAbilityCheckResourceBoost &&
          boost.availability === "available"
            ? failedAbilityCheckResourceBoostOption(boost, input.roll)
            : undefined;
        return {
          tag: "decisionsRequired" as const,
          options: {
            ...(bardicInspirationDie === undefined
              ? {}
              : { bardicInspirationDie }),
            ...(failedAbilityCheckResourceBoost === undefined
              ? {}
              : { failedAbilityCheckResourceBoost }),
          },
        };
      },
      resolved: (resolved) => ({
        tag: "resolved" as const,
        roll: resolved.roll,
        uses: {
          bardicInspiration: bardicInspirationDieUseForRoll({
            ...input,
            added: resolved.taken.bardicInspiration,
          }),
          failedAbilityCheckResourceBoost:
            failedAbilityCheckResourceBoostUseForRoll({
              ...input,
              boost,
              added: resolved.taken.failedAbilityCheckResourceBoost,
              succeeded: !fails(resolved.roll),
            }),
        },
      }),
    }),
  );
}

/** The saving throw hole asked again with the dice its roller has not decided on yet. */
export function savingThrowHoleWithAddedDieOptions<
  T extends BattleD20TestAddedDieHoleOptions,
>(hole: T, options: SavingThrowAddedDieOptions): T {
  return options.bardicInspirationDie === undefined
    ? hole
    : { ...hole, bardicInspirationDice: [options.bardicInspirationDie] };
}

/** The ability check hole asked again with the dice its roller has not decided on yet. */
export function abilityCheckHoleWithAddedDieOptions<
  T extends BattleAbilityCheckAddedDieHoleOptions,
>(hole: T, options: AbilityCheckAddedDieOptions): T {
  const withBardicInspiration = savingThrowHoleWithAddedDieOptions(
    hole,
    options,
  );
  return options.failedAbilityCheckResourceBoost === undefined
    ? withBardicInspiration
    : {
        ...withBardicInspiration,
        failedAbilityCheckResourceBoosts: [
          options.failedAbilityCheckResourceBoost,
        ],
      };
}
