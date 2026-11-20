// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// Heroic Inspiration (Rules Glossary): "If you (a player character) have Heroic
// Inspiration, you can expend it to reroll any die immediately after rolling
// it, and you must use the new roll." This owner offers it after a D20 Test
// roll and spends it when the reroll is taken.

import {
  NO_HEROIC_INSPIRATION,
  type HeroicInspiration,
} from "@dnd/shared/game-facts";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";

import {
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleAttackRollHole,
  type BattleSpellAttackRollHole,
  type BattleAttackRollResult,
  type BattleCreatureState,
  type BattleD20TestRoll,
  type BattleHeroicInspirationRerollDecision,
  type BattleHeroicInspirationRerollOption,
  type BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  attackRollAfterD20TestRollReroll,
  d20TestRolledDieRollReplacementIssue,
  d20TestRollReplacementRollIssue,
  type D20TestRollRerollMessages,
} from "./d20-test-roll-reroll.ts";

export const HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE =
  "Heroic Inspiration reroll needs a player character who has Heroic Inspiration.";
export const HEROIC_INSPIRATION_REROLL_DECISION_REQUIRED_MESSAGE =
  "Heroic Inspiration reroll requires an explicit reroll or decline decision.";
export const HEROIC_INSPIRATION_REROLL_DIE_FACE_REQUIRED_MESSAGE =
  "Heroic Inspiration reroll requires the rolled d20 faces.";
export const HEROIC_INSPIRATION_REROLL_STACKING_MESSAGE =
  "Heroic Inspiration reroll cannot be combined with another d20 reroll on the same roll.";

const HEROIC_INSPIRATION_REROLL_MESSAGES = {
  replacement:
    "Heroic Inspiration replacement roll is outside the d20 protocol.",
  mode: "Heroic Inspiration replacement roll mode does not match the current D20 Test rule.",
  stacking: HEROIC_INSPIRATION_REROLL_STACKING_MESSAGE,
  dieSelectionRequired:
    "Heroic Inspiration reroll under Advantage or Disadvantage must name the rolled die it replaces.",
  dieSelection: "Heroic Inspiration reroll must name a rolled die.",
  projection:
    "Heroic Inspiration rolled-die replacement does not match the projected D20 Test result.",
} as const satisfies D20TestRollRerollMessages;

const HEROIC_INSPIRATION_REROLL_OPTION = {
  effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  label: "Heroic Inspiration reroll",
} as const satisfies BattleHeroicInspirationRerollOption;

type HeroicInspirationRollFacts = {
  readonly actor: BattleCreatureState | undefined;
  readonly total?: number | undefined;
  readonly originalD20TestRoll: BattleD20TestRoll | undefined;
  readonly decision: BattleHeroicInspirationRerollDecision | undefined;
  /** Another source rerolls this roll: only one reroll per roll. */
  readonly otherD20RerollPresent: boolean;
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
    | { readonly kind: "decline" | "reroll" | "rerollRolledDie" }
    | undefined,
): boolean {
  return decision !== undefined && decision.kind !== "decline";
}

/** Whether the roll must be asked again with the Heroic Inspiration reroll option. */
export function heroicInspirationRerollRollDecisionRequired(
  input: Omit<HeroicInspirationRollFacts, "total" | "otherD20RerollPresent">,
): boolean {
  return (
    combatantHasHeroicInspiration(input.actor) &&
    input.originalD20TestRoll !== undefined &&
    input.decision === undefined
  );
}

/** The issue with a roll's Heroic Inspiration reroll decision, if any. */
export function heroicInspirationRerollRollIssue(
  input: HeroicInspirationRollFacts & {
    readonly requiredRollMode?: AttackRollMode | undefined;
  },
): string | null {
  const decision = input.decision;
  if (!combatantHasHeroicInspiration(input.actor)) {
    return decision === undefined
      ? null
      : HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE;
  }
  if (input.originalD20TestRoll === undefined) {
    return HEROIC_INSPIRATION_REROLL_DIE_FACE_REQUIRED_MESSAGE;
  }
  if (decision === undefined) {
    return HEROIC_INSPIRATION_REROLL_DECISION_REQUIRED_MESSAGE;
  }
  if (decision.kind === "decline") {
    return null;
  }
  const facts = {
    total: input.total,
    d20TestRoll: input.originalD20TestRoll,
  };
  return decision.kind === "rerollRolledDie"
    ? d20TestRolledDieRollReplacementIssue({
        facts,
        replacement: decision.replacement,
        requiredRollMode: input.requiredRollMode,
        otherD20RerollPresent: input.otherD20RerollPresent,
        messages: HEROIC_INSPIRATION_REROLL_MESSAGES,
        rerollableFace: anyD20Face,
      })
    : d20TestRollReplacementRollIssue({
        facts,
        replacement: decision.replacement,
        requiredRollMode: input.requiredRollMode,
        otherD20RerollPresent: input.otherD20RerollPresent,
        messages: HEROIC_INSPIRATION_REROLL_MESSAGES,
      });
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

/** The attack roll after its Heroic Inspiration reroll decision. */
export function effectiveHeroicInspirationRerollAttackRoll(
  attackRoll: BattleAttackRollResult,
): BattleAttackRollResult {
  return attackRollAfterD20TestRollReroll(
    attackRoll,
    attackRoll.heroicInspirationReroll,
  );
}

/** Spends the attacker's Heroic Inspiration when the attack roll's decision takes the reroll. */
export function battleStateAfterHeroicInspirationReroll(
  state: BattleState,
  actorId: CombatantId,
  decision: BattleHeroicInspirationRerollDecision | undefined,
): BattleState {
  if (!d20TestRerollDecisionTakesReroll(decision)) {
    return state;
  }
  const actor = state.combatants.get(actorId);
  /* v8 ignore next -- @preserve -- A validated Heroic Inspiration reroll belongs to a character who has it. */
  if (actor?.origin.kind !== "character") return state;
  const spent: HeroicInspiration = NO_HEROIC_INSPIRATION;
  const combatants = new Map(state.combatants);
  combatants.set(actorId, {
    ...actor,
    origin: { ...actor.origin, heroicInspiration: spent },
  });
  return { ...state, combatants };
}

function anyD20Face(): boolean {
  return true;
}
