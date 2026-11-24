// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// The D20 Tests other than attack rolls: saving throws (including
// Concentration saves), ability checks and Death Saving Throws. Each roll
// takes the natural-1 reroll and Heroic Inspiration in the order its roller
// chooses (ASSUMPTIONS.md A55), and every owner that reads the roll reads the
// roll that stands.

import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match } from "effect";

import {
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleAbilityCheckD20TestRerollDecision,
  type BattleD20TestDieReplacement,
  type BattleD20TestOutcome,
  type BattleD20TestRoll,
  type BattleD20TestRollKey,
  type BattleDeathSavingThrowD20TestRerollDecision,
  type BattleFill,
  type BattleHole,
  type BattleRolledOutcomeD20TestRerollDecision,
  type BattleSavingThrowOutcome,
  type BattleState,
} from "../battle-state-execution.ts";
import {
  d20TestHoleWithNaturalOneRerollOption,
  d20TestNaturalOneRerollDieIssue,
  d20TestNaturalOneRerollDieOffered,
  d20TestNaturalOneRerollOffered,
  d20TestNaturalOneRerollOutcomeIssue,
  d20TestNaturalOneRerollRollFactsIssue,
  d20TestNaturalOneRerollRollIssue,
  D20_TEST_REROLL_WITHOUT_ROLL_MESSAGE,
} from "./d20-test-natural-one-reroll.ts";
import {
  d20TestRerolls,
  d20TestRollAfterRerolls,
  type D20TestRerollRules,
  type D20TestRerollSourceFlags,
} from "./d20-test-reroll-sequence.ts";
import {
  d20TestDieAfterReroll,
  d20TestOutcomeAfterReroll,
  d20TestRollAfterReroll,
} from "./d20-test-roll-reroll.ts";
import {
  d20TestHoleWithHeroicInspirationRerollOption,
  d20TestRerollDecisionTakesReroll,
  heroicInspirationRerollAvailabilityForRoll,
  heroicInspirationRerollDieIssue,
  heroicInspirationRerollOutcomeIssue,
  heroicInspirationRerollRollIssue,
  heroicInspirationUseForRoll,
  NO_HEROIC_INSPIRATION_USE,
  type HeroicInspirationRerollAvailability,
  type HeroicInspirationRollScope,
  type HeroicInspirationUse,
} from "./heroic-inspiration-reroll.ts";

/** The sources that may reroll a D20 Test other than an attack roll. */
export const D20_TEST_OUTCOME_REROLL_SOURCES = [
  "naturalOne",
  "heroicInspiration",
] as const;
type D20TestOutcomeRerollSource =
  (typeof D20_TEST_OUTCOME_REROLL_SOURCES)[number];

/** The reroll sources a D20 Test hole is asked again with. */
export type D20TestOutcomeRerollOptions =
  D20TestRerollSourceFlags<D20TestOutcomeRerollSource>;

/** Where one roll's D20 Test rerolls stand. */
export type D20TestOutcomeRerolls<Roll> =
  | {
      readonly tag: "decisionsRequired";
      readonly options: D20TestOutcomeRerollOptions;
    }
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "resolved";
      /** The roll that stands. */
      readonly roll: Roll;
      readonly heroicInspirationUse: HeroicInspirationUse;
    };

/** The roll being checked: where it belongs, and who rolled it for which hole. */
type D20TestRollContext = {
  readonly state: BattleState;
  readonly scope: HeroicInspirationRollScope;
  readonly roll: BattleD20TestRollKey;
};

type D20TestRollSourceFacts = {
  readonly context: D20TestRollContext;
  readonly heroicInspirationAvailability: HeroicInspirationRerollAvailability;
};

function d20TestRollSourceFacts(
  context: D20TestRollContext,
): D20TestRollSourceFacts {
  return {
    context,
    heroicInspirationAvailability: heroicInspirationRerollAvailabilityForRoll(
      context.state,
      context.scope,
      context.roll,
    ),
  };
}

function roller(context: D20TestRollContext) {
  return context.state.combatants.get(context.roll.rollerId);
}

function resolvedD20TestOutcomeRerolls<Roll, Decision>(
  facts: D20TestRollSourceFacts,
  roll: Roll,
  decisions: readonly Decision[],
  rules: D20TestRerollRules<Roll, Decision, D20TestOutcomeRerollSource>,
): D20TestOutcomeRerolls<Roll> {
  const rerolls = d20TestRerolls({ roll, decisions, rules });
  if (rerolls.tag !== "resolved") return rerolls;
  return {
    tag: "resolved",
    roll: rerolls.roll,
    heroicInspirationUse: heroicInspirationUseForRoll({
      state: facts.context.state,
      scope: facts.context.scope,
      roll: facts.context.roll,
      rerolledWithHeroicInspiration: rerolls.rerolled.heroicInspiration,
    }),
  };
}

type D20TestRolledOutcome = {
  readonly succeeded: boolean;
  readonly d20TestRoll: BattleD20TestRoll;
};

/**
 * A saving throw's outcome after its reroll decisions: whether it succeeds,
 * by the table's ruling on the roll that stands.
 */
