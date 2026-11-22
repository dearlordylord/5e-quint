import type { UnitId } from "@dnd/shared/game-facts";

import type { BattleObjectId } from "./identity.ts";
import type { CharacterWeaponAttackExecutionWeapon } from "./battle-action-options.ts";
import {
  weaponMasteryIsSelectedForWeapon,
  type CharacterBattleWeaponMasterySelection,
} from "./character-creature-execution-facts.ts";
import type { AdmittedWeaponDefinition } from "./procedure-admission/weapon-definition.ts";

export type CharacterWeaponAttackExecutionAdmission = {
  readonly weapon: CharacterWeaponAttackExecutionWeapon;
  readonly weaponObjectId: BattleObjectId;
};

/**
 * Bind admitted definition facts to the character's selected authored weapon.
 * The weapon carries its mastery property only when the character selected
 * that weapon's mastery and Battle supports it.
 */
export function bindCharacterWeaponExecutionWeapon(input: {
  readonly weaponUnitId: UnitId;
  readonly definition: AdmittedWeaponDefinition;
  readonly weaponMasteries: readonly CharacterBattleWeaponMasterySelection[];
}): CharacterWeaponAttackExecutionWeapon {
  const definition = input.definition;
  if (definition.masterySupport === "unsupported") {
    return { weaponUnitId: input.weaponUnitId, ...definition.facts };
  }
  if (
    weaponMasteryIsSelectedForWeapon(input.weaponUnitId, input.weaponMasteries)
  ) {
    return { weaponUnitId: input.weaponUnitId, ...definition.facts };
  }
  const { masteryProperty: _masteryProperty, ...facts } = definition.facts;
  return { weaponUnitId: input.weaponUnitId, ...facts };
}

export function bindCharacterWeaponAttackExecutionWeapon(input: {
  readonly weaponUnitId: UnitId;
  readonly definition: AdmittedWeaponDefinition;
  readonly objectId: BattleObjectId;
  readonly weaponMasteries: readonly CharacterBattleWeaponMasterySelection[];
}): CharacterWeaponAttackExecutionAdmission {
  return {
    weapon: bindCharacterWeaponExecutionWeapon(input),
    weaponObjectId: input.objectId,
  };
}
