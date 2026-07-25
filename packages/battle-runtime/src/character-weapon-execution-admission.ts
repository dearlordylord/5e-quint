import type { WeaponRecord } from "@dnd/surface/surface/types";

import type { BattleObjectId } from "./identity.ts";
import type { CharacterWeaponAttackExecutionWeapon } from "./battle-action-options.ts";
import {
  weaponMasteryIsSelectedForWeapon,
  type CharacterBattleWeaponMasterySelection,
} from "./character-creature-execution-facts.ts";

export type CharacterWeaponAttackExecutionAdmission = {
  readonly weapon: CharacterWeaponAttackExecutionWeapon;
  readonly weaponObjectId: BattleObjectId;
  readonly hasWeaponMastery: boolean;
};

export function admitCharacterWeaponExecutionWeapon(
  weapon: WeaponRecord,
): CharacterWeaponAttackExecutionWeapon {
  return {
    weaponUnitId: weapon.id,
    ...(weapon.attachedWeaponAttackOverrideEligibility === undefined
      ? {}
      : {
          attachedWeaponAttackOverrideEligibility:
            weapon.attachedWeaponAttackOverrideEligibility,
        }),
    category: weapon.category,
    usage: weapon.usage,
    damage: weapon.damage,
    properties: weapon.properties ?? [],
    mastery: weapon.mastery,
    costGp: weapon.costGp,
  };
}

export function admitCharacterWeaponAttackExecutionWeapon(
  weapon: WeaponRecord,
  objectId: BattleObjectId,
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
): CharacterWeaponAttackExecutionAdmission {
  return {
    weapon: admitCharacterWeaponExecutionWeapon(weapon),
    weaponObjectId: objectId,
    hasWeaponMastery: weaponMasteryIsSelectedForWeapon(
      weapon.id,
      weaponMasteries,
    ),
  };
}