export function d20TestOutcomeRerolls<T extends BattleD20TestOutcome>(
  input: D20TestRollContext & { readonly outcome: T },
): D20TestOutcomeRerolls<T> {
  const outcome = input.outcome;
  if (outcome.withoutRoll === true) {
    // Typed callers cannot build a without-roll outcome that carries a roll or
    // reroll decisions; decoded or weak input can, and is refused here.
    if (
      outcome.d20TestRoll !== undefined ||
      outcome.d20TestRerolls !== undefined
    ) {
      return { tag: "invalid", issue: D20_TEST_REROLL_WITHOUT_ROLL_MESSAGE };
    }
    return {
      tag: "resolved",
      roll: outcome,
      heroicInspirationUse: NO_HEROIC_INSPIRATION_USE,
    };
  }
  const facts = d20TestRollSourceFacts(input);
  const actor = roller(input);
  const rules: D20TestRerollRules<
    D20TestRolledOutcome,
    BattleRolledOutcomeD20TestRerollDecision,
    D20TestOutcomeRerollSource
  > = {
    sources: D20_TEST_OUTCOME_REROLL_SOURCES,
    step: (roll, decision) =>
      Match.value(decision).pipe(
        Match.discriminatorsExhaustive("effectKind")({
          [D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND]: (naturalOne) => ({
            source: "naturalOne" as const,
            issue: d20TestNaturalOneRerollOutcomeIssue({
              actor,
              originalD20TestRoll: roll.d20TestRoll,
              decision: naturalOne,
            }),
          }),
          [HEROIC_INSPIRATION_REROLL_EFFECT_KIND]: (heroicInspiration) => ({
            source: "heroicInspiration" as const,
            issue: heroicInspirationRerollOutcomeIssue({
              availability: facts.heroicInspirationAvailability,
              originalD20TestRoll: roll.d20TestRoll,
              decision: heroicInspiration,
            }),
          }),
        }),
      ),
    takesReroll: d20TestRerollDecisionTakesReroll,
    rollAfter: d20TestOutcomeAfterReroll,
    offered: {
      naturalOne: (roll) =>
        d20TestNaturalOneRerollOffered(actor, roll.d20TestRoll),
      heroicInspiration: () =>
        facts.heroicInspirationAvailability === "available",
    },
  };
  const rerolls = resolvedD20TestOutcomeRerolls(
    facts,
    { succeeded: outcome.succeeded, d20TestRoll: outcome.d20TestRoll },
    outcome.d20TestRerolls ?? [],
    rules,
  );
  return rerolls.tag === "resolved"
    ? {
        ...rerolls,
        roll: {
          ...outcome,
          succeeded: rerolls.roll.succeeded,
          d20TestRoll: rerolls.roll.d20TestRoll,
        },
      }
    : rerolls;
}

/** An ability check's value: its total and, when reported, its d20. */
type D20TestAbilityCheckValue = Extract<
  BattleFill,
  { readonly kind: "abilityCheck" }
>["value"];

/** An ability check's value after its reroll decisions: the total that stands. */
export function d20TestAbilityCheckRerolls(
  input: D20TestRollContext & {
    readonly value: D20TestAbilityCheckValue;
    readonly requiredRollMode: AttackRollMode | undefined;
  },
): D20TestOutcomeRerolls<D20TestAbilityCheckValue> {
  const actor = roller(input);
  const factsIssue = d20TestNaturalOneRerollRollFactsIssue(
    actor,
    input.value.d20TestRoll,
  );
  if (factsIssue !== null) return { tag: "invalid", issue: factsIssue };
  const facts = d20TestRollSourceFacts(input);
  const rules: D20TestRerollRules<
    D20TestAbilityCheckValue,
    BattleAbilityCheckD20TestRerollDecision,
    D20TestOutcomeRerollSource
  > = {
    sources: D20_TEST_OUTCOME_REROLL_SOURCES,
    step: (roll, decision) =>
      Match.value(decision).pipe(
        Match.discriminatorsExhaustive("effectKind")({
          [D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND]: (naturalOne) => ({
            source: "naturalOne" as const,
            issue: d20TestNaturalOneRerollRollIssue({
              actor,
              total: roll.total,
              originalD20TestRoll: roll.d20TestRoll,
              decision: naturalOne,
              requiredRollMode: input.requiredRollMode,
            }),
          }),
          [HEROIC_INSPIRATION_REROLL_EFFECT_KIND]: (heroicInspiration) => ({
            source: "heroicInspiration" as const,
            issue: heroicInspirationRerollRollIssue({
              availability: facts.heroicInspirationAvailability,
              total: roll.total,
              originalD20TestRoll: roll.d20TestRoll,
              decision: heroicInspiration,
              requiredRollMode: input.requiredRollMode,
            }),
          }),
        }),
      ),
    takesReroll: d20TestRerollDecisionTakesReroll,
    rollAfter: d20TestRollAfterReroll,
    offered: {
      naturalOne: (roll) =>
        d20TestNaturalOneRerollOffered(actor, roll.d20TestRoll),
      heroicInspiration: () =>
        facts.heroicInspirationAvailability === "available",
    },
  };
  return resolvedD20TestOutcomeRerolls(
    facts,
    input.value,
    input.value.d20TestRerolls ?? [],
    rules,
  );
}

