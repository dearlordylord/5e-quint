import {
  CHARACTER_SHEET_REST_ACTIVITY_INTERRUPTION_VALUES,
  CharacterSheetIdSchema,
  CharacterSheetRetainedCompanionId,
  FONT_OF_MAGIC_SPELL_SLOT_SOURCE_VALUES,
} from "@dnd/character-sheet-runtime";
import type { CharacterSheetId } from "@dnd/character-sheet-runtime";
import { CharacterBuildClassLevelGainSchema } from "@dnd/character-creation-runtime";
import { TIME_SPAN_UNITS } from "@dnd/shared/elapsed-time";
import { StatBlockId, UnitId } from "@dnd/shared/game-facts";
import { DAMAGE_TYPES } from "@dnd/shared/types";
import { DRUID_CIRCLE_LAND_CHOICES } from "@dnd/surface/surface/types";
import { Schema } from "effect";

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);

const RestRecoveryArgsFields = {
  spendHitDice: Schema.optionalWith(
    Schema.NonEmptyArray(
      Schema.Struct({
        classUnitId: UnitId,
        roll: PositiveIntegerSchema,
      }),
    ),
    { exact: true },
  ),
  arcaneRecovery: Schema.optionalWith(
    Schema.Struct({
      refundSpellSlots: Schema.NonEmptyArray(
        Schema.Struct({
          spellLevel: Schema.Number.pipe(
            Schema.int(),
            Schema.greaterThanOrEqualTo(1),
            Schema.lessThanOrEqualTo(9),
          ),
          count: PositiveIntegerSchema,
        }),
      ),
    }),
    { exact: true },
  ),
  sorcerousRestoration: Schema.optionalWith(
    Schema.Struct({
      recoverSorceryPoints: PositiveIntegerSchema,
    }),
    { exact: true },
  ),
} as const;

const LayOnHandsOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("applyLayOnHands"),
  targetCharacterId: CharacterSheetIdSchema,
  restoreHp: NonNegativeIntegerSchema,
  removePoisoned: Schema.Boolean,
});
const SpellRestBenefitRecipientArgsSchema = Schema.Struct({
  characterId: CharacterSheetIdSchema,
  eligibility: Schema.Struct({
    remainedWithinRangeForEntireCasting: Schema.Literal(true),
  }),
  healingRolls: Schema.Array(PositiveIntegerSchema),
  ...RestRecoveryArgsFields,
});
const SpellRestBenefitOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("applySpellRestBenefit"),
  spellId: UnitId,
  castLevel: PositiveIntegerSchema.pipe(Schema.lessThanOrEqualTo(9)),
  spellSlotSource: Schema.optionalWith(
    Schema.Literal(...FONT_OF_MAGIC_SPELL_SLOT_SOURCE_VALUES),
    { exact: true },
  ),
  recipients: Schema.NonEmptyArray(SpellRestBenefitRecipientArgsSchema),
});

const RetainedCompanionNormalFormSelectionArgsSchema = Schema.Struct({
  tag: Schema.Literal("normalNamedForm"),
  formId: UnitId,
});
const RetainedCompanionChallengeRatingZeroBeastSelectionArgsSchema =
  Schema.Struct({
    tag: Schema.Literal("challengeRatingZeroBeast"),
    statBlockId: StatBlockId,
  });
