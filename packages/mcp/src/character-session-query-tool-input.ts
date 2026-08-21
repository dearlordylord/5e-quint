import { characterId, type CharacterId } from "@dnd/battle-runtime";
import { ABILITIES, SURFACE_SKILLS, UnitId } from "@dnd/shared/game-facts";
import { Either, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type ToolInputResult,
} from "./schema-codec.ts";

export const CHARACTER_SESSION_QUERY_TOOL_NAME = "query_character_session";

const AbilitySchema = Schema.Literal(...ABILITIES);
const SurfaceSkillSchema = Schema.Literal(...SURFACE_SKILLS);
const UnitIdArraySchema = Schema.Array(UnitId);

const ArmorClassBaseChoiceSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("default_unarmored") }),
  Schema.Struct({ kind: Schema.Literal("class_feature"), unitId: UnitId }),
);

export const CharacterSessionQuerySchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("abilityCheckAbility"),
    skill: SurfaceSkillSchema,
    defaultAbility: AbilitySchema,
    activeFeatureUnitIds: UnitIdArraySchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("abilityCheckProficiencyBonus"),
    skill: SurfaceSkillSchema,
    otherProficiencyBonus: Schema.Union(
      Schema.Struct({
        tag: Schema.Literal("noOtherProficiencyBonus"),
      }),
      Schema.Struct({
        tag: Schema.Literal("otherProficiencyBonusApplies"),
      }),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("jumpDistanceAbility"),
    defaultAbility: AbilitySchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("linkedSpeedGrants"),
  }),
  Schema.Struct({
    kind: Schema.Literal("armorClass"),
    baseChoice: Schema.optionalWith(ArmorClassBaseChoiceSchema, {
      exact: true,
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("spellAccess"),
  }),
  Schema.Struct({
    kind: Schema.Literal("knownForms"),
  }),
  Schema.Struct({
    kind: Schema.Literal("weaponMasterySelections"),
    featureUnitId: UnitId,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellbookRitualAccesses"),
  }),
  Schema.Struct({
    kind: Schema.Literal("spellbookRitualAccess"),
    spellId: UnitId,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellInvocation"),
    spellId: UnitId,
    invocation: Schema.Struct({
      kind: Schema.Literal("ritual"),
    }),
  }),
);

export const QueryCharacterSessionArgsSchema = Schema.Struct({
  characterId: Schema.String,
  query: CharacterSessionQuerySchema,
});

export type CharacterSessionQueryInput = Schema.Schema.Type<
  typeof CharacterSessionQuerySchema
>;
export type QueryCharacterSessionToolInput = {
  readonly characterId: CharacterId;
  readonly query: CharacterSessionQueryInput;
};

export const queryCharacterSessionInputSchema = mcpObjectJsonSchema(
  QueryCharacterSessionArgsSchema,
);

export function decodeQueryCharacterSessionArgs(
  args: unknown,
): ToolInputResult<QueryCharacterSessionToolInput> {
  return Either.map(
    decodeToolArgs(
      QueryCharacterSessionArgsSchema,
      args,
      CHARACTER_SESSION_QUERY_TOOL_NAME,
    ),
    (decoded) => ({
      ...decoded,
      characterId: characterId(decoded.characterId),
    }),
  );
}
