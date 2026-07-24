import { UnitId } from "@dnd/shared/game-facts";
import {
  WeaponCategorySchema,
  WeaponDamageSchema,
  WeaponMasteryNameSchema,
  WeaponPropertyDetailSchema,
  WeaponUsageSchema,
} from "@dnd/surface/surface/schema";
import { Schema } from "effect";
import { BattleObjectId } from "./identity.ts";

export const CharacterWeaponAttackExecutionWeaponSchema = Schema.Struct({
  weaponUnitId: UnitId,
  weaponObjectId: BattleObjectId,
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

export type CharacterWeaponAttackExecutionWeapon =
  typeof CharacterWeaponAttackExecutionWeaponSchema.Type;
