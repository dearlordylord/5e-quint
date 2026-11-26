// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_SAVING_THROW_REROLL
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.failed-saving-throw-reroll
// The D20 Tests other than attack rolls: saving throws (including
// Concentration saves), ability checks and Death Saving Throws. Each roll
// takes the natural-1 reroll and Heroic Inspiration, and a saving throw that
// stands failed also takes a failed saving throw reroll, in the order its
// roller chooses (ASSUMPTIONS.md A55). Every owner that reads the roll
// reads the roll that stands.

import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match } from "effect";

import {
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleAbilityCheckD20TestRerollDecision,
  type BattleD20TestDieReplacement,
  type BattleD20TestOutcome,
  type BattleD20TestRollKey,
  type BattleDeathSavingThrowD20TestRerollDecision,
  type BattleFailedSavingThrowRerollOption,
  type BattleFill,
  type BattleD20TestRerollHoleOptions,
  type BattleSavingThrowRerollHoleOptions,
  type BattleRolledOutcomeD20TestRerollDecision,
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
  d20TestDecisions,
  type D20TestDecisionRules,
  type D20TestSourceFlags,
} from "./d20-test-decision-sequence.ts";
import {
  d20TestDieAfterReroll,
  d20TestOutcomeAfterReroll,
  d20TestRollAfterReroll,
} from "./d20-test-roll-reroll.ts";
import type {
  D20TestAbilityCheckValue,
  D20TestRolledOutcome,
} from "./d20-test-rolls-that-stand.ts";
import type {
  D20TestSpendAvailability,
  D20TestSpendScope,
} from "./d20-test-source-spend.ts";
import {
  battleStateAfterFailedSavingThrowReroll,
  savingThrowHoleWithFailedSavingThrowRerollOption,
  failedSavingThrowRerollAvailabilityForRoll,
  failedSavingThrowRerollOffered,
  failedSavingThrowRerollOption,
  failedSavingThrowRerollOutcomeIssue,
  failedSavingThrowRerollUseForRoll,
  NO_FAILED_SAVING_THROW_REROLL_USE,
  type FailedSavingThrowRerollUse,
} from "./failed-saving-throw-reroll.ts";
import {
  battleStateAfterHeroicInspirationReroll,
  d20TestHoleWithHeroicInspirationRerollOption,
  d20TestRerollDecisionTakesReroll,
  heroicInspirationRerollAvailabilityForRoll,
  heroicInspirationRerollDieIssue,
  heroicInspirationRerollOutcomeIssue,
  heroicInspirationRerollRollIssue,
  heroicInspirationUseForRoll,
  NO_HEROIC_INSPIRATION_USE,
  type HeroicInspirationUse,
} from "./heroic-inspiration-reroll.ts";

/** The sources that may reroll a D20 Test other than an attack roll. */
export const D20_TEST_OUTCOME_REROLL_SOURCES = [
  "naturalOne",
  "heroicInspiration",
] as const;
type D20TestOutcomeRerollSource =
  (typeof D20_TEST_OUTCOME_REROLL_SOURCES)[number];

/** The sources that may reroll a saving throw. */
export const SAVING_THROW_REROLL_SOURCES = [
  ...D20_TEST_OUTCOME_REROLL_SOURCES,
  "failedSavingThrow",
] as const;
type SavingThrowRerollSource = (typeof SAVING_THROW_REROLL_SOURCES)[number];

/** The reroll sources a D20 Test hole is asked again with. */
export type D20TestOutcomeRerollOptions =
  D20TestSourceFlags<D20TestOutcomeRerollSource>;

/**
 * The reroll sources a saving throw hole is asked again with: the D20 Test
 * sources, and on a save that stands failed, the reroll its roller can take.
 */
export type SavingThrowRerollOptions = D20TestOutcomeRerollOptions & {
  readonly failedSavingThrowReroll?: BattleFailedSavingThrowRerollOption;
};

/** What the reroll sources an admitted D20 Test took cost its roller. */
export type D20TestRerollUses = {
  readonly heroicInspiration: HeroicInspirationUse;
};

/** What the reroll sources an admitted saving throw took cost its roller. */
export type SavingThrowRerollUses = D20TestRerollUses & {
  readonly failedSavingThrow: FailedSavingThrowRerollUse;
};

