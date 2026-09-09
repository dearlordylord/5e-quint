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

export const WeaponExecutionFactFields = {
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
export const WeaponExecutionFactsSchema = Schema.Union([
  Schema.Struct({
    ...WeaponExecutionFactFields,
    masteryProperty: WeaponMasteryNameSchema,
  }),
  Schema.Struct(WeaponExecutionFactFields),
]);

export const CharacterWeaponAttackExecutionWeaponSchema = Schema.Union([
  Schema.Struct({
    weaponUnitId: UnitId,
    ...WeaponExecutionFactFields,
    masteryProperty: WeaponMasteryNameSchema,
  }),
  Schema.Struct({
    weaponUnitId: UnitId,
    ...WeaponExecutionFactFields,
  }),
]);

export type CharacterWeaponAttackExecutionWeapon =
  typeof CharacterWeaponAttackExecutionWeaponSchema.Type;
export type CharacterWeaponAttackExecutionWeaponWithMasteryProperty = Extract<
  CharacterWeaponAttackExecutionWeapon,
  { readonly masteryProperty: WeaponMasteryName }
>;
export type WeaponExecutionFacts = typeof WeaponExecutionFactsSchema.Type;
export type WeaponExecutionFactsWithMasteryProperty = Extract<
  WeaponExecutionFacts,
  { readonly masteryProperty: WeaponMasteryName }
>;