const RetainedCompanionSpecialFormSelectionArgsSchema = Schema.Struct({
  tag: Schema.Literal("pactOfTheChainSpecialForm"),
  formId: Schema.NonEmptyTrimmedString,
});
const RetainedCompanionFormSelectionArgsSchema = Schema.Union(
  RetainedCompanionNormalFormSelectionArgsSchema,
  RetainedCompanionChallengeRatingZeroBeastSelectionArgsSchema,
  RetainedCompanionSpecialFormSelectionArgsSchema,
);
const RetainedCompanionSourceArgsSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("spellSlotSpellCast"),
    spellId: UnitId,
    spellLevel: Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(9),
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("ritualSpell"),
    spellId: UnitId,
  }),
  Schema.Struct({
    tag: Schema.Literal("invocationSpellAccess"),
    spellId: UnitId,
  }),
  Schema.Struct({
    tag: Schema.Literal("classFeatureSpellCast"),
    featureUnitId: UnitId,
    spend: Schema.Union(
      Schema.Struct({
        tag: Schema.Literal("spellSlot"),
        spellLevel: Schema.Number.pipe(
          Schema.int(),
          Schema.greaterThanOrEqualTo(1),
          Schema.lessThanOrEqualTo(9),
        ),
      }),
      Schema.Struct({
        tag: Schema.Literal("useCountResource"),
        resourceUnitId: UnitId,
      }),
    ),
  }),
);
const RetainOneAtATimeCompanionOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("retainOneAtATimeCompanion"),
  companionId: CharacterSheetRetainedCompanionId,
  source: RetainedCompanionSourceArgsSchema,
  selectedForm: RetainedCompanionFormSelectionArgsSchema,
  creatureTypeOverrideChoiceId: Schema.optionalWith(
    Schema.NonEmptyTrimmedString,
    {
      exact: true,
    },
  ),
});
const AdvanceClassLevelOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("advanceClassLevel"),
  levelGain: CharacterBuildClassLevelGainSchema,
});
const ReplaceDruidWildShapeKnownFormOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("replaceDruidWildShapeKnownForm"),
  replacement: Schema.Struct({
    replaceStatBlockId: StatBlockId,
    selectedStatBlockId: StatBlockId,
  }),
});

const LongRestTimingArgsSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("noPriorLongRest"),
  }),
  Schema.Struct({
    tag: Schema.Literal("elapsedSinceLastLongRest"),
    elapsedTicks: NonNegativeIntegerSchema,
  }),
);

const ShortRestInterruptionArgsSchema = Schema.Literal(
  ...CHARACTER_SHEET_REST_ACTIVITY_INTERRUPTION_VALUES,
);
const LongRestInterruptionArgsSchema = Schema.Union(
  ShortRestInterruptionArgsSchema,
  Schema.Struct({
    tag: Schema.Literal("physicalExertion"),
    durationTicks: NonNegativeIntegerSchema,
  }),
);

const WeaponMasteryReselectionArgsSchema = Schema.Struct({
  featureUnitId: UnitId,
  selectedWeaponUnitIds: Schema.NonEmptyArray(UnitId),
});

const CalendarTimeDurationArgsSchema = Schema.Struct({
  kind: Schema.Literal("timeSpan"),
  unit: Schema.Literal(...TIME_SPAN_UNITS),
  amount: PositiveIntegerSchema,
});

const StableRecoveryFillArgsSchema = Schema.Struct({
  kind: Schema.Literal("rolledDice"),
  holeId: Schema.String,
  value: Schema.NonEmptyArray(
    Schema.Struct({
      results: Schema.Array(PositiveIntegerSchema),
    }),
  ),
});

const CompleteShortRestOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("completeShortRest"),
  restedTicks: NonNegativeIntegerSchema,
  fiendishResilienceDamageType: Schema.optionalWith(
    Schema.Literal(...DAMAGE_TYPES),
    { exact: true },
  ),
  ...RestRecoveryArgsFields,
});
const InterruptShortRestOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("interruptShortRest"),
  interruption: ShortRestInterruptionArgsSchema,
});
const LongRestCompletionChoiceFields = {
  weaponMasteryReselections: Schema.optionalWith(
    Schema.NonEmptyArray(WeaponMasteryReselectionArgsSchema),
    { exact: true },
  ),
  druidWildShapeKnownFormReplacement: Schema.optionalWith(
    Schema.Struct({
      replaceStatBlockId: StatBlockId,
      selectedStatBlockId: StatBlockId,
    }),
    { exact: true },
  ),
  druidCircleLandChoice: Schema.optionalWith(
    Schema.Literal(...DRUID_CIRCLE_LAND_CHOICES),
    { exact: true },
  ),
  fiendishResilienceDamageType: Schema.optionalWith(
    Schema.Literal(...DAMAGE_TYPES),
    { exact: true },
  ),
} as const;
const LongRestCompletionArgsFields = {
  restedTicks: NonNegativeIntegerSchema,
  ...LongRestCompletionChoiceFields,
} as const;
const LongRestResumptionCompletionArgsFields = {
  cumulativeRestedTicks: NonNegativeIntegerSchema,
  ...LongRestCompletionChoiceFields,
} as const;
const CompleteLongRestOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("completeLongRest"),
  timing: LongRestTimingArgsSchema,
  ...LongRestCompletionArgsFields,
});
const LongRestInterruptionSegmentArgsSchema = Schema.Struct({
  cumulativeRestedTicks: NonNegativeIntegerSchema,
  interruption: LongRestInterruptionArgsSchema,
  ...RestRecoveryArgsFields,
});
const InterruptLongRestOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("interruptLongRest"),
  timing: LongRestTimingArgsSchema,
  interruptionSegments: Schema.NonEmptyArray(
    LongRestInterruptionSegmentArgsSchema,
  ),
  completion: Schema.Struct(LongRestResumptionCompletionArgsFields),
});
const PassCalendarTimeOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("passCalendarTime"),
  duration: CalendarTimeDurationArgsSchema,
  fills: Schema.Array(StableRecoveryFillArgsSchema),
});
const SpellSlotLevelSchema = PositiveIntegerSchema.pipe(
  Schema.lessThanOrEqualTo(9),
);
const SpendSpellAccessFreeCastOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("spendSpellAccessFreeCast"),
  sourceUnitId: UnitId,
  spellId: UnitId,
});
const UseMonkUncannyMetabolismWhenRollingInitiativeOperationArgsSchema =
  Schema.Struct({
    kind: Schema.Literal("useMonkUncannyMetabolismWhenRollingInitiative"),
    martialArtsRoll: PositiveIntegerSchema,
  });
const ConvertFontOfMagicSpellSlotToSorceryPointsOperationArgsSchema =
  Schema.Struct({
    kind: Schema.Literal("convertFontOfMagicSpellSlotToSorceryPoints"),
    spellLevel: SpellSlotLevelSchema,
    spellSlotSource: Schema.optionalWith(
      Schema.Literal(...FONT_OF_MAGIC_SPELL_SLOT_SOURCE_VALUES),
      { exact: true },
    ),
  });
const ConvertFontOfMagicSorceryPointsToSpellSlotOperationArgsSchema =
  Schema.Struct({
    kind: Schema.Literal("convertFontOfMagicSorceryPointsToSpellSlot"),
    spellLevel: SpellSlotLevelSchema,
  });
const CharacterSessionOperationArgsSchema = Schema.Union(
  RetainOneAtATimeCompanionOperationArgsSchema,
  LayOnHandsOperationArgsSchema,
  SpellRestBenefitOperationArgsSchema,
  AdvanceClassLevelOperationArgsSchema,
  ReplaceDruidWildShapeKnownFormOperationArgsSchema,
  CompleteShortRestOperationArgsSchema,
  InterruptShortRestOperationArgsSchema,
  CompleteLongRestOperationArgsSchema,
  InterruptLongRestOperationArgsSchema,
  PassCalendarTimeOperationArgsSchema,
  SpendSpellAccessFreeCastOperationArgsSchema,
  UseMonkUncannyMetabolismWhenRollingInitiativeOperationArgsSchema,
  ConvertFontOfMagicSpellSlotToSorceryPointsOperationArgsSchema,
  ConvertFontOfMagicSorceryPointsToSpellSlotOperationArgsSchema,
);

export const ApplyCharacterSessionOperationArgsSchema = Schema.Struct({
  characterId: CharacterSheetIdSchema,
  operation: CharacterSessionOperationArgsSchema,
});

type ApplyCharacterSessionOperationArgs = Schema.Schema.Type<
  typeof ApplyCharacterSessionOperationArgsSchema
>;
type CharacterSessionOperationArgs =
  ApplyCharacterSessionOperationArgs["operation"];

export type ApplyCharacterSessionOperationToolInput = {
  readonly characterId: CharacterSheetId;
  readonly operation: CharacterSessionOperationArgs;
};
