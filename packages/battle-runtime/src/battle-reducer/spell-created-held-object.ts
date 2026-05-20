// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object

import type { HandUse } from "@dnd/shared/types";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleHand,
  BattleState,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { combatantHandUses } from "./creature-state-leaves.ts";

export const SPELL_CREATED_HELD_OBJECT_HAND_USE =
  "spellCreatedHeldObject" as const satisfies HandUse;

export function spellCreatedHeldObjectHasFreeHand(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return spellCreatedHeldObjectFreeHand(state, actorId) !== undefined;
}

export function spellCreatedHeldObjectFreeHand(
  state: BattleState,
  actorId: CombatantId,
): BattleHand | undefined {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return undefined;
  }
  const hands = combatantHandUses(actor, state.grapples);
  if (hands.left === "free") return "left";
  if (hands.right === "free") return "right";
  return undefined;
}

export function battleCreatureWithSpellCreatedHeldObjectHand(
  combatant: BattleCreatureState,
  hand: BattleHand,
): BattleCreatureState {
  const withoutPriorHand =
    battleCreatureWithoutSpellCreatedHeldObjectHand(combatant);
  return {
    ...withoutPriorHand,
    armorClass: {
      ...withoutPriorHand.armorClass,
      leftHandUse:
        hand === "left"
          ? SPELL_CREATED_HELD_OBJECT_HAND_USE
          : withoutPriorHand.armorClass.leftHandUse,
      rightHandUse:
        hand === "right"
          ? SPELL_CREATED_HELD_OBJECT_HAND_USE
          : withoutPriorHand.armorClass.rightHandUse,
    },
  };
}

export function battleCreatureWithoutSpellCreatedHeldObjectHand(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (
    combatant.armorClass.leftHandUse !== SPELL_CREATED_HELD_OBJECT_HAND_USE &&
    combatant.armorClass.rightHandUse !== SPELL_CREATED_HELD_OBJECT_HAND_USE
  ) {
    return combatant;
  }
  return {
    ...combatant,
    armorClass: {
      ...combatant.armorClass,
      leftHandUse:
        combatant.armorClass.leftHandUse === SPELL_CREATED_HELD_OBJECT_HAND_USE
          ? "free"
          : combatant.armorClass.leftHandUse,
      rightHandUse:
        combatant.armorClass.rightHandUse === SPELL_CREATED_HELD_OBJECT_HAND_USE
          ? "free"
          : combatant.armorClass.rightHandUse,
    },
  };
}

export function battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return combatant.activeEffects.some(spellCreatedHeldObjectEffectIsHeld)
    ? combatant
    : battleCreatureWithoutSpellCreatedHeldObjectHand(combatant);
}

function spellCreatedHeldObjectEffectIsHeld(
  effect: BattleActiveEffect,
): boolean {
  return (
    effect.kind === "spellCreatedHeldObject" &&
    effect.objectState.kind === "held"
  );
}
