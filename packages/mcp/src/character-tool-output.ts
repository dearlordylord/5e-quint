import {
  ABILITY_SCORE_GENERATION_DRAFT_PATH,
  CHARACTER_DRAFT_CHOICE_PATHS,
  CreationFinalizationIssueSchema,
  LOADOUT_SLOTS,
  SUPPORTED_ABILITY_SCORE_METHODS,
  UNIT_CHOICE_KEYS,
} from "@dnd/character-creation-runtime";
import { Schema } from "effect";

import { McpSessionSummarySchema } from "./session-snapshot-output.ts";

const JsonObjectSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Any,
});

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);
const CharacterSheetSpellSlotDisplayRowSchema = Schema.Struct({
  spellLevel: PositiveIntegerSchema,
  count: NonNegativeIntegerSchema,
  expended: NonNegativeIntegerSchema,
});
const CharacterSheetPactSlotDisplayRowSchema = Schema.Struct({
  slotLevel: PositiveIntegerSchema,
  count: NonNegativeIntegerSchema,
  expended: NonNegativeIntegerSchema,
});
const CharacterSheetHitDieDisplayRowSchema = Schema.Struct({
  classUnitId: Schema.String,
  dieSize: PositiveIntegerSchema,
  total: PositiveIntegerSchema,
  spent: NonNegativeIntegerSchema,
});
const CharacterSheetUnitResourceDisplayRowSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("layOnHandsHealingPool"),
    unitId: Schema.String,
    count: NonNegativeIntegerSchema,
    expended: NonNegativeIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("useCountResource"),
    unitId: Schema.String,
    count: NonNegativeIntegerSchema,
    expended: NonNegativeIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("pointPoolResource"),
    unitId: Schema.String,
    count: NonNegativeIntegerSchema,
    expended: NonNegativeIntegerSchema,
  }),
);
const CharacterSheetSpellAccessFreeCastDisplayRowSchema = Schema.Struct({
  tag: Schema.Literal("spellAccessFreeCast"),
  sourceUnitId: Schema.String,
  spellId: Schema.String,
  count: NonNegativeIntegerSchema,
  expended: NonNegativeIntegerSchema,
});
const CharacterSheetResourceDisplayRowSchema = Schema.Union(
  CharacterSheetUnitResourceDisplayRowSchema,
  CharacterSheetSpellAccessFreeCastDisplayRowSchema,
);
const DraftChoiceCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("draft"),
  path: Schema.Literal(...CHARACTER_DRAFT_CHOICE_PATHS),
});
const AbilityScoresCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("draft"),
  path: Schema.Literal(ABILITY_SCORE_GENERATION_DRAFT_PATH),
});
const UnitChoiceCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("unitChoice"),
  unitId: Schema.String,
  choiceKey: Schema.Literal(...UNIT_CHOICE_KEYS),
});
const LoadoutCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("loadout"),
  equipmentUnitId: Schema.String,
  slot: Schema.Literal(...LOADOUT_SLOTS),
});
const ChoiceCreationHoleSourceSchema = Schema.Union(
  DraftChoiceCreationHoleSourceSchema,
  UnitChoiceCreationHoleSourceSchema,
  LoadoutCreationHoleSourceSchema,
);
const CreationChoiceOptionSchema = Schema.Struct({
  optionId: Schema.String,
  label: Schema.String,
  unitRef: Schema.optionalWith(Schema.Struct({ unitId: Schema.String }), {
    exact: true,
  }),
});
const ChoiceCardinalitySchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("exactly"),
    count: PositiveIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("between"),
    min: NonNegativeIntegerSchema,
    max: PositiveIntegerSchema,
  }),
);
const CreationHoleSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("choice"),
    holeId: Schema.String,
    source: ChoiceCreationHoleSourceSchema,
    cardinality: ChoiceCardinalitySchema,
    options: Schema.Array(CreationChoiceOptionSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("abilityScores"),
    holeId: Schema.String,
    source: AbilityScoresCreationHoleSourceSchema,
    methods: Schema.Array(Schema.Literal(...SUPPORTED_ABILITY_SCORE_METHODS)),
  }),
);
export const CreationFinalizationSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("ready"),
    build: JsonObjectSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("incomplete"),
    holes: Schema.NonEmptyArray(CreationHoleSchema),
  }),
  Schema.Struct({
    tag: Schema.Literal("invalid"),
    issues: Schema.NonEmptyArray(CreationFinalizationIssueSchema),
  }),
);
export const CharacterSessionRowSchema = Schema.Union(
  Schema.Struct({
    characterId: Schema.String,
    status: Schema.Literal("available"),
    displayName: Schema.String,
    build: JsonObjectSchema,
    hitPoints: Schema.Struct({
      current: Schema.Number,
      maximum: Schema.Number,
      state: JsonObjectSchema,
    }),
    hitDice: Schema.Array(CharacterSheetHitDieDisplayRowSchema),
    spellSlots: Schema.optionalWith(
      Schema.Array(CharacterSheetSpellSlotDisplayRowSchema),
      {
        exact: true,
      },
    ),
    pactSlots: Schema.optionalWith(CharacterSheetPactSlotDisplayRowSchema, {
      exact: true,
    }),
    resources: Schema.Array(CharacterSheetResourceDisplayRowSchema),
    companion: JsonObjectSchema,
  }),
  Schema.Struct({
    characterId: Schema.String,
    status: Schema.Literal("inBattle"),
    displayName: Schema.Null,
    build: JsonObjectSchema,
    battleId: Schema.String,
    companion: JsonObjectSchema,
  }),
);
const CreationFillResultSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("accepted"),
    draft: JsonObjectSchema,
    holes: Schema.Array(CreationHoleSchema),
    finalization: CreationFinalizationSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("rejected"),
    draft: JsonObjectSchema,
    holes: Schema.Array(CreationHoleSchema),
    issues: Schema.NonEmptyArray(JsonObjectSchema),
    finalization: CreationFinalizationSchema,
  }),
);

export const CreationDraftOutputSchema = Schema.Struct({
  draft: JsonObjectSchema,
  holes: Schema.Array(CreationHoleSchema),
  finalization: CreationFinalizationSchema,
  session: McpSessionSummarySchema,
});
export const FillCreationHolesOutputSchema = Schema.Struct({
  result: CreationFillResultSchema,
  storedDraft: JsonObjectSchema,
  session: McpSessionSummarySchema,
});
export const FinalizeCharacterOutputSchema = Schema.Struct({
  draftId: Schema.String,
  finalization: CreationFinalizationSchema,
  build: Schema.Union(JsonObjectSchema, Schema.Null),
  session: McpSessionSummarySchema,
});
export const ListCharactersOutputSchema = Schema.Struct({
  characters: Schema.Array(CharacterSessionRowSchema),
  session: McpSessionSummarySchema,
});
export const CharacterSessionOperationOutputSchema = Schema.Struct({
  character: JsonObjectSchema,
  session: McpSessionSummarySchema,
});

export type CharacterSessionRow = Schema.Schema.Type<
  typeof CharacterSessionRowSchema
>;
