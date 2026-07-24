import type { WeaponRecord } from "@dnd/surface/surface/types";

import { battleObjectId } from "./identity.ts";
import type { CharacterWeaponAttackExecutionWeapon } from "./battle-action-options.ts";

export function admitCharacterWeaponAttackExecutionWeapon(
  weapon: WeaponRecord,
  itemId: string,
): CharacterWeaponAttackExecutionWeapon {
  return {
    weaponUnitId: weapon.id,
    weaponObjectId: battleObjectId(itemId),
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
