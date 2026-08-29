import {
  ABILITY_SCORE_GENERATION_DRAFT_PATH,
  CHARACTER_DRAFT_CHOICE_PATHS,
  CREATION_BATCH_ISSUE_CODES,
  CREATION_FILL_ISSUE_CODES,
  CreationFinalizationIssueSchema,
  LOADOUT_SLOTS,
  SUPPORTED_ABILITY_SCORE_METHODS,
  UNIT_CHOICE_KEYS,
} from "@dnd/character-creation-runtime";
import {
  CHARACTER_SHEET_REST_ACTIVITY_INTERRUPTION_VALUES,
  FONT_OF_MAGIC_SPELL_SLOT_SOURCE_VALUES,
  type CharacterSheetRetainedCompanionManifestation,
} from "@dnd/character-sheet-runtime";
import { UnitId } from "@dnd/shared/game-facts";
import { Schema } from "effect";

import {
  CharacterSessionQueryOutputSchema,
  type CharacterSessionQueryOutput,
} from "./character-session-query-tool-output.ts";
import { McpSessionSummarySchema } from "./session-snapshot-output.ts";

const JsonObjectSchema = Schema.Record(Schema.String, Schema.Any);

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
);
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
);
const SpellSlotLevelSchema = PositiveIntegerSchema.pipe(
  Schema.check(Schema.isLessThanOrEqualTo(9)),
);
export const CHARACTER_SESSION_COMPANION_MANIFESTATION_TAGS = [
  "embodiedOutsideBattle",
  "temporarilyDismissed",
  "disappearedAtZeroHitPoints",
] as const satisfies ReadonlyArray<
  CharacterSheetRetainedCompanionManifestation["tag"]
>;
export type CharacterSessionCompanionManifestationTag =
  (typeof CHARACTER_SESSION_COMPANION_MANIFESTATION_TAGS)[number];
const CharacterSessionResourceOperationResultSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("spellAccessFreeCastSpent"),
    sourceUnitId: UnitId,
    spellId: UnitId,
  }),
  Schema.Struct({
    tag: Schema.Literal("monkUncannyMetabolismUsed"),
    martialArtsRoll: PositiveIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("fontOfMagicSpellSlotConvertedToSorceryPoints"),
    spellLevel: SpellSlotLevelSchema,
    spellSlotSource: Schema.optionalKey(
      Schema.Literals([...FONT_OF_MAGIC_SPELL_SLOT_SOURCE_VALUES]),
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("fontOfMagicSorceryPointsConvertedToSpellSlot"),
    spellLevel: SpellSlotLevelSchema,
  }),
]);
export type CharacterSessionResourceOperationResult = Schema.Schema.Type<
  typeof CharacterSessionResourceOperationResultSchema
>;
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
const CharacterSheetUnitResourceDisplayRowSchema = Schema.Union([
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
]);
const CharacterSheetSpellAccessFreeCastDisplayRowSchema = Schema.Struct({
  tag: Schema.Literal("spellAccessFreeCast"),
  sourceUnitId: Schema.String,
  spellId: Schema.String,
  count: NonNegativeIntegerSchema,
  expended: NonNegativeIntegerSchema,
});
const CharacterSheetResourceDisplayRowSchema = Schema.Union([
  CharacterSheetUnitResourceDisplayRowSchema,
  CharacterSheetSpellAccessFreeCastDisplayRowSchema,
]);

const DraftChoiceCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("draft"),
  path: Schema.Literals([...CHARACTER_DRAFT_CHOICE_PATHS]),
});
const AbilityScoresCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("draft"),
  path: Schema.Literal(ABILITY_SCORE_GENERATION_DRAFT_PATH),
});
const UnitChoiceCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("unitChoice"),
  unitId: Schema.String,
  choiceKey: Schema.Literals([...UNIT_CHOICE_KEYS]),
});
const LoadoutCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("loadout"),
  equipmentUnitId: Schema.String,
  slot: Schema.Literals([...LOADOUT_SLOTS]),
});
const ChoiceCreationHoleSourceSchema = Schema.Union([
  DraftChoiceCreationHoleSourceSchema,
  UnitChoiceCreationHoleSourceSchema,
  LoadoutCreationHoleSourceSchema,
]);
const CreationChoiceOptionSchema = Schema.Struct({
  optionId: Schema.String,
  label: Schema.String,
  unitRef: Schema.optionalKey(Schema.Struct({ unitId: Schema.String })),
});
const ChoiceCardinalitySchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("exactly"),
    count: PositiveIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("between"),
    min: NonNegativeIntegerSchema,
    max: PositiveIntegerSchema,
  }),
]);
const CreationHoleSchema = Schema.Union([
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
    methods: Schema.Array(
      Schema.Literals([...SUPPORTED_ABILITY_SCORE_METHODS]),
    ),
  }),
]);
export const CreationFinalizationSchema = Schema.Union([
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
]);
export const CharacterSessionRowSchema = Schema.Union([
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
    spellSlots: Schema.optionalKey(
      Schema.Array(CharacterSheetSpellSlotDisplayRowSchema),
    ),
    pactSlots: Schema.optionalKey(CharacterSheetPactSlotDisplayRowSchema),
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
]);
const CreationFillResultSchema = Schema.Union([
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
    issues: Schema.NonEmptyArray(
      Schema.Union([
        Schema.Struct({
          tag: Schema.Literal("illegalFill"),
          holeId: Schema.String,
          fillIndex: NonNegativeIntegerSchema,
          code: Schema.Literals([...CREATION_FILL_ISSUE_CODES]),
          message: Schema.String,
        }),
        Schema.Struct({
          tag: Schema.Literal("illegalBatch"),
          code: Schema.Literals([...CREATION_BATCH_ISSUE_CODES]),
          message: Schema.String,
        }),
      ]),
    ),
    finalization: CreationFinalizationSchema,
  }),
]);

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
  build: Schema.Union([JsonObjectSchema, Schema.Null]),
  session: McpSessionSummarySchema,
});
export const ListCharactersOutputSchema = Schema.Struct({
  characters: Schema.Array(CharacterSessionRowSchema),
  session: McpSessionSummarySchema,
});
const ShortRestInterruptionResultSchema = Schema.Literals([
  ...CHARACTER_SHEET_REST_ACTIVITY_INTERRUPTION_VALUES,
]);
export const CharacterSessionOperationResultSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("shortRestCompleted"),
    restedTicks: NonNegativeIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("shortRestInterruptedNoBenefit"),
    interruption: ShortRestInterruptionResultSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("longRestCompleted"),
    restedTicks: NonNegativeIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("resolved"),
    elapsedTicks: NonNegativeIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("needsHoles"),
    holes: Schema.NonEmptyArray(JsonObjectSchema),
    elapsedTicks: NonNegativeIntegerSchema,
    remainingTicks: PositiveIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("invalid"),
    reason: Schema.Literal("invalidFill"),
    message: Schema.String,
  }),
  Schema.Struct({
    tag: Schema.Literal("layOnHandsApplied"),
    sourceCharacterId: Schema.String,
    targetCharacterId: Schema.String,
  }),
  Schema.Struct({
    tag: Schema.Literal("spellRestBenefitApplied"),
    casterCharacterId: Schema.String,
    spellId: Schema.String,
    castLevel: PositiveIntegerSchema,
    recipientCharacterIds: Schema.NonEmptyArray(Schema.String),
  }),
  CharacterSessionResourceOperationResultSchema,
]);
const CharacterSessionSheetProjectionSchema = Schema.Struct({
  currentHp: NonNegativeIntegerSchema,
  companion: Schema.Union([
    Schema.Struct({ tag: Schema.Literal("none") }),
    Schema.Struct({
      tag: Schema.Literal("retainedOneAtATime"),
      companion: Schema.Struct({
        companionId: Schema.String,
        manifestation: Schema.Struct({
          tag: Schema.Literals([
            ...CHARACTER_SESSION_COMPANION_MANIFESTATION_TAGS,
          ]),
          resolvedStatBlockId: Schema.String,
        }),
      }),
    }),
  ]),
  hitPointMaximum: NonNegativeIntegerSchema,
  hitDice: Schema.Array(CharacterSheetHitDieDisplayRowSchema),
  spellSlots: Schema.optionalKey(
    Schema.Array(CharacterSheetSpellSlotDisplayRowSchema),
  ),
  pactSlots: Schema.optionalKey(CharacterSheetPactSlotDisplayRowSchema),
  resources: Schema.Array(CharacterSheetResourceDisplayRowSchema),
});

const CharacterSessionDetailSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("available"),
    characterId: Schema.String,
    displayName: Schema.String,
    build: JsonObjectSchema,
    sheetProjection: CharacterSessionSheetProjectionSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("inBattle"),
    characterId: Schema.String,
    displayName: Schema.String,
    battleId: Schema.String,
    build: JsonObjectSchema,
  }),
]);

export const CharacterSessionOperationOutputSchema = Schema.Union([
  Schema.Struct({
    character: JsonObjectSchema,
    result: Schema.optionalKey(CharacterSessionOperationResultSchema),
    session: McpSessionSummarySchema,
  }),
  Schema.Struct({
    detail: CharacterSessionDetailSchema,
    session: McpSessionSummarySchema,
  }),
]);

export const CharacterSessionDetailOutputSchema = Schema.Struct({
  detail: CharacterSessionDetailSchema,
  session: McpSessionSummarySchema,
});

export { CharacterSessionQueryOutputSchema };
export type { CharacterSessionQueryOutput };

export type CharacterSessionRow = Schema.Schema.Type<
  typeof CharacterSessionRowSchema
>;
