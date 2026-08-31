import { UnitId } from "@dnd/shared/game-facts";
import {
  WeaponCategorySchema,
  WeaponDamageSchema,
  WeaponMasteryNameSchema,
  WeaponPropertyDetailSchema,
  WeaponUsageSchema,
} from "@dnd/surface/surface/schema";
import type { WeaponMasteryName } from "@dnd/surface/surface/types";
import { Schema } from "effect";

const CharacterWeaponAttackExecutionWeaponFactsFields = {
  attachedWeaponAttackOverrideEligibility: Schema.optionalKey(
    Schema.Struct({ kind: Schema.Literal("clubOrQuarterstaff") }),
  ),
  category: WeaponCategorySchema,
  usage: WeaponUsageSchema,
  damage: WeaponDamageSchema,
  properties: Schema.Array(WeaponPropertyDetailSchema),
  costGp: Schema.Number,
} as const;

/**
 * `masteryProperty` is present only when mastery behavior has been admitted
 * into execution facts. Authored mastery identity never enters this shape.
 */
export const CharacterWeaponAttackExecutionWeaponFactsSchema = Schema.Union([
  Schema.Struct({
    ...CharacterWeaponAttackExecutionWeaponFactsFields,
    masteryProperty: WeaponMasteryNameSchema,
  }),
  Schema.Struct(CharacterWeaponAttackExecutionWeaponFactsFields),
]);

export const CharacterWeaponAttackExecutionWeaponSchema = Schema.Union([
  Schema.Struct({
    weaponUnitId: UnitId,
    ...CharacterWeaponAttackExecutionWeaponFactsFields,
    masteryProperty: WeaponMasteryNameSchema,
  }),
  Schema.Struct({
    weaponUnitId: UnitId,
    ...CharacterWeaponAttackExecutionWeaponFactsFields,
  }),
]);

export type CharacterWeaponAttackExecutionWeapon =
  typeof CharacterWeaponAttackExecutionWeaponSchema.Type;
export type CharacterWeaponAttackExecutionWeaponWithMasteryProperty = Extract<
  CharacterWeaponAttackExecutionWeapon,
  { readonly masteryProperty: WeaponMasteryName }
>;
export type CharacterWeaponAttackExecutionWeaponFacts =
  typeof CharacterWeaponAttackExecutionWeaponFactsSchema.Type;
