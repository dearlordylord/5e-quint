import {
  CHARACTER_SHEET_REST_ACTIVITY_INTERRUPTION_VALUES,
  CharacterSheetRetainedCompanionId,
} from "@dnd/character-sheet-runtime";
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

const FixedHigherLevelGainRuleSchema = Schema.Struct({
  tag: Schema.Literal("fixedHigherLevelGain"),
});
const PreparedSpellReplacementSchema = Schema.Struct({
  replaceSpellId: UnitId,
  selectedSpellId: UnitId,
});
const ListPreparedSpellcastingGainSchema = Schema.Struct({
  gainedPreparedSpells: Schema.Array(UnitId),
  preparedSpellReplacement: Schema.optionalWith(
    PreparedSpellReplacementSchema,
    { exact: true },
  ),
});
const CharacterBuildPlainClassLevelGainSchema = Schema.Struct({
  tag: Schema.Literal("classLevelGain"),
  classUnitId: UnitId,
  hitPointRule: FixedHigherLevelGainRuleSchema,
});
const CharacterBuildListPreparedSpellcastingLevelGainSchema = Schema.Struct({
  tag: Schema.Literal("classLevelGainWithListPreparedSpellcasting"),
  classUnitId: UnitId,
  hitPointRule: FixedHigherLevelGainRuleSchema,
  preparedSpellcasting: ListPreparedSpellcastingGainSchema,
});
const CharacterBuildFighterFightingStyleReplacementLevelGainSchema =
  Schema.Struct({
    tag: Schema.Literal("fighterLevelGainWithFightingStyleReplacement"),
    classUnitId: UnitId,
    hitPointRule: FixedHigherLevelGainRuleSchema,
    replacement: Schema.Struct({
      selectedFeatUnitId: UnitId,
    }),
  });
const CharacterBuildFightingStyleCantripReplacementLevelGainSchema =
  Schema.Struct({
    tag: Schema.Literal("classLevelGainWithFightingStyleCantripReplacement"),
    classUnitId: UnitId,
    hitPointRule: FixedHigherLevelGainRuleSchema,
    replacement: Schema.Struct({
      replaceCantripId: UnitId,
      selectedCantripId: UnitId,
    }),
    preparedSpellcasting: ListPreparedSpellcastingGainSchema,
  });
const CharacterBuildWeaponMasteryLevelGainSchema = Schema.Struct({
  tag: Schema.Literal("classLevelGainWithWeaponMasterySelection"),
  classUnitId: UnitId,
  hitPointRule: FixedHigherLevelGainRuleSchema,
  weaponMastery: Schema.Struct({
    featureUnitId: UnitId,
    selectedWeaponUnitIds: Schema.Array(UnitId),
  }),
});
const CharacterBuildFighterWeaponMasteryAndFightingStyleReplacementLevelGainSchema =
  Schema.Struct({
    tag: Schema.Literal(
      "fighterLevelGainWithWeaponMasterySelectionAndFightingStyleReplacement",
    ),
    classUnitId: UnitId,
    hitPointRule: FixedHigherLevelGainRuleSchema,
    weaponMastery: Schema.Struct({
      featureUnitId: UnitId,
      selectedWeaponUnitIds: Schema.Array(UnitId),
    }),
    fightingStyleReplacement: Schema.Struct({
      selectedFeatUnitId: UnitId,
    }),
  });
