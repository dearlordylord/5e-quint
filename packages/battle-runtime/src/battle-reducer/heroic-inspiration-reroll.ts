// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// Heroic Inspiration (Rules Glossary): "If you (a player character) have Heroic
// Inspiration, you can expend it to reroll any die immediately after rolling
// it, and you must use the new roll." This owner offers it after any D20 Test
// a player character rolls (an attack roll, an ability check, a saving throw
// or a Death Saving Throw) and spends it when the reroll is taken.

import { NO_HEROIC_INSPIRATION } from "@dnd/shared/game-facts";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { Brand, Match } from "effect";

import {
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleCreatureState,
  type BattleD20TestRoll,
  type BattleD20TestRollKey,
  type BattleHeroicInspirationDieRerollDecision,
  type BattleHeroicInspirationOutcomeRerollDecision,
  type BattleHeroicInspirationRerollDecision,
  type BattleHeroicInspirationRerollOption,
  type BattleState,
} from "../battle-state-execution.ts";
import {
  d20TestOutcomeReplacementIssue,
  d20TestRolledDieRollReplacementIssue,
  d20TestRollReplacementRollIssue,
  type D20TestRollRerollMessages,
} from "./d20-test-roll-reroll.ts";
import {
  battleStateWithD20TestRerollPaid,
  d20TestRerollPaidOnRoll,
  d20TestRerollSpendAvailability,
  d20TestRerollSpendGate,
  type D20TestRerollSpendAvailability,
  type D20TestRerollSpendRecord,
  type D20TestRerollSpendScope,
} from "./d20-test-reroll-spend.ts";

const HEROIC_INSPIRATION_SPEND_RECORD =
  "acceptedHeroicInspirationRerolls" satisfies D20TestRerollSpendRecord;

export const HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE =
  "Heroic Inspiration reroll needs a player character who has Heroic Inspiration.";
export const HEROIC_INSPIRATION_REROLL_DIE_MESSAGE =
  "Heroic Inspiration replacement die must be a d20 face from 1 to 20.";

const HEROIC_INSPIRATION_REROLL_MESSAGES = {
  replacement:
    "Heroic Inspiration replacement roll is outside the d20 protocol.",
  mode: "Heroic Inspiration replacement roll mode does not match the current D20 Test rule.",
  dieSelectionRequired:
    "Heroic Inspiration reroll under Advantage or Disadvantage must name the rolled die it replaces.",
  dieSelection: "Heroic Inspiration reroll must name a rolled die.",
  projection:
    "Heroic Inspiration rolled-die replacement does not match the projected D20 Test result.",
  modifier:
    "Heroic Inspiration replacement roll must keep the original roll's modifiers; only the d20 changes.",
} as const satisfies D20TestRollRerollMessages;

export const HEROIC_INSPIRATION_REROLL_ROLL_REQUIRED_MESSAGE =
  "A Heroic Inspiration reroll needs the d20 roll it replaces, so that only the d20 changes.";

// A function, not a module constant: this module sits on an import cycle
// through battle-state-execution.ts, which owns the effect kind.
function heroicInspirationRerollOption(): BattleHeroicInspirationRerollOption {
  return {
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    label: "Heroic Inspiration reroll",
  };
}

/** Whether the creature is a player character who has Heroic Inspiration. */
export function combatantHasHeroicInspiration(
  actor: BattleCreatureState | undefined,
): boolean {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.heroicInspiration.tag === "available"
  );
}

/** Whether a decision takes a reroll (as opposed to declining it). */
export function d20TestRerollDecisionTakesReroll(decision: {
  readonly kind: "decline" | "reroll" | "rerollRolledDie";
}): boolean {
  return decision.kind !== "decline";
}

/**
 * Where the roller's Heroic Inspiration stands for this roll. A replay after
 * a reaction window resolves the subject's rolls again from the state after a
 * spend, so the roll that spent it can take it again, and an earlier roll's
 * decline still stands.
 */
export function heroicInspirationRerollAvailabilityForRoll(
  state: BattleState,
  scope: D20TestRerollSpendScope,
  roll: BattleD20TestRollKey,
): D20TestRerollSpendAvailability {
  return d20TestRerollSpendAvailability({
    state,
    scope,
    record: HEROIC_INSPIRATION_SPEND_RECORD,
    roll,
    rollerCanPay: combatantHasHeroicInspiration(
      state.combatants.get(roll.rollerId),
    ),
  });
}

/**
 * Whether an admitted roll spends its roller's Heroic Inspiration. Only
 * {@link heroicInspirationUseForRoll} makes one, so the spend follows a
 * checked decision.
 */
export type HeroicInspirationUse = Brand.Branded<
  | { readonly spends: false }
  | {
      readonly spends: true;
      readonly scope: D20TestRerollSpendScope;
      readonly roll: BattleD20TestRollKey;
    },
  "HeroicInspirationUse"
>;
const HeroicInspirationUse = Brand.nominal<HeroicInspirationUse>();

/** A roll that doesn't spend Heroic Inspiration. */
export const NO_HEROIC_INSPIRATION_USE: HeroicInspirationUse =
  HeroicInspirationUse({ spends: false });

/**
 * The Heroic Inspiration use of a roll whose reroll decisions were checked:
 * it spends when Heroic Inspiration rerolled the roll and an earlier pass of
 * the subject hasn't already spent it on this roll.
 */
export function heroicInspirationUseForRoll(input: {
  readonly state: BattleState;
  readonly scope: D20TestRerollSpendScope;
  readonly roll: BattleD20TestRollKey;
  readonly rerolledWithHeroicInspiration: boolean;
}): HeroicInspirationUse {
  return input.rerolledWithHeroicInspiration &&
    !d20TestRerollPaidOnRoll({
      ...input,
      record: HEROIC_INSPIRATION_SPEND_RECORD,
    })
    ? HeroicInspirationUse({
        spends: true,
        scope: input.scope,
        roll: input.roll,
      })
    : NO_HEROIC_INSPIRATION_USE;
}

