import { UnitId } from "@dnd/shared/game-facts";
import { WeaponExecutionFactsSchema } from "@dnd/shared-algebras/weapon-execution-facts";
import { Schema } from "effect";

export const CharacterWeaponAttackExecutionWeaponSchema = Schema.Struct({
  weaponUnitId: UnitId,
  ...WeaponExecutionFactsSchema.fields,
});

export type CharacterWeaponAttackExecutionWeapon =
  typeof CharacterWeaponAttackExecutionWeaponSchema.Type;
