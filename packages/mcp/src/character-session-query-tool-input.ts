import { characterId, type CharacterId } from "@dnd/battle-runtime";
import { ABILITIES, SURFACE_SKILLS, UnitId } from "@dnd/shared/game-facts";
import { Result, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type ToolInputResult,
} from "./schema-codec.ts";

export const CHARACTER_SESSION_QUERY_TOOL_NAME = "query_character_session";

export const CHARACTER_SESSION_QUERY_KIND_VALUES = [
  "abilityCheckAbility",
  "abilityCheckProficiencyBonus",
  "jumpDistanceAbility",
  "linkedSpeedGrants",
  "armorClass",
  "spellAccess",
  "knownForms",
  "weaponMasterySelections",
  "spellbookRitualAccesses",
  "spellbookRitualAccess",
  "spellInvocation",
] as const;
export type CharacterSessionQueryKind =
  (typeof CHARACTER_SESSION_QUERY_KIND_VALUES)[number];
export const CharacterSessionQueryKindSchema = Schema.Literals(
  CHARACTER_SESSION_QUERY_KIND_VALUES,
);
export const CharacterSessionQueryKindsSchema = Schema.NonEmptyArray(
  CharacterSessionQueryKindSchema,
).pipe(
  Schema.refine(
    (queryKinds): queryKinds is typeof CHARACTER_SESSION_QUERY_KIND_VALUES =>
      queryKinds.length === CHARACTER_SESSION_QUERY_KIND_VALUES.length &&
      queryKinds.every(
        (queryKind, index) =>
          queryKind === CHARACTER_SESSION_QUERY_KIND_VALUES[index],
      ),
    {
      description:
        "the exact ordered set of production Character Session query kinds",
    },
  ),
);

const AbilitySchema = Schema.Literals(ABILITIES);
const SurfaceSkillSchema = Schema.Literals(SURFACE_SKILLS);
const UnitIdArraySchema = Schema.Array(UnitId);

const ArmorClassBaseChoiceSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("default_unarmored") }),
  Schema.Struct({ kind: Schema.Literal("class_feature"), unitId: UnitId }),
]);

function querySchemaFor<
  const Kind extends CharacterSessionQueryKind,
  const Fields extends Schema.Struct.Fields,
>(kind: Kind, fields: Fields) {
  return Schema.Struct({
    kind: Schema.Literal(kind),
    ...fields,
  });
}

export const CharacterSessionQuerySchema = Schema.Union([
  querySchemaFor("abilityCheckAbility", {
    skill: SurfaceSkillSchema,
    defaultAbility: AbilitySchema,
    activeFeatureUnitIds: UnitIdArraySchema,
  }),
  querySchemaFor("abilityCheckProficiencyBonus", {
    skill: SurfaceSkillSchema,
    otherProficiencyBonus: Schema.Union([
      Schema.Struct({
        tag: Schema.Literal("noOtherProficiencyBonus"),
      }),
      Schema.Struct({
        tag: Schema.Literal("otherProficiencyBonusApplies"),
      }),
    ]),
  }),
  querySchemaFor("jumpDistanceAbility", {
    defaultAbility: AbilitySchema,
  }),
  querySchemaFor("linkedSpeedGrants", {}),
  querySchemaFor("armorClass", {
    baseChoice: Schema.optionalKey(ArmorClassBaseChoiceSchema),
  }),
  querySchemaFor("spellAccess", {}),
  querySchemaFor("knownForms", {}),
  querySchemaFor("weaponMasterySelections", {
    featureUnitId: UnitId,
  }),
  querySchemaFor("spellbookRitualAccesses", {}),
  querySchemaFor("spellbookRitualAccess", {
    spellId: UnitId,
  }),
  querySchemaFor("spellInvocation", {
    spellId: UnitId,
    invocation: Schema.Struct({
      kind: Schema.Literal("ritual"),
    }),
  }),
]);

export const QueryCharacterSessionArgsSchema = Schema.Struct({
  characterId: Schema.String.annotate({
    description:
      "Character Session id from finalize_character or list_characters in this Play Session. The character must be available outside Battle.",
  }),
  query: CharacterSessionQuerySchema.annotate({
    description:
      "Choose exactly one kind and provide its required fields. Returns a read-only projection; it does not roll checks, cast spells, spend resources, or change selections.",
  }),
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
  return Result.map(
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
