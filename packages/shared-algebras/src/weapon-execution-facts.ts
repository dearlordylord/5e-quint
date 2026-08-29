import { Schema } from "effect";

import {
  WeaponCategorySchema,
  WeaponDamageSchema,
  WeaponMasteryNameSchema,
  WeaponPropertyDetailSchema,
  WeaponUsageSchema,
} from "@dnd/surface/surface/schema";

/**
 * Source-free weapon facts consumed by character battle execution.
 *
 * The selected Unit identity is intentionally not part of this value. Battle
 * composition adds its typed execution reference at the point where a
 * character's selected equipment becomes a battle object.
 */
export const WeaponExecutionFactsSchema = Schema.Struct({
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
});

export type WeaponExecutionFacts = typeof WeaponExecutionFactsSchema.Type;