const NO_D20_TEST_REROLL_USES: D20TestRerollUses = {
  heroicInspiration: NO_HEROIC_INSPIRATION_USE,
};

const NO_SAVING_THROW_REROLL_USES: SavingThrowRerollUses = {
  ...NO_D20_TEST_REROLL_USES,
  failedSavingThrow: NO_FAILED_SAVING_THROW_REROLL_USE,
};

/** Spends what each admitted D20 Test's rerolls cost, in order. */
export function battleStateAfterD20TestRerollUses(
  state: BattleState,
  uses: readonly D20TestRerollUses[],
): BattleState {
  return uses.reduce(
    (current, use) =>
      battleStateAfterHeroicInspirationReroll(current, use.heroicInspiration),
    state,
  );
}

/** Spends what each admitted saving throw's rerolls cost, in order. */
export function battleStateAfterSavingThrowRerollUses(
  state: BattleState,
  uses: readonly SavingThrowRerollUses[],
): BattleState {
  return uses.reduce(
    (current, use) =>
      battleStateAfterFailedSavingThrowReroll(
        battleStateAfterD20TestRerollUses(current, [use]),
        use.failedSavingThrow,
      ),
    state,
  );
}

/** Where one roll's D20 Test rerolls stand. */
export type D20TestOutcomeRerolls<
  Roll,
  Options extends D20TestOutcomeRerollOptions = D20TestOutcomeRerollOptions,
  Uses extends D20TestRerollUses = D20TestRerollUses,
> =
  | {
      readonly tag: "decisionsRequired";
      readonly options: Options;
    }
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "resolved";
      /** The roll that stands. */
      readonly roll: Roll;
      readonly uses: Uses;
    };

/** Where one saving throw's rerolls stand. */
export type SavingThrowRerolls<Roll> = D20TestOutcomeRerolls<
  Roll,
  SavingThrowRerollOptions,
  SavingThrowRerollUses
>;

/** The roll being checked: where it belongs, and who rolled it for which hole. */
type D20TestRollContext = {
  readonly state: BattleState;
  readonly scope: D20TestSpendScope;
  readonly roll: BattleD20TestRollKey;
};

type D20TestRollSourceFacts = {
  readonly context: D20TestRollContext;
  readonly heroicInspirationAvailability: D20TestSpendAvailability;
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
  rules: D20TestDecisionRules<Roll, Decision, D20TestOutcomeRerollSource>,
): D20TestOutcomeRerolls<Roll> {
  const rerolls = d20TestDecisions({ roll, decisions, rules });
  if (rerolls.tag !== "resolved") return rerolls;
  return {
    tag: "resolved",
    roll: rerolls.roll,
    uses: {
      heroicInspiration: heroicInspirationUse(
        facts,
        rerolls.taken.heroicInspiration,
      ),
    },
  };
}

function heroicInspirationUse(
  facts: D20TestRollSourceFacts,
  rerolled: boolean,
): HeroicInspirationUse {
  return heroicInspirationUseForRoll({
    state: facts.context.state,
    scope: facts.context.scope,
    roll: facts.context.roll,
    rerolledWithHeroicInspiration: rerolled,
  });
}

/**
 * A saving throw's outcome after its reroll decisions: whether it succeeds,
 * by the table's ruling on the roll that stands.
 */
