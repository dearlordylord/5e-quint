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

function querySchemaFor<
  const Kind extends CharacterSessionQueryKind,
  const Fields extends Schema.Struct.Fields,
>(kind: Kind, fields: Fields) {
  return Schema.Struct({
    kind: Schema.Literal(kind),
    ...fields,
  });
}

function querySchemaMap<
  const Members extends Record<
    CharacterSessionQueryKind,
    Schema.Schema.AnyNoContext
  >,
>(
  members: Members & {
    [Kind in CharacterSessionQueryKind]: Schema.Schema.Type<
      Members[Kind]
    > extends { readonly kind: Kind }
      ? unknown
      : never;
  },
): Members {
  return members;
}

const CharacterSessionQuerySchemaByKind = querySchemaMap({
  abilityCheckAbility: querySchemaFor("abilityCheckAbility", {
    skill: SurfaceSkillSchema,
    defaultAbility: AbilitySchema,
    activeFeatureUnitIds: UnitIdArraySchema,
  }),
  abilityCheckProficiencyBonus: querySchemaFor("abilityCheckProficiencyBonus", {
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
  jumpDistanceAbility: querySchemaFor("jumpDistanceAbility", {
    defaultAbility: AbilitySchema,
  }),
  linkedSpeedGrants: querySchemaFor("linkedSpeedGrants", {}),
  armorClass: querySchemaFor("armorClass", {
    baseChoice: Schema.optionalWith(ArmorClassBaseChoiceSchema, {
      exact: true,
    }),
  }),
  spellAccess: querySchemaFor("spellAccess", {}),
  knownForms: querySchemaFor("knownForms", {}),
  weaponMasterySelections: querySchemaFor("weaponMasterySelections", {
    featureUnitId: UnitId,
  }),
  spellbookRitualAccesses: querySchemaFor("spellbookRitualAccesses", {}),
  spellbookRitualAccess: querySchemaFor("spellbookRitualAccess", {
    spellId: UnitId,
  }),
  spellInvocation: querySchemaFor("spellInvocation", {
    spellId: UnitId,
    invocation: Schema.Struct({
      kind: Schema.Literal("ritual"),
    }),
  }),
} as const satisfies Record<
  CharacterSessionQueryKind,
  Schema.Schema.AnyNoContext
>);

function unionQuerySchemas<
  const Members extends Record<
    CharacterSessionQueryKind,
    Schema.Schema.AnyNoContext
  >,
>(
  members: Members,
): Schema.Schema<
  Schema.Schema.Type<Members[keyof Members]>,
  Schema.Schema.Encoded<Members[keyof Members]>,
  Schema.Schema.Context<Members[keyof Members]>
> {
  return Schema.Union(...Object.values(members));
}

export const CharacterSessionQuerySchema = unionQuerySchemas(
  CharacterSessionQuerySchemaByKind,
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