/** A Death Saving Throw after its reroll decisions: the d20 that stands. */
export function d20TestDeathSavingThrowRerolls(
  input: D20TestRollContext & {
    readonly fill: Extract<BattleFill, { readonly kind: "deathSavingThrow" }>;
  },
): D20TestOutcomeRerolls<BattleD20TestDieReplacement> {
  const actor = roller(input);
  const facts = d20TestRollSourceFacts(input);
  const rules: D20TestRerollRules<
    BattleD20TestDieReplacement,
    BattleDeathSavingThrowD20TestRerollDecision,
    D20TestOutcomeRerollSource
  > = {
    sources: D20_TEST_OUTCOME_REROLL_SOURCES,
    step: (roll, decision) =>
      Match.value(decision).pipe(
        Match.discriminatorsExhaustive("effectKind")({
          [D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND]: (naturalOne) => ({
            source: "naturalOne" as const,
            issue: d20TestNaturalOneRerollDieIssue({
              actor,
              originalNaturalD20: Number(roll),
              decision: naturalOne,
            }),
          }),
          [HEROIC_INSPIRATION_REROLL_EFFECT_KIND]: (heroicInspiration) => ({
            source: "heroicInspiration" as const,
            issue: heroicInspirationRerollDieIssue({
              availability: facts.heroicInspirationAvailability,
              decision: heroicInspiration,
            }),
          }),
        }),
      ),
    takesReroll: d20TestRerollDecisionTakesReroll,
    rollAfter: d20TestDieAfterReroll,
    offered: {
      naturalOne: (roll) =>
        d20TestNaturalOneRerollDieOffered(actor, Number(roll)),
      heroicInspiration: () =>
        facts.heroicInspirationAvailability === "available",
    },
  };
  return resolvedD20TestOutcomeRerolls(
    facts,
    input.fill.value,
    input.fill.d20TestRerolls ?? [],
    rules,
  );
}

/**
 * The D20 Test hole asked again with the reroll options its roller has not
 * decided on yet.
 */
export function d20TestHoleWithRerollOptions<T extends BattleHole>(
  hole: T,
  options: D20TestOutcomeRerollOptions,
): T {
  const withNaturalOne: T = options.naturalOne
    ? d20TestHoleWithNaturalOneRerollOption(hole)
    : hole;
  return options.heroicInspiration
    ? d20TestHoleWithHeroicInspirationRerollOption(withNaturalOne)
    : withNaturalOne;
}

// The rolls that stand. Each owner that reads a D20 Test outcome reads it
// through one of these, after the decisions were checked.

/** A rolled saving throw's outcome after its reroll decisions. */
export function d20TestOutcomeThatStands<T extends BattleD20TestOutcome>(
  outcome: T,
): T {
  if (outcome.withoutRoll === true) return outcome;
  const stands = d20TestRollAfterRerolls<
    D20TestRolledOutcome,
    BattleRolledOutcomeD20TestRerollDecision
  >(
    { succeeded: outcome.succeeded, d20TestRoll: outcome.d20TestRoll },
    outcome.d20TestRerolls ?? [],
    d20TestOutcomeAfterReroll,
  );
  return {
    ...outcome,
    succeeded: stands.succeeded,
    d20TestRoll: stands.d20TestRoll,
  };
}

/** Every target's saving throw outcome after its reroll decisions. */
export function savingThrowOutcomesThatStand<
  T extends { readonly outcomes: readonly BattleSavingThrowOutcome[] },
>(value: T): T {
  return {
    ...value,
    outcomes: value.outcomes.map(d20TestOutcomeThatStands),
  };
}

/** A saving throw fill whose every outcome is the one that stands. */
export function savingThrowOutcomeFillThatStands<
  T extends Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
>(fill: T): T {
  return { ...fill, value: savingThrowOutcomesThatStand(fill.value) };
}

/** A Concentration saving throw fill whose outcome is the one that stands. */
export function concentrationSavingThrowFillThatStands<
  T extends Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>,
>(fill: T): T {
  return { ...fill, value: d20TestOutcomeThatStands(fill.value) };
}

/** An ability check's value after its reroll decisions: the total that stands. */
export function abilityCheckValueThatStands<T extends D20TestAbilityCheckValue>(
  value: T,
): T {
  return d20TestRollAfterRerolls(
    value,
    value.d20TestRerolls ?? [],
    d20TestRollAfterReroll,
  );
}

/** A Death Saving Throw's d20 after its reroll decisions. */
export function deathSavingThrowThatStands(
  fill: Extract<BattleFill, { readonly kind: "deathSavingThrow" }>,
): BattleD20TestDieReplacement {
  return d20TestRollAfterRerolls(
    fill.value,
    fill.d20TestRerolls ?? [],
    d20TestDieAfterReroll,
  );
}
