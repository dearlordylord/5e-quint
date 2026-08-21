import { CharacterSheetRetainedCompanionId } from "@dnd/character-sheet-runtime";
import { StatBlockId, UnitId } from "@dnd/shared/game-facts";
import { Schema } from "effect";

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
const CharacterSessionOperationArgsSchema = Schema.Union(
  RetainOneAtATimeCompanionOperationArgsSchema,
  AdvanceClassLevelOperationArgsSchema,
  ReplaceDruidWildShapeKnownFormOperationArgsSchema,
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
