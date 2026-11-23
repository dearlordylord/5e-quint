// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// Heroic Inspiration (Rules Glossary): "If you (a player character) have Heroic
// Inspiration, you can expend it to reroll any die immediately after rolling
// it, and you must use the new roll." This owner offers it after an attack
// roll and spends it when the reroll is taken.

import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match } from "effect";

import {
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleAttackRollHole,
  type BattleSpellAttackRollHole,
  type BattleCreatureState,
  type BattleD20TestRoll,
  type BattleD20TestRollRerollDecision,
  type BattleHeroicInspirationRerollDecision,
  type BattleHeroicInspirationRerollOption,
  type BattleSpellAttackRerollDecision,
} from "../battle-state-execution.ts";
import {
  d20TestRolledDieRollReplacementIssue,
  d20TestRollReplacementRollIssue,
  type D20TestRollRerollMessages,
} from "./d20-test-roll-reroll.ts";

export const HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE =
  "Heroic Inspiration reroll needs a player character who has Heroic Inspiration.";
export const HEROIC_INSPIRATION_REROLL_DECISION_REQUIRED_MESSAGE =
  "Heroic Inspiration reroll requires an explicit reroll or decline decision.";

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

const HEROIC_INSPIRATION_REROLL_OPTION = {
  effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  label: "Heroic Inspiration reroll",
} as const satisfies BattleHeroicInspirationRerollOption;

/**
 * Where the roller's Heroic Inspiration can stand for one roll:
 * - "available": it has Heroic Inspiration, or this roll spent it before a replay;
 * - "spentOnAnotherRoll": another roll of the same subject spent it, so a
 *   decline made before that spend still stands;
 * - "unavailable": it has no Heroic Inspiration to decide about.
 */
export const HEROIC_INSPIRATION_REROLL_AVAILABILITIES = [
  "available",
  "spentOnAnotherRoll",
  "unavailable",
] as const;
/** One of {@link HEROIC_INSPIRATION_REROLL_AVAILABILITIES}. */
export type HeroicInspirationRerollAvailability =
  (typeof HEROIC_INSPIRATION_REROLL_AVAILABILITIES)[number];

type HeroicInspirationRollFacts = {
  readonly availability: HeroicInspirationRerollAvailability;
  readonly total: number;
  /** The roll as it stands: the original roll, or another source's reroll of it. */
  readonly originalD20TestRoll: BattleD20TestRoll;
  readonly decision: BattleHeroicInspirationRerollDecision | undefined;
};

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
export function d20TestRerollDecisionTakesReroll(
  decision:
    | BattleD20TestRollRerollDecision<string>
    | BattleSpellAttackRerollDecision
    | undefined,
): boolean {
  return decision !== undefined && decision.kind !== "decline";
}

/** The issue with a roll's Heroic Inspiration reroll decision, if any. */
export function heroicInspirationRerollRollIssue(
  input: HeroicInspirationRollFacts & {
    readonly requiredRollMode?: AttackRollMode | undefined;
  },
): string | null {
  const decision = input.decision;
  return Match.value(input.availability).pipe(
    Match.when("unavailable", () =>
      decision === undefined
        ? null
        : HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE,
    ),
    Match.when("spentOnAnotherRoll", () =>
      decision === undefined || decision.kind === "decline"
        ? null
        : HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE,
    ),
    Match.when("available", () => availableHeroicInspirationRerollIssue(input)),
    Match.exhaustive,
  );
}

function availableHeroicInspirationRerollIssue(
  input: HeroicInspirationRollFacts & {
    readonly requiredRollMode?: AttackRollMode | undefined;
  },
): string | null {
  const decision = input.decision;
  /* v8 ignore next -- @preserve -- attack-roll-d20-test-rerolls asks the roll again before it checks a missing decision. */
  if (decision === undefined) {
    return HEROIC_INSPIRATION_REROLL_DECISION_REQUIRED_MESSAGE;
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

/** The attack roll hole, asked again with the Heroic Inspiration reroll option. */
export function attackRollHoleWithHeroicInspirationRerollOption<
  T extends BattleAttackRollHole | BattleSpellAttackRollHole,
>(
  hole: T,
): T & {
  readonly heroicInspirationRerolls: readonly [
    BattleHeroicInspirationRerollOption,
  ];
} {
  return {
    ...hole,
    heroicInspirationRerolls: [HEROIC_INSPIRATION_REROLL_OPTION],
  };
}

function anyD20Face(): boolean {
  return true;
}
