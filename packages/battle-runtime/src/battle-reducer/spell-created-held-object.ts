// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE

import type {
  BattleCreatureState,
  BattleHand,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { firstFreeHand } from "./creature-state-leaves.ts";

import {
  SPELL_CREATED_HELD_OBJECT_HAND_USE,
  battleCreatureWithoutSpellCreatedHeldObjectHand,
} from "../active-effect/lifecycle.ts";
export { battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects } from "../active-effect/lifecycle.ts";

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
  return firstFreeHand(state, actor, state.grapples);
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
