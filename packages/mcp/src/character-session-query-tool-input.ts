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

const CharacterSessionQuerySchemaByKind = {
  abilityCheckAbility: Schema.Struct({
    kind: Schema.Literal("abilityCheckAbility"),
    skill: SurfaceSkillSchema,
    defaultAbility: AbilitySchema,
    activeFeatureUnitIds: UnitIdArraySchema,
  }),
  abilityCheckProficiencyBonus: Schema.Struct({
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
  jumpDistanceAbility: Schema.Struct({
    kind: Schema.Literal("jumpDistanceAbility"),
    defaultAbility: AbilitySchema,
  }),
  linkedSpeedGrants: Schema.Struct({
    kind: Schema.Literal("linkedSpeedGrants"),
  }),
  armorClass: Schema.Struct({
    kind: Schema.Literal("armorClass"),
    baseChoice: Schema.optionalWith(ArmorClassBaseChoiceSchema, {
      exact: true,
    }),
  }),
  spellAccess: Schema.Struct({
    kind: Schema.Literal("spellAccess"),
  }),
  knownForms: Schema.Struct({
    kind: Schema.Literal("knownForms"),
  }),
  weaponMasterySelections: Schema.Struct({
    kind: Schema.Literal("weaponMasterySelections"),
    featureUnitId: UnitId,
  }),
  spellbookRitualAccesses: Schema.Struct({
    kind: Schema.Literal("spellbookRitualAccesses"),
  }),
  spellbookRitualAccess: Schema.Struct({
    kind: Schema.Literal("spellbookRitualAccess"),
    spellId: UnitId,
  }),
  spellInvocation: Schema.Struct({
    kind: Schema.Literal("spellInvocation"),
    spellId: UnitId,
    invocation: Schema.Struct({
      kind: Schema.Literal("ritual"),
    }),
  }),
} as const satisfies Record<
  CharacterSessionQueryKind,
  Schema.Schema.AnyNoContext
>;

function unionQuerySchemas<
  const Members extends Record<string, Schema.Schema.AnyNoContext>,
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
