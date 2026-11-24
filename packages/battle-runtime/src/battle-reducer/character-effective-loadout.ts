// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.OBJECT_INTERACTION_COST
import type { CharacterBattleLoadoutRef } from "../character-creature-execution-facts.ts";
import type {
  BattleState,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type { BattleObjectId, CombatantId } from "../identity.ts";

export function characterEffectiveLoadout(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): CharacterBattleLoadoutRef {
  return characterEffectiveLoadoutFromOrigin(
    state,
    actor.combatantId,
    actor.origin,
  );
}

export function characterEffectiveLoadoutFromOrigin(
  state: BattleState,
  actorId: CombatantId,
  origin: CharacterBattleCreatureState["origin"],
): CharacterBattleLoadoutRef {
  const selected = origin.selectedLoadout;
  const groundObjects = state.groundObjects.get(actorId);
  return {
    ...(selected.armor === undefined ||
    groundObjects?.has(selected.armor.itemId) === true
      ? {}
      : { armor: selected.armor }),
    ...(selected.shield === undefined ||
    groundObjects?.has(selected.shield.itemId) === true
      ? {}
      : { shield: selected.shield }),
    ...(selected.weapon === undefined ||
    !loadoutWeaponIsHeld(state, actorId, selected.weapon.itemId)
      ? {}
      : { weapon: selected.weapon }),
    ...(selected.offHandWeapon === undefined ||
    !loadoutWeaponIsHeld(state, actorId, selected.offHandWeapon.itemId)
      ? {}
      : { offHandWeapon: selected.offHandWeapon }),
  };
}

/** Whether the character has sheathed or stowed this loadout weapon. */
export function loadoutWeaponIsStowed(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
): boolean {
  return state.stowedLoadoutWeapons.get(actorId)?.has(objectId) === true;
}

/**
 * Whether a loadout weapon is still in its owner's hand: neither stowed nor
 * on the ground.
 */
export function loadoutWeaponIsHeld(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
): boolean {
  return (
    state.groundObjects.get(actorId)?.has(objectId) !== true &&
    !loadoutWeaponIsStowed(state, actorId, objectId)
  );
}
