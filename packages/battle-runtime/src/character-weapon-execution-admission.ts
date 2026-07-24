import { type UnitId } from "@dnd/shared/game-facts";
import type { WeaponRecord } from "@dnd/surface/surface/types";

import type { BattleObjectId } from "./identity.ts";
import type { CharacterWeaponAttackExecutionWeapon } from "./battle-action-options.ts";

export type CharacterWeaponAttackExecutionAdmission = {
  readonly weapon: CharacterWeaponAttackExecutionWeapon;
  readonly weaponObjectId: BattleObjectId;
  readonly hasWeaponMastery: boolean;
};

export function admitCharacterWeaponAttackExecutionWeapon(
  weapon: WeaponRecord,
  objectId: BattleObjectId,
  weaponMasteries: readonly { readonly weaponUnitId: UnitId }[],
): CharacterWeaponAttackExecutionAdmission {
  return {
    weapon: {
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
    },
    weaponObjectId: objectId,
    hasWeaponMastery: weaponMasteries.some(
      (mastery) => mastery.weaponUnitId === weapon.id,
    ),
  };
}
