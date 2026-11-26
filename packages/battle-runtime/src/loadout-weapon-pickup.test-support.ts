import type { BattleState } from "./battle-state-execution.ts";
import type { BattleObjectId, CombatantId } from "./identity.ts";
import { loadoutWeaponSlot } from "./battle-reducer/battle-object-lifecycle.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state-queries.ts";
import {
  stateWithOwnedWeaponChange,
  type OwnedWeaponChangeResult,
} from "./battle-reducer/owned-weapon-custody.ts";

/**
 * Picks a loadout weapon back up into its own hand slot, the way the
 * pick-up object interaction does, without charging the interaction. An
 * object that is no loadout weapon is tried in the main slot, so that the
 * weapon change refuses it.
 */
export function pickUpLoadoutWeapon(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
): OwnedWeaponChangeResult {
  const actor = state.combatants.get(actorId);
  const slot =
    actor !== undefined && isCharacterBattleCreatureState(actor)
      ? (loadoutWeaponSlot(actor.origin.selectedLoadout, objectId) ??
        "mainWeapon")
      : "mainWeapon";
  return stateWithOwnedWeaponChange(state, actorId, {
    kind: "equip",
    objectId,
    slot,
  });
}
