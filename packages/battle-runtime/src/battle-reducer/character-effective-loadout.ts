// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.OBJECT_INTERACTION_COST
import type { CharacterBattleLoadoutRef } from "../character-creature-execution-facts.ts";
import type {
  BattleState,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";

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
    groundObjects?.has(selected.weapon.itemId) === true
      ? {}
      : { weapon: selected.weapon }),
    ...(selected.offHandWeapon === undefined ||
    groundObjects?.has(selected.offHandWeapon.itemId) === true
      ? {}
      : { offHandWeapon: selected.offHandWeapon }),
  };
}
