import { Result } from "effect";
import type { WeaponMasteryReferenceResolution } from "@dnd/surface/surface/unit-catalog";
import type { WeaponRecord } from "@dnd/surface/surface/types";

import type { BattleObjectId } from "./identity.ts";
import type { CharacterWeaponAttackExecutionWeapon } from "./battle-action-options.ts";
import type { CharacterWeaponAttackExecutionWeaponWithMasteryProperty } from "./character-weapon-execution-schema.ts";
import {
  weaponMasteryIsSelectedForWeapon,
  type CharacterBattleWeaponMasterySelection,
} from "./character-creature-execution-facts.ts";
import {
  battleWeaponMasteryExecutionPropertyForUnit,
  type BattleUnitSupportProfileIssue,
} from "./unit-feature-support.ts";

export type CharacterWeaponAttackExecutionAdmission = {
  readonly weapon: CharacterWeaponAttackExecutionWeapon;
  readonly weaponObjectId: BattleObjectId;
};

function characterWeaponExecutionFacts(
  weapon: WeaponRecord,
): Omit<CharacterWeaponAttackExecutionWeapon, "masteryProperty"> {
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
    costGp: weapon.costGp,
  };
}

export function admitCharacterWeaponExecutionWeapon(
  weapon: WeaponRecord,
): CharacterWeaponAttackExecutionWeapon {
  return characterWeaponExecutionFacts(weapon);
}

export function admitResolvedCharacterWeaponExecutionWeapon(
  resolution: WeaponMasteryReferenceResolution,
): Result.Result<
  CharacterWeaponAttackExecutionWeaponWithMasteryProperty,
  BattleUnitSupportProfileIssue
> {
  const { weapon, mastery } = resolution;
  const masteryProperty = battleWeaponMasteryExecutionPropertyForUnit(mastery);
  if (Result.isFailure(masteryProperty)) {
    return Result.fail(masteryProperty.failure);
  }
  return Result.succeed({
    ...characterWeaponExecutionFacts(weapon),
    masteryProperty: masteryProperty.success,
  });
}

export function admitCharacterWeaponAttackExecutionWeapon(
  weapon: WeaponRecord,
  objectId: BattleObjectId,
): CharacterWeaponAttackExecutionAdmission {
  return {
    weapon: admitCharacterWeaponExecutionWeapon(weapon),
    weaponObjectId: objectId,
  };
}

export function admitResolvedCharacterWeaponAttackExecutionWeapon(
  resolution: WeaponMasteryReferenceResolution,
  objectId: BattleObjectId,
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
): Result.Result<
  CharacterWeaponAttackExecutionAdmission,
  BattleUnitSupportProfileIssue
> {
  if (
    !weaponMasteryIsSelectedForWeapon(resolution.weapon.id, weaponMasteries)
  ) {
    return Result.succeed({
      weapon: admitCharacterWeaponExecutionWeapon(resolution.weapon),
      weaponObjectId: objectId,
    });
  }
  const weapon = admitResolvedCharacterWeaponExecutionWeapon(resolution);
  return Result.isFailure(weapon)
    ? Result.fail(weapon.failure)
    : Result.succeed({ weapon: weapon.success, weaponObjectId: objectId });
}
