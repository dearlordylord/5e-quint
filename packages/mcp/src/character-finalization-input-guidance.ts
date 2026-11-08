import { EquippedWeaponBattleBlockersSchema } from "./equipped-weapon-battle-blockers.ts";
import { Schema } from "effect";
import type { FinalizeCharacterArgsSchema } from "./character-tool-input.ts";
import { CharacterBattleSpellSupportSchema } from "./character-battle-spell-support-schema.ts";

export const CIRCLE_LAND_ARGUMENT = "druidCircleLand";
export const KNOWN_FORMS_ARGUMENT = "druidWildShapeKnownFormStatBlockIds";
const INITIALIZATION_ARGUMENTS = [
  CIRCLE_LAND_ARGUMENT,
  KNOWN_FORMS_ARGUMENT,
] as const satisfies readonly (keyof typeof FinalizeCharacterArgsSchema.fields)[];
export type InitializationArgument = (typeof INITIALIZATION_ARGUMENTS)[number];
const FinalizationCallFields = {
  equippedWeaponBattleBlockers: EquippedWeaponBattleBlockersSchema,
  tool: Schema.Literal("finalize_character"),
  argumentsSchema: Schema.Record(Schema.String, Schema.Unknown),
  instructions: Schema.Array(Schema.String),
  classSpellBattleSupport: CharacterBattleSpellSupportSchema,
};
export const FinalizationInputGuidanceSchema = Schema.Union([
  Schema.Struct({
    phase: Schema.Literal("initializationRequired"),
    requiredArguments: Schema.NonEmptyArray(
      Schema.Literals(INITIALIZATION_ARGUMENTS),
    ),
    ...FinalizationCallFields,
  }),
  Schema.Struct({
    phase: Schema.Literal("ready"),
    ...FinalizationCallFields,
  }),
  Schema.Null,
]);
export type FinalizationInputGuidance = Schema.Schema.Type<
  typeof FinalizationInputGuidanceSchema
>;
