import type { UnitId } from "@dnd/shared/game-facts";
import { Result } from "effect";

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

/** The issues of a selected Weapon Mastery that Battle doesn't support. */
export type UnsupportedSelectedWeaponMasteryIssues = Extract<
  AdmittedWeaponDefinition,
  { readonly masterySupport: "unsupported" }
>["resolvedMastery"]["issues"];

/**
 * Bind admitted definition facts to the character's selected authored weapon.
 * The weapon carries its mastery property only when the character selected
 * that weapon's mastery. Selecting a mastery Battle doesn't support fails with
 * that mastery's issues; without the selection the weapon binds for ordinary
 * use.
 */
export function bindCharacterWeaponExecutionWeapon(input: {
  readonly weaponUnitId: UnitId;
  readonly definition: AdmittedWeaponDefinition;
  readonly weaponMasteries: readonly CharacterBattleWeaponMasterySelection[];
}): Result.Result<
  CharacterWeaponAttackExecutionWeapon,
  UnsupportedSelectedWeaponMasteryIssues
> {
  const definition = input.definition;
  const selected = weaponMasteryIsSelectedForWeapon(
    input.weaponUnitId,
    input.weaponMasteries,
  );
  if (definition.masterySupport === "unsupported") {
    return selected
      ? Result.fail(definition.resolvedMastery.issues)
      : Result.succeed({
          weaponUnitId: input.weaponUnitId,
          ...definition.facts,
        });
  }
  if (selected) {
    return Result.succeed({
      weaponUnitId: input.weaponUnitId,
      ...definition.facts,
    });
  }
  const { masteryProperty: _masteryProperty, ...facts } = definition.facts;
  return Result.succeed({ weaponUnitId: input.weaponUnitId, ...facts });
}

export function bindCharacterWeaponAttackExecutionWeapon(input: {
  readonly weaponUnitId: UnitId;
  readonly definition: AdmittedWeaponDefinition;
  readonly objectId: BattleObjectId;
  readonly weaponMasteries: readonly CharacterBattleWeaponMasterySelection[];
}): Result.Result<
  CharacterWeaponAttackExecutionAdmission,
  UnsupportedSelectedWeaponMasteryIssues
> {
  return Result.map(bindCharacterWeaponExecutionWeapon(input), (weapon) => ({
    weapon,
    weaponObjectId: input.objectId,
  }));
}
