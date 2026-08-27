import { UnitId } from "@dnd/shared/game-facts";
import {
  WeaponCategorySchema,
  WeaponDamageSchema,
  WeaponMasteryNameSchema,
  WeaponPropertyDetailSchema,
  WeaponUsageSchema,
} from "@dnd/surface/surface/schema";
import { Schema } from "effect";

const CharacterWeaponAttackExecutionWeaponFactsFields = {
  attachedWeaponAttackOverrideEligibility: Schema.optionalWith(
    Schema.Struct({ kind: Schema.Literal("clubOrQuarterstaff") }),
    { exact: true },
  ),
  category: WeaponCategorySchema,
  usage: WeaponUsageSchema,
  damage: WeaponDamageSchema,
  properties: Schema.Array(WeaponPropertyDetailSchema),
  mastery: WeaponMasteryNameSchema,
  costGp: Schema.Number,
} as const;

export const CharacterWeaponAttackExecutionWeaponFactsSchema = Schema.Struct(
  CharacterWeaponAttackExecutionWeaponFactsFields,
);

export const CharacterWeaponAttackExecutionWeaponSchema = Schema.Struct({
  weaponUnitId: UnitId,
  ...CharacterWeaponAttackExecutionWeaponFactsFields,
});

export type CharacterWeaponAttackExecutionWeapon =
  typeof CharacterWeaponAttackExecutionWeaponSchema.Type;
export type CharacterWeaponAttackExecutionWeaponFacts =
  typeof CharacterWeaponAttackExecutionWeaponFactsSchema.Type;
