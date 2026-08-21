import { UnitId } from "@dnd/shared/game-facts";
import { Schema } from "effect";

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

export const CharacterBuildClassLevelGainSchema = Schema.Union(
  CharacterBuildPlainClassLevelGainSchema,
  CharacterBuildListPreparedSpellcastingLevelGainSchema,
  CharacterBuildFighterFightingStyleReplacementLevelGainSchema,
  CharacterBuildFightingStyleCantripReplacementLevelGainSchema,
  CharacterBuildWeaponMasteryLevelGainSchema,
  CharacterBuildFighterWeaponMasteryAndFightingStyleReplacementLevelGainSchema,
  CharacterBuildSorcererMetamagicLevelGainSchema,
  CharacterBuildWarlockLevelGainSchema,
);

export type CharacterBuildClassLevelGainSchemaInput = Schema.Schema.Type<
  typeof CharacterBuildClassLevelGainSchema
>;