const CharacterBuildSorcererMetamagicLevelGainSchema = Schema.Struct({
  tag: Schema.Literal("sorcererLevelGain"),
  classUnitId: UnitId,
  hitPointRule: FixedHigherLevelGainRuleSchema,
  metamagic: Schema.Struct({
    gainedOptions: Schema.Array(Schema.NonEmptyTrimmedString),
    replacement: Schema.optionalWith(
      Schema.Struct({
        replaceOptionId: Schema.NonEmptyTrimmedString,
        selectedOptionId: Schema.NonEmptyTrimmedString,
      }),
      { exact: true },
    ),
  }),
});
const EldritchInvocationSelectionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("nonRepeatable"),
    invocationId: Schema.NonEmptyTrimmedString,
  }),
  Schema.Struct({
    kind: Schema.Literal("repeatable"),
    invocationId: Schema.NonEmptyTrimmedString,
    repeatableChoice: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("knownWarlockCantrip"),
        cantripId: UnitId,
      }),
      Schema.Struct({
        kind: Schema.Literal("originFeat"),
        featUnitId: UnitId,
      }),
    ),
  }),
);
const CharacterBuildWarlockLevelGainSchema = Schema.Struct({
  tag: Schema.Literal("warlockLevelGain"),
  classUnitId: UnitId,
  hitPointRule: FixedHigherLevelGainRuleSchema,
  pactMagic: Schema.Struct({
    gainedCantrips: Schema.Array(UnitId),
    cantripReplacement: Schema.optionalWith(
      Schema.Struct({
        replaceCantripId: UnitId,
        selectedCantripId: UnitId,
      }),
      { exact: true },
    ),
    gainedPreparedSpells: Schema.Array(UnitId),
    preparedSpellReplacement: Schema.optionalWith(
      PreparedSpellReplacementSchema,
      { exact: true },
    ),
  }),
  eldritchInvocations: Schema.Struct({
    gainedInvocations: Schema.Array(EldritchInvocationSelectionSchema),
    replacement: Schema.optionalWith(
      Schema.Struct({
        replaceInvocation: EldritchInvocationSelectionSchema,
        selectedInvocation: EldritchInvocationSelectionSchema,
      }),
      { exact: true },
    ),
  }),
});
const CharacterBuildClassLevelGainSchema = Schema.Union(
  CharacterBuildPlainClassLevelGainSchema,
  CharacterBuildListPreparedSpellcastingLevelGainSchema,
  CharacterBuildFighterFightingStyleReplacementLevelGainSchema,
  CharacterBuildFightingStyleCantripReplacementLevelGainSchema,
  CharacterBuildWeaponMasteryLevelGainSchema,
  CharacterBuildFighterWeaponMasteryAndFightingStyleReplacementLevelGainSchema,
  CharacterBuildSorcererMetamagicLevelGainSchema,
  CharacterBuildWarlockLevelGainSchema,
);
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

const RestRecoveryArgsFields = {
  spendHitDice: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        classUnitId: UnitId,
        roll: PositiveIntegerSchema,
      }),
    ),
    { exact: true },
  ),
  arcaneRecovery: Schema.optionalWith(
    Schema.Struct({
      refundSpellSlots: Schema.Array(
        Schema.Struct({
          spellLevel: Schema.Number.pipe(
            Schema.int(),
            Schema.greaterThanOrEqualTo(1),
            Schema.lessThanOrEqualTo(9),
          ),
          count: NonNegativeIntegerSchema,
        }),
      ),
    }),
    { exact: true },
  ),
  sorcerousRestoration: Schema.optionalWith(
    Schema.Struct({
      recoverSorceryPoints: NonNegativeIntegerSchema,
    }),
    { exact: true },
  ),
} as const;

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
const CompleteLongRestOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("completeLongRest"),
  timing: LongRestTimingArgsSchema,
  restedTicks: NonNegativeIntegerSchema,
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
});
const InterruptLongRestOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("interruptLongRest"),
  timing: LongRestTimingArgsSchema,
  restedTicks: NonNegativeIntegerSchema,
  interruption: LongRestInterruptionArgsSchema,
  ...RestRecoveryArgsFields,
});
const PassCalendarTimeOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("passCalendarTime"),
  duration: CalendarTimeDurationArgsSchema,
  fills: Schema.Array(StableRecoveryFillArgsSchema),
});
const CharacterSessionOperationArgsSchema = Schema.Union(
  RetainOneAtATimeCompanionOperationArgsSchema,
  AdvanceClassLevelOperationArgsSchema,
  ReplaceDruidWildShapeKnownFormOperationArgsSchema,
  CompleteShortRestOperationArgsSchema,
  InterruptShortRestOperationArgsSchema,
  CompleteLongRestOperationArgsSchema,
  InterruptLongRestOperationArgsSchema,
  PassCalendarTimeOperationArgsSchema,
);

export const ApplyCharacterSessionOperationArgsSchema = Schema.Struct({
  characterId: Schema.String,
  operation: CharacterSessionOperationArgsSchema,
});

type ApplyCharacterSessionOperationArgs = Schema.Schema.Type<
  typeof ApplyCharacterSessionOperationArgsSchema
>;
type CharacterSessionOperationArgs =
  ApplyCharacterSessionOperationArgs["operation"];

export type ApplyCharacterSessionOperationToolInput = {
  readonly characterId: string;
  readonly operation: CharacterSessionOperationArgs;
};
