import type { UnitId } from "@dnd/shared/game-facts";
import type { WeaponRecord } from "@dnd/surface/surface/types";
import {
  type WeaponExecutionFacts,
} from "@dnd/shared-algebras/weapon-execution-facts";
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

/** Project a decoded Surface weapon into the canonical execution facts. */
export function weaponExecutionFactsFromRecord(
  weapon: WeaponRecord,
): WeaponExecutionFacts {
  return {
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

/** Add the selected Unit identity at the character-to-battle boundary. */
export function admitCharacterWeaponExecutionWeapon(
  input: {
    readonly weaponUnitId: UnitId;
    readonly facts: WeaponExecutionFacts;
  },
): CharacterWeaponAttackExecutionWeapon {
  return {
    weaponUnitId: input.weaponUnitId,
    ...input.facts,
  };
}

export function admitCharacterWeaponAttackExecutionWeapon(
  weapon: WeaponRecord,
  objectId: BattleObjectId,
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
): CharacterWeaponAttackExecutionAdmission {
  return {
    weapon: admitCharacterWeaponExecutionWeapon({
      weaponUnitId: weapon.id,
      facts: weaponExecutionFactsFromRecord(weapon),
    }),
    weaponObjectId: objectId,
    hasWeaponMastery: weaponMasteryIsSelectedForWeapon(
      weapon.id,
      weaponMasteries,
    ),
  };
}