export function d20TestOutcomeRerolls<T extends BattleD20TestOutcome>(
  input: D20TestRollContext & { readonly outcome: T },
): SavingThrowRerolls<T> {
  const outcome = input.outcome;
  if (outcome.withoutRoll === true) {
    // Typed callers cannot build a without-roll outcome that carries a roll,
    // reroll decisions or added dice; decoded or weak input can, and is
    // refused here.
    if (
      outcome.d20TestRoll !== undefined ||
      outcome.d20TestRerolls !== undefined ||
      outcome.d20TestAddedDice !== undefined
    ) {
      return { tag: "invalid", issue: D20_TEST_REROLL_WITHOUT_ROLL_MESSAGE };
    }
    return {
      tag: "resolved",
      roll: outcome,
      uses: NO_SAVING_THROW_REROLL_USES,
    };
  }
  const facts = d20TestRollSourceFacts(input);
  const actor = roller(input);
  const failedSavingThrowAvailability =
    failedSavingThrowRerollAvailabilityForRoll(
      input.state,
      input.scope,
      input.roll,
    );
  const rules: D20TestDecisionRules<
    D20TestRolledOutcome,
    BattleRolledOutcomeD20TestRerollDecision,
    SavingThrowRerollSource
  > = {
    sources: SAVING_THROW_REROLL_SOURCES,
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
          [FAILED_SAVING_THROW_REROLL_EFFECT_KIND]: (failedSavingThrow) => ({
            source: "failedSavingThrow" as const,
            issue: failedSavingThrowRerollOutcomeIssue({
              availability: failedSavingThrowAvailability,
              roll,
              decision: failedSavingThrow,
            }),
          }),
        }),
      ),
    takes: d20TestRerollDecisionTakesReroll,
    rollAfter: d20TestOutcomeAfterReroll,
    offered: {
      naturalOne: (roll) =>
        d20TestNaturalOneRerollOffered(actor, roll.d20TestRoll),
      heroicInspiration: () =>
        facts.heroicInspirationAvailability === "available",
      failedSavingThrow: (roll) =>
        failedSavingThrowRerollOffered({
          availability: failedSavingThrowAvailability,
          succeeded: roll.succeeded,
        }),
    },
  };
  const rerolls = d20TestDecisions({
    roll: { succeeded: outcome.succeeded, d20TestRoll: outcome.d20TestRoll },
    decisions: outcome.d20TestRerolls ?? [],
    rules,
  });
  return Match.value(rerolls).pipe(
    Match.discriminatorsExhaustive("tag")({
      invalid: (invalid): SavingThrowRerolls<T> => invalid,
      decisionsRequired: ({ options }): SavingThrowRerolls<T> => {
        const failedSavingThrowReroll = options.failedSavingThrow
          ? failedSavingThrowRerollOption(actor, input.roll)
          : undefined;
        return {
          tag: "decisionsRequired",
          options: {
            naturalOne: options.naturalOne,
            heroicInspiration: options.heroicInspiration,
            ...(failedSavingThrowReroll === undefined
              ? {}
              : { failedSavingThrowReroll }),
          },
        };
      },
      resolved: (resolved): SavingThrowRerolls<T> => ({
        tag: "resolved",
        roll: {
          ...outcome,
          succeeded: resolved.roll.succeeded,
          d20TestRoll: resolved.roll.d20TestRoll,
        },
        uses: {
          heroicInspiration: heroicInspirationUse(
            facts,
            resolved.taken.heroicInspiration,
          ),
          failedSavingThrow: failedSavingThrowRerollUseForRoll({
            state: input.state,
            scope: input.scope,
            roll: input.roll,
            rerolled: resolved.taken.failedSavingThrow,
          }),
        },
      }),
    }),
  );
}

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
  const rules: D20TestDecisionRules<
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
    takes: d20TestRerollDecisionTakesReroll,
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
  const rules: D20TestDecisionRules<
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
    takes: d20TestRerollDecisionTakesReroll,
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
export function d20TestHoleWithRerollOptions<
  T extends BattleD20TestRerollHoleOptions,
>(hole: T, options: D20TestOutcomeRerollOptions): T {
  const withNaturalOne: T = options.naturalOne
    ? d20TestHoleWithNaturalOneRerollOption(hole)
    : hole;
  return options.heroicInspiration
    ? d20TestHoleWithHeroicInspirationRerollOption(withNaturalOne)
    : withNaturalOne;
}

/**
 * The saving throw hole asked again with the reroll options its roller has
 * not decided on yet.
 */
export function savingThrowHoleWithRerollOptions<
  T extends BattleSavingThrowRerollHoleOptions,
>(hole: T, options: SavingThrowRerollOptions): T {
  const withD20TestRerolls = d20TestHoleWithRerollOptions(hole, options);
  return options.failedSavingThrowReroll === undefined
    ? withD20TestRerolls
    : savingThrowHoleWithFailedSavingThrowRerollOption(
        withD20TestRerolls,
        options.failedSavingThrowReroll,
      );
}
