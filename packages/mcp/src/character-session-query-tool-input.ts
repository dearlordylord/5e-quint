import { characterId, type CharacterId } from "@dnd/battle-runtime";
import { ABILITIES, SURFACE_SKILLS, UnitId } from "@dnd/shared/game-facts";
import { Either, Schema } from "effect";

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
export const CharacterSessionQueryKindSchema = Schema.Literal(
  ...CHARACTER_SESSION_QUERY_KIND_VALUES,
);
export const CharacterSessionQueryKindsSchema = Schema.NonEmptyArray(
  CharacterSessionQueryKindSchema,
).pipe(
  Schema.filter(
    (queryKinds) =>
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

const AbilitySchema = Schema.Literal(...ABILITIES);
const SurfaceSkillSchema = Schema.Literal(...SURFACE_SKILLS);
const UnitIdArraySchema = Schema.Array(UnitId);

const ArmorClassBaseChoiceSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("default_unarmored") }),
  Schema.Struct({ kind: Schema.Literal("class_feature"), unitId: UnitId }),
);

type CharacterSessionQuerySchemaEntry = {
  readonly kind: CharacterSessionQueryKind;
  readonly schema: Schema.Schema.AnyNoContext;
};

function querySchemaEntry<
  const Kind extends CharacterSessionQueryKind,
  const Fields extends Schema.Struct.Fields,
>(kind: Kind, fields: Fields) {
  return {
    kind,
    schema: Schema.Struct({
      kind: Schema.Literal(kind),
      ...fields,
    }),
  };
}

function querySchemaEntries<
  const Entries extends readonly CharacterSessionQuerySchemaEntry[],
>(
  entries: Entries &
    (Exclude<CharacterSessionQueryKind, Entries[number]["kind"]> extends never
      ? unknown
      : {
          readonly missingQueryKinds: Exclude<
            CharacterSessionQueryKind,
            Entries[number]["kind"]
          >;
        }),
): Entries {
  return entries;
}

const CharacterSessionQuerySchemaEntries = querySchemaEntries([
  querySchemaEntry("abilityCheckAbility", {
    skill: SurfaceSkillSchema,
    defaultAbility: AbilitySchema,
    activeFeatureUnitIds: UnitIdArraySchema,
  }),
  querySchemaEntry("abilityCheckProficiencyBonus", {
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
  querySchemaEntry("jumpDistanceAbility", {
    defaultAbility: AbilitySchema,
  }),
  querySchemaEntry("linkedSpeedGrants", {}),
  querySchemaEntry("armorClass", {
    baseChoice: Schema.optionalWith(ArmorClassBaseChoiceSchema, {
      exact: true,
    }),
  }),
  querySchemaEntry("spellAccess", {}),
  querySchemaEntry("knownForms", {}),
  querySchemaEntry("weaponMasterySelections", {
    featureUnitId: UnitId,
  }),
  querySchemaEntry("spellbookRitualAccesses", {}),
  querySchemaEntry("spellbookRitualAccess", {
    spellId: UnitId,
  }),
  querySchemaEntry("spellInvocation", {
    spellId: UnitId,
    invocation: Schema.Struct({
      kind: Schema.Literal("ritual"),
    }),
  }),
]);

function unionQuerySchemas<
  const Entries extends readonly CharacterSessionQuerySchemaEntry[],
>(
  entries: Entries,
): Schema.Schema<
  Schema.Schema.Type<Entries[number]["schema"]>,
  Schema.Schema.Encoded<Entries[number]["schema"]>,
  Schema.Schema.Context<Entries[number]["schema"]>
> {
  return Schema.Union(...entries.map(({ schema }) => schema));
}

export const CharacterSessionQuerySchema = unionQuerySchemas(
  CharacterSessionQuerySchemaEntries,
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