/**
 * Spends the roller's Heroic Inspiration for an admitted roll that took its
 * reroll, and records the roll for the rest of the subject. On a replay of the
 * subject the same roll finds it already spent and changes nothing.
 */
export function battleStateAfterHeroicInspirationReroll(
  state: BattleState,
  use: HeroicInspirationUse,
): BattleState {
  if (
    !use.spends ||
    d20TestRerollPaidOnRoll({
      state,
      scope: use.scope,
      record: HEROIC_INSPIRATION_SPEND_RECORD,
      roll: use.roll,
    })
  )
    return state;
  const actor = state.combatants.get(use.roll.rollerId);
  /* v8 ignore next -- @preserve -- A validated Heroic Inspiration reroll belongs to a character. */
  if (actor?.origin.kind !== "character") return state;
  if (actor.origin.heroicInspiration.tag === "none") {
    return state;
  }
  const spent: BattleState = {
    ...state,
    combatants: new Map(state.combatants).set(use.roll.rollerId, {
      ...actor,
      origin: { ...actor.origin, heroicInspiration: NO_HEROIC_INSPIRATION },
    }),
  };
  return battleStateWithD20TestRerollPaid({
    state: spent,
    scope: use.scope,
    record: HEROIC_INSPIRATION_SPEND_RECORD,
    roll: use.roll,
  });
}

/**
 * The issue with a Heroic Inspiration decision on a roll with a total (an
 * attack roll or an ability check), if any.
 */
export function heroicInspirationRerollRollIssue(input: {
  readonly availability: D20TestRerollSpendAvailability;
  readonly total: number;
  /** The roll as it stands: the original roll, or another source's reroll of it. */
  readonly originalD20TestRoll: BattleD20TestRoll | undefined;
  readonly decision: BattleHeroicInspirationRerollDecision;
  readonly requiredRollMode?: AttackRollMode | undefined;
}): string | null {
  const decision = input.decision;
  const gate = d20TestRerollSpendGate({
    availability: input.availability,
    decision,
    unavailableMessage: HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE,
  });
  if (gate.tag === "finished") return gate.issue;
  if (decision.kind !== "decline" && input.originalD20TestRoll === undefined) {
    return HEROIC_INSPIRATION_REROLL_ROLL_REQUIRED_MESSAGE;
  }
  const facts = {
    total: input.total,
    d20TestRoll: input.originalD20TestRoll,
  };
  return Match.value(decision).pipe(
    Match.discriminatorsExhaustive("kind")({
      decline: () => null,
      reroll: ({ replacement }) =>
        d20TestRollReplacementRollIssue({
          facts,
          replacement,
          requiredRollMode: input.requiredRollMode,
          messages: HEROIC_INSPIRATION_REROLL_MESSAGES,
        }),
      rerollRolledDie: ({ replacement }) =>
        d20TestRolledDieRollReplacementIssue({
          facts,
          replacement,
          requiredRollMode: input.requiredRollMode,
          messages: HEROIC_INSPIRATION_REROLL_MESSAGES,
          rerollableFace: anyD20Face,
        }),
    }),
  );
}

/**
 * The issue with a Heroic Inspiration decision on a rolled outcome whose
 * success the table rules, if any. The replacement states the new roll and
 * whether it succeeds; under Advantage or Disadvantage it rerolls one die.
 */
export function heroicInspirationRerollOutcomeIssue(input: {
  readonly availability: D20TestRerollSpendAvailability;
  /** The roll as it stands: the original roll, or another source's reroll of it. */
  readonly originalD20TestRoll: BattleD20TestRoll;
  readonly decision: BattleHeroicInspirationOutcomeRerollDecision;
}): string | null {
  const decision = input.decision;
  const gate = d20TestRerollSpendGate({
    availability: input.availability,
    decision,
    unavailableMessage: HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE,
  });
  if (gate.tag === "finished") return gate.issue;
  return decision.kind === "decline"
    ? null
    : d20TestOutcomeReplacementIssue({
        originalD20TestRoll: input.originalD20TestRoll,
        replacement: decision,
        messages: HEROIC_INSPIRATION_REROLL_MESSAGES,
        rerollableFace: anyD20Face,
      });
}

/** The issue with a Heroic Inspiration decision on a bare d20 roll, if any. */
export function heroicInspirationRerollDieIssue(input: {
  readonly availability: D20TestRerollSpendAvailability;
  readonly decision: BattleHeroicInspirationDieRerollDecision;
}): string | null {
  const decision = input.decision;
  const gate = d20TestRerollSpendGate({
    availability: input.availability,
    decision,
    unavailableMessage: HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE,
  });
  if (gate.tag === "finished") return gate.issue;
  return Match.value(decision).pipe(
    Match.discriminatorsExhaustive("kind")({
      decline: () => null,
      reroll: ({ replacement }) => {
        const face = Number(replacement);
        return Number.isInteger(face) && face >= 1 && face <= 20
          ? null
          : HEROIC_INSPIRATION_REROLL_DIE_MESSAGE;
      },
    }),
  );
}

/** The D20 Test hole, asked again with the Heroic Inspiration reroll option. */
export function d20TestHoleWithHeroicInspirationRerollOption<T extends object>(
  hole: T,
): T & {
  readonly heroicInspirationRerolls: readonly [
    BattleHeroicInspirationRerollOption,
  ];
} {
  return {
    ...hole,
    heroicInspirationRerolls: [heroicInspirationRerollOption()],
  };
}

function anyD20Face(): boolean {
  return true;
}
