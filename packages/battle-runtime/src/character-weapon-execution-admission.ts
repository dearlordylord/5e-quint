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

/** Bind admitted definition facts to the character's selected authored weapon. */
export function bindCharacterWeaponExecutionWeapon(input: {
  readonly weaponUnitId: UnitId;
  readonly definition: AdmittedWeaponDefinition;
  readonly weaponMasteries: readonly CharacterBattleWeaponMasterySelection[];
}): CharacterWeaponAttackExecutionWeapon {
  if (
    weaponMasteryIsSelectedForWeapon(input.weaponUnitId, input.weaponMasteries)
  ) {
    return { weaponUnitId: input.weaponUnitId, ...input.definition.facts };
  }
  const { masteryProperty: _masteryProperty, ...facts } =
    input.definition.facts;
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
