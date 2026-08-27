import { Either, Match, ParseResult, Schema } from "effect";

import { MAGIC_INITIATE_SPELLCASTING_ABILITY_OPTIONS } from "@dnd/surface/surface/character-creation-readers";
import {
  ABILITIES,
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  LANGUAGES,
  STANDARD_LANGUAGES,
  UnitId as SharedUnitIdSchema,
  type CharacterStartingLanguages,
} from "@dnd/shared/game-facts";
import { AbilityScore } from "@dnd/shared/types";
import { hasDuplicateStructuralValues } from "@dnd/shared/structural-value";
import {
  ARMOR_TRAINING_CATEGORIES,
  SKILLS,
  WEAPON_PROFICIENCY_CATEGORIES,
} from "@dnd/surface/surface/types";
import {
  CHARACTER_DRAFT_CHOICE_PATHS,
  CREATION_BATCH_ISSUE_CODES,
  CREATION_FILL_ISSUE_CODES,
  LOADOUT_SLOTS,
  SUPPORTED_ABILITY_SCORE_METHODS,
  UNIT_CHOICE_KEYS,
  isCharacterBuildToolProficiencyId,
  parseCreationHoleId,
  CHARACTER_BUILD_TOOL_PROFICIENCY_IDS,
  type CharacterBuild,
  type CharacterBuildProjectionCause,
  type CharacterEquipmentItemSlot,
  type CreationChoiceOptionDecodeCause,
  type CreationBatchFillIssue,
  type CreationBatchFillResult,
  type CreationFill,
  type CreationFinalizationIssue,
  type CreationFinalizationIllegalCause,
  type CreationFinalizationResult,
  type CreationFinalizationUnsupportedCause,
  type CreationHole,
  type CreationHoleIdText,
  type NonEmptyReadonlyArray,
} from "./types.ts";
import { holeIdForSource } from "./hole-factories.ts";

const UnitIdSchema = SharedUnitIdSchema;
const AbilitySchema = Schema.Literal(...ABILITIES);
const CreationChoiceOptionIdSchema = Schema.String.pipe(
  Schema.brand("CreationChoiceOptionId"),
);
const CreationHoleIdSchema = Schema.String.pipe(
  Schema.filter(
    (value): value is CreationHoleIdText => parseCreationHoleId(value) !== null,
    { message: () => "invalid Creation Hole id" },
  ),
  Schema.brand("CreationHoleId"),
);
const ChoiceCountSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.brand("ChoiceCount"),
);
const ChoiceMinimumCountSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("NonNegativeInteger"),
  Schema.brand("ChoiceMinimumCount"),
);
const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("NonNegativeInteger"),
);
const CopperPieceAmountSchema = Schema.Number.pipe(
  Schema.int({ message: () => "invalid copper-piece amount" }),
  Schema.greaterThanOrEqualTo(0, {
    message: () => "invalid copper-piece amount",
  }),
  Schema.lessThanOrEqualTo(Number.MAX_SAFE_INTEGER, {
    message: () => "invalid copper-piece amount",
  }),
  Schema.brand("NonNegativeInteger"),
  Schema.brand("CopperPieceAmount"),
);
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.brand("PositiveInteger"),
);
const FillIndexSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("Index"),
  Schema.brand("FillIndex"),
);
const AbilityScoreAssignmentSchema = Schema.Struct({
  str: AbilityScore,
  dex: AbilityScore,
  con: AbilityScore,
  int: AbilityScore,
  wis: AbilityScore,
  cha: AbilityScore,
});

const ChoiceCardinalitySchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("exactly"), count: ChoiceCountSchema }),
  Schema.Struct({
    tag: Schema.Literal("between"),
    min: ChoiceMinimumCountSchema,
    max: ChoiceCountSchema,
  }).pipe(
    Schema.filter(({ min, max }) => min <= max, {
      message: () => "cardinality maximum must be at least its minimum",
    }),
  ),
);
const ChoiceHoleSourceSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("draft"),
    path: Schema.Literal(...CHARACTER_DRAFT_CHOICE_PATHS),
  }),
  Schema.Struct({
    tag: Schema.Literal("unitChoice"),
    unitId: UnitIdSchema.pipe(Schema.brand("UnitChoiceSourceUnitId")),
    choiceKey: Schema.Literal(...UNIT_CHOICE_KEYS),
  }),
  Schema.Struct({
    tag: Schema.Literal("loadout"),
    equipmentUnitId: UnitIdSchema.pipe(Schema.brand("LoadoutEquipmentUnitId")),
    slot: Schema.Literal(...LOADOUT_SLOTS),
  }),
);
const UnitRefSchema = Schema.Struct({
  unitId: UnitIdSchema,
  selectedOption: Schema.optionalWith(
    Schema.Struct({
      kind: Schema.Literal("huntersPrey"),
      selection: Schema.Literal(
        "woundedTargetWeaponDamage",
        "nearbyDifferentTargetSameWeaponAttack",
      ),
    }),
    { exact: true },
  ),
});
const CreationChoiceOptionFactSchema = Schema.Struct({
  optionId: CreationChoiceOptionIdSchema,
  unitRef: Schema.optionalWith(UnitRefSchema, { exact: true }),
});

const CreationFillOptionIdsSchema = Schema.Array(
  CreationChoiceOptionIdSchema,
).pipe(
  Schema.filter((optionIds) => !hasDuplicateStructuralValues(optionIds), {
    message: () => "choice optionIds must not contain duplicate members",
    jsonSchema: { uniqueItems: true },
  }),
);

export const CreationHoleFactSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("choice"),
    holeId: CreationHoleIdSchema,
    source: ChoiceHoleSourceSchema,
    cardinality: ChoiceCardinalitySchema,
    options: Schema.Array(CreationChoiceOptionFactSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("abilityScores"),
    holeId: CreationHoleIdSchema,
    source: Schema.Struct({
      tag: Schema.Literal("draft"),
      path: Schema.Literal("draft.abilityScoreGeneration"),
    }),
    methods: Schema.Array(Schema.Literal(...SUPPORTED_ABILITY_SCORE_METHODS)),
  }),
).pipe(
  Schema.filter(({ holeId, source }) => holeId === holeIdForSource(source), {
    message: () => "Creation Hole identity must match its owner source",
  }),
);
export type CreationHoleFact = Schema.Schema.Type<
  typeof CreationHoleFactSchema
>;

export const CreationFrontierFactSchema = Schema.Struct({
  holes: Schema.Array(CreationHoleFactSchema),
});
export type CreationFrontierFact = Schema.Schema.Type<
  typeof CreationFrontierFactSchema
>;

export const CreationFillFactSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("choice"),
    holeId: CreationHoleIdSchema,
    optionIds: CreationFillOptionIdsSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("abilityScores"),
    holeId: CreationHoleIdSchema,
    method: Schema.Literal(...SUPPORTED_ABILITY_SCORE_METHODS),
    value: AbilityScoreAssignmentSchema,
  }),
);
export type CreationFillFact = Schema.Schema.Type<
  typeof CreationFillFactSchema
>;

const ProgressionSchema = Schema.Struct({
  startingClass: UnitIdSchema,
  advancements: Schema.Array(
    Schema.Struct({
      classUnitId: UnitIdSchema,
      hitPointRule: Schema.Struct({
        tag: Schema.Literal("fixedHigherLevelGain"),
      }),
    }),
  ),
});
const OriginLanguagesSchema = Schema.Tuple(
  Schema.Literal("Common").annotations({
    message: () => "origin languages must contain Common and two others",
  }),
  Schema.Literal(...STANDARD_LANGUAGES),
  Schema.Literal(...STANDARD_LANGUAGES),
).pipe(
  Schema.filter(
    (languages): languages is CharacterStartingLanguages =>
      !hasDuplicateStructuralValues(languages),
    {
      message: () => "origin languages must contain Common and two others",
      jsonSchema: { minItems: 3, maxItems: 3, uniqueItems: true },
    },
  ),
);
const SpeciesChoiceFactsSchema = Schema.Union(
  Schema.Struct({
    draconicAncestry: Schema.Struct({
      kind: Schema.Literal("draconicAncestry"),
      ancestorId: Schema.String.pipe(
        Schema.brand("CharacterDraconicAncestrySelection"),
      ),
    }),
  }),
  Schema.Struct({
    gnomishLineage: Schema.Struct({
      kind: Schema.Literal("gnomishLineage"),
      lineageId: Schema.Literal("forest_gnome", "rock_gnome"),
      spellcastingAbility: Schema.Literal("int", "wis", "cha"),
    }),
  }),
);
const ClassFeatureLanguageSchema = Schema.Struct({
  kind: Schema.Literal(
    "classFeatureLanguageGrant",
    "classFeatureLanguageChoice",
  ),
  sourceUnitId: UnitIdSchema,
  language: Schema.Literal(...LANGUAGES),
});
const ProficiencyChoiceSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("skill"),
    skill: Schema.Literal(...SKILLS),
  }),
  Schema.Struct({
    kind: Schema.Literal("skill_expertise"),
    skill: Schema.Literal(...SKILLS),
  }),
  Schema.Struct({
    kind: Schema.Literal("weapon_category"),
    category: Schema.Literal(...WEAPON_PROFICIENCY_CATEGORIES),
  }),
  Schema.Struct({
    kind: Schema.Literal("armor_category"),
    category: Schema.Literal(...ARMOR_TRAINING_CATEGORIES),
  }),
  Schema.Struct({
    kind: Schema.Literal("tool"),
    toolId: Schema.String.pipe(Schema.brand("ToolProficiencyId")),
  }),
);
const EldritchInvocationIdSchema = Schema.String.pipe(
  Schema.brand("EldritchInvocationId"),
);
const FeatureSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("selectedClassChoice"),
    selectedFromUnitId: UnitIdSchema,
    unitId: UnitIdSchema,
    selectedOption: Schema.optionalWith(
      Schema.Struct({
        kind: Schema.Literal("huntersPrey"),
        selection: Schema.Literal(
          "woundedTargetWeaponDamage",
          "nearbyDifferentTargetSameWeaponAttack",
        ),
      }),
      { exact: true },
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("selectedEldritchInvocation"),
    selectedFromUnitId: UnitIdSchema,
    selection: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("nonRepeatable"),
        invocationId: EldritchInvocationIdSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("repeatable"),
        invocationId: EldritchInvocationIdSchema,
        repeatableChoice: Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("knownWarlockCantrip"),
            cantripId: UnitIdSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("originFeat"),
            featUnitId: UnitIdSchema,
          }),
        ),
      }),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("selectedSorcererMetamagicOption"),
    selectedFromUnitId: UnitIdSchema,
    optionId: Schema.String.pipe(Schema.brand("SorcererMetamagicOptionId")),
  }),
  Schema.Struct({
    kind: Schema.Literal("abilityCheckBonus"),
    selectedFromUnitId: UnitIdSchema,
    ability: AbilitySchema,
    skills: Schema.Array(Schema.Literal(...SKILLS)),
    bonus: Schema.Struct({
      kind: Schema.Literal("abilityModifier"),
      ability: AbilitySchema,
      minimum: Schema.Number.pipe(Schema.int()),
    }),
  }),
);
const characterEquipmentItemIdSchema = <
  const Slot extends CharacterEquipmentItemSlot,
>(
  slot?: Slot,
) =>
  Schema.String.pipe(
    Schema.pattern(
      new RegExp(
        slot === undefined
          ? "^(?:armor|shield|main|off):(?=\\S)[\\s\\S]*\\S$"
          : `^${slot}:(?=\\S)[\\s\\S]*\\S$`,
      ),
      { message: () => "invalid Character Equipment Item id" },
    ),
    Schema.brand("CharacterEquipmentItemId"),
  );
const EquipmentSchema = Schema.Struct({
  startingEquipmentCurrencyRemainderCp: CopperPieceAmountSchema,
  owned: Schema.Array(
    Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("catalogItem"),
        itemId: characterEquipmentItemIdSchema(),
        quantity: PositiveIntegerSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("authoredCatalogItem"),
        itemId: characterEquipmentItemIdSchema(),
        authoredItemId: Schema.NonEmptyString,
        spellcastingFocusKind: Schema.Literal("arcane"),
        quantity: PositiveIntegerSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("authoredStartingItem"),
        itemName: Schema.NonEmptyString,
        quantity: PositiveIntegerSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("selectedToolItem"),
        toolProficiencyId: Schema.String.pipe(
          Schema.filter(isCharacterBuildToolProficiencyId, {
            message: () => "invalid Character Build tool proficiency id",
            jsonSchema: {
              enum: [...CHARACTER_BUILD_TOOL_PROFICIENCY_IDS],
            },
          }),
          Schema.brand("ToolProficiencyId"),
        ),
        quantity: PositiveIntegerSchema,
      }),
    ),
  ),
  loadout: Schema.Struct({
    armor: Schema.optionalWith(characterEquipmentItemIdSchema("armor"), {
      exact: true,
    }),
    shield: Schema.optionalWith(characterEquipmentItemIdSchema("shield"), {
      exact: true,
    }),
    weapon: Schema.optionalWith(
      Schema.Struct({
        itemId: characterEquipmentItemIdSchema("main"),
        grip: Schema.Literal("one_handed"),
      }),
      { exact: true },
    ),
    offHandWeapon: Schema.optionalWith(
      Schema.Struct({ itemId: characterEquipmentItemIdSchema("off") }),
      { exact: true },
    ),
  }),
});
const SpellcastingSchema = Schema.Struct({
  sources: Schema.NonEmptyArray(
    Schema.Struct({
      sourceUnitId: UnitIdSchema,
      spellcastingAbility: AbilitySchema,
      cantrips: Schema.Array(UnitIdSchema),
      spellbook: Schema.Array(UnitIdSchema),
      preparedSpells: Schema.Array(UnitIdSchema),
      spellcastingFocuses: Schema.Array(
        Schema.Literal(
          "arcane_focus",
          "druidic_focus",
          "holy_symbol",
          "musical_instrument",
          "book_of_shadows",
          "spellbook",
        ),
      ),
      bookOfShadows: Schema.optionalWith(
        Schema.Struct({
          tag: Schema.Literal("bookOfShadows"),
          cantrips: Schema.Tuple(UnitIdSchema, UnitIdSchema, UnitIdSchema),
          ritualSpells: Schema.Tuple(UnitIdSchema, UnitIdSchema),
          spellcastingFocus: Schema.Literal("book_of_shadows"),
        }),
        { exact: true },
      ),
    }),
  ),
  slotPools: Schema.Struct({
    spellcasting: Schema.optionalWith(
      Schema.Struct({
        kind: Schema.Literal("spellcasting"),
        slots: Schema.Array(
          Schema.Struct({
            spellLevel: Schema.Number.pipe(Schema.int(), Schema.between(1, 9)),
            count: Schema.Number.pipe(
              Schema.int(),
              Schema.greaterThanOrEqualTo(0),
            ),
          }),
        ),
      }),
      { exact: true },
    ),
    pactMagic: Schema.optionalWith(
      Schema.Struct({
        kind: Schema.Literal("pactMagic"),
        slotLevel: Schema.Number.pipe(Schema.int(), Schema.between(1, 9)),
        count: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
      }),
      { exact: true },
    ),
  }),
});

const MagicInitiateSpellAccessSchema = Schema.Struct({
  featUnitId: UnitIdSchema,
  spellcastingAbility: Schema.Literal(
    ...MAGIC_INITIATE_SPELLCASTING_ABILITY_OPTIONS,
  ),
  cantrips: Schema.Tuple(UnitIdSchema, UnitIdSchema),
  levelOneSpell: UnitIdSchema,
});

export const CharacterBuildFactSchema = Schema.Struct({
  progression: ProgressionSchema,
  background: UnitIdSchema,
  species: UnitIdSchema,
  speciesSize: Schema.optionalWith(Schema.Literal("medium", "small"), {
    exact: true,
  }),
  speciesChoiceFacts: Schema.optionalWith(SpeciesChoiceFactsSchema, {
    exact: true,
  }),
  originLanguages: OriginLanguagesSchema,
  classFeatureLanguages: Schema.Array(ClassFeatureLanguageSchema),
  alignment: Schema.Struct({
    order: Schema.Literal(...ALIGNMENT_ORDERS),
    morality: Schema.Literal(...ALIGNMENT_MORALITIES),
  }),
  abilityScores: AbilityScoreAssignmentSchema,
  proficiencyChoices: Schema.Array(ProficiencyChoiceSchema),
  features: Schema.Array(FeatureSchema),
  spellcasting: Schema.optionalWith(SpellcastingSchema, { exact: true }),
  magicInitiateSpellAccesses: Schema.Array(MagicInitiateSpellAccessSchema),
  equipment: EquipmentSchema,
});
export type CharacterBuildFact = Schema.Schema.Type<
  typeof CharacterBuildFactSchema
>;

const CreationFillIssueFactSchema = Schema.Struct({
  tag: Schema.Literal("illegalFill"),
  holeId: CreationHoleIdSchema,
  fillIndex: FillIndexSchema,
  code: Schema.Literal(...CREATION_FILL_ISSUE_CODES),
});
const CreationBatchIssueFactSchema = Schema.Struct({
  tag: Schema.Literal("illegalBatch"),
  code: Schema.Literal(...CREATION_BATCH_ISSUE_CODES),
});
export const CreationBatchRejectionFactSchema = Schema.Union(
  CreationFillIssueFactSchema,
  CreationBatchIssueFactSchema,
);
export type CreationBatchRejectionFact = Schema.Schema.Type<
  typeof CreationBatchRejectionFactSchema
>;

const CreationFinalizationIllegalCauseFactSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("draftIncomplete") }),
  Schema.Struct({
    tag: Schema.Literal("conflictingSpeciesChoiceSources"),
    speciesUnitId: UnitIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("missingDraconicAncestrySource"),
    speciesUnitId: UnitIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("invalidDraconicAncestrySelection"),
    speciesUnitId: UnitIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("multipleSpeciesLineageSources"),
    speciesUnitId: UnitIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("invalidGnomishLineageSelection"),
    traitUnitId: UnitIdSchema,
  }),
  Schema.Struct({ tag: Schema.Literal("multipleSpellcastingSlotPools") }),
  Schema.Struct({ tag: Schema.Literal("multiplePactMagicSlotPools") }),
);
type CreationFinalizationIllegalCauseFact = Schema.Schema.Type<
  typeof CreationFinalizationIllegalCauseFactSchema
>;

const CreationChoiceOptionDecodeCauseFactSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("unsupportedAbility") }),
  Schema.Struct({ tag: Schema.Literal("duplicateAbilities") }),
  Schema.Struct({
    tag: Schema.Literal("invalidAbilityScoreIncreaseValue"),
    field: Schema.Literal("increase"),
    reason: Schema.Literal("nonPositive", "unsafeInteger"),
  }),
  Schema.Struct({
    tag: Schema.Literal("invalidAbilityScoreIncreaseValue"),
    field: Schema.Literal("maximum"),
    reason: Schema.Literal("nonPositive", "unsafeInteger", "maximumOutOfRange"),
  }),
  Schema.Struct({ tag: Schema.Literal("invalidAbilityScoreIncreaseEncoding") }),
  Schema.Struct({ tag: Schema.Literal("unsupportedWeaponCategory") }),
  Schema.Struct({ tag: Schema.Literal("unsupportedArmorCategory") }),
  Schema.Struct({ tag: Schema.Literal("unsupportedToolProficiencyId") }),
  Schema.Struct({ tag: Schema.Literal("invalidProficiencyEncoding") }),
  Schema.Struct({
    tag: Schema.Literal("unsupportedCharacterBuildToolProficiencyId"),
  }),
);
type CreationChoiceOptionDecodeCauseFact = Schema.Schema.Type<
  typeof CreationChoiceOptionDecodeCauseFactSchema
>;

const SurfaceReadIssueFactSchema = Schema.Struct({
  code: Schema.Literal("unsupportedUnitKind"),
});

const CharacterBuildProjectionCauseFactSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("missingStartingClassFacts"),
    projection: Schema.Literal(
      "characterBuild",
      "hitPoints",
      "proficiencies",
      "armorTraining",
    ),
    classUnitId: UnitIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("missingHitPointMaximumGrantSourceUnit"),
    sourceUnitId: UnitIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("unsupportedHitPointMaximumGrant"),
    sourceUnitId: UnitIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("unsupportedClassFeatureLanguage"),
    featureUnitId: UnitIdSchema,
    languageId: Schema.String,
  }),
  Schema.Struct({
    tag: Schema.Literal("duplicateClassFeatureLanguage"),
    featureUnitId: UnitIdSchema,
    language: Schema.Literal(...LANGUAGES),
  }),
  Schema.Struct({
    tag: Schema.Literal("missingClassFeatureLanguageChoice"),
    featureUnitId: UnitIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("classFeatureLanguageChoiceCountMismatch"),
    featureUnitId: UnitIdSchema,
    mismatch: Schema.Union(
      Schema.Struct({
        tag: Schema.Literal("missing"),
        receivedCount: NonNegativeIntegerSchema,
        missingCount: PositiveIntegerSchema,
      }),
      Schema.Struct({
        tag: Schema.Literal("extra"),
        expectedCount: PositiveIntegerSchema,
        extraCount: PositiveIntegerSchema,
      }),
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("unsupportedClassFeatureLanguageChoice"),
    featureUnitId: UnitIdSchema,
    optionId: CreationChoiceOptionIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("duplicateClassFeatureLanguageChoice"),
    featureUnitId: UnitIdSchema,
    language: Schema.Literal(...LANGUAGES),
  }),
  Schema.Struct({
    tag: Schema.Literal("unprojectableAbilityCheckBonus"),
    featureUnitId: UnitIdSchema,
    optionId: Schema.String,
  }),
  Schema.Struct({
    tag: Schema.Literal("unsupportedEquipmentUnitId"),
    equipmentUnitId: UnitIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("unsupportedEquipmentCost"),
    equipmentUnitId: UnitIdSchema,
    costGp: Schema.Number,
  }),
  Schema.Struct({
    tag: Schema.Literal("unsupportedStartingCurrency"),
    sourceUnitId: UnitIdSchema,
    coinsGp: Schema.Number,
  }),
  Schema.Struct({
    tag: Schema.Literal("currencySumOutsideCopperPieceAmountRange"),
    source: Schema.Literal(
      "startingEquipmentGrants",
      "selectedEquipmentPurchases",
    ),
    components: Schema.Array(CopperPieceAmountSchema),
  }),
  Schema.Struct({
    tag: Schema.Literal("startingCurrencyInsufficientForEquipmentPurchases"),
    availableCp: CopperPieceAmountSchema,
    purchaseCostCp: CopperPieceAmountSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("unreadableUnit"),
    role: Schema.Literal("class", "background", "species"),
    unitId: UnitIdSchema,
    issues: Schema.NonEmptyArray(SurfaceReadIssueFactSchema),
  }),
  Schema.Struct({
    tag: Schema.Literal("unknownUnit"),
    role: Schema.Literal("class", "background", "species", "feat"),
    unitId: UnitIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("abilityScoreCapExceeded"),
    source: Schema.Literal("background"),
    ability: AbilitySchema,
    excess: PositiveIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("abilityScoreCapExceeded"),
    source: Schema.Literal("classFeature"),
    ability: AbilitySchema,
    maximum: AbilityScore,
    excess: PositiveIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("unsupportedToolProficiency"),
    source: Schema.Literal("background", "surfaceGrant"),
    toolId: Schema.String,
  }),
  Schema.Struct({
    tag: Schema.Literal("invalidChoiceOption"),
    optionId: Schema.String,
    reason: CreationChoiceOptionDecodeCauseFactSchema,
  }),
);
type CharacterBuildProjectionCauseFact = Schema.Schema.Type<
  typeof CharacterBuildProjectionCauseFactSchema
>;

const CreationFinalizationUnsupportedCauseFactSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("unsupportedBackground") }),
  Schema.Struct({ tag: Schema.Literal("unsupportedSpecies") }),
  Schema.Struct({ tag: Schema.Literal("speciesSizeMismatch") }),
  Schema.Struct({ tag: Schema.Literal("draconicAncestryMismatch") }),
  Schema.Struct({ tag: Schema.Literal("unsupportedProgression") }),
  Schema.Struct({ tag: Schema.Literal("unsupportedAbilityScoreGeneration") }),
  Schema.Struct({
    tag: Schema.Literal("unsupportedBackgroundAbilityScoreIncrease"),
  }),
  Schema.Struct({ tag: Schema.Literal("manifestLanguagesMismatch") }),
  Schema.Struct({ tag: Schema.Literal("manifestAlignmentMismatch") }),
  Schema.Struct({ tag: Schema.Literal("unsupportedChoices") }),
  Schema.Struct({ tag: Schema.Literal("selectedFeatPrerequisitesNotMet") }),
  Schema.Struct({ tag: Schema.Literal("duplicateMagicInitiateSpellList") }),
  Schema.Struct({ tag: Schema.Literal("missingSpellcastingFacts") }),
  Schema.Struct({ tag: Schema.Literal("preparedSpellSelectionMismatch") }),
  Schema.Struct({ tag: Schema.Literal("duplicateWizardSpellbookSelection") }),
  Schema.Struct({ tag: Schema.Literal("unsupportedEquipmentSelection") }),
);
type CreationFinalizationUnsupportedCauseFact = Schema.Schema.Type<
  typeof CreationFinalizationUnsupportedCauseFactSchema
>;

export const CreationFinalizationIssueSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("illegalFinalization"),
    cause: CreationFinalizationIllegalCauseFactSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("characterBuildProjection"),
    cause: CharacterBuildProjectionCauseFactSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("unsupportedFinalization"),
    cause: CreationFinalizationUnsupportedCauseFactSchema,
  }),
);
export const CreationFinalizationRejectionFactSchema =
  CreationFinalizationIssueSchema;
export type CreationFinalizationRejectionFact = Schema.Schema.Type<
  typeof CreationFinalizationRejectionFactSchema
>;

export const CreationFinalizationFactSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("ready"),
    build: CharacterBuildFactSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("incomplete"),
    blockingHoles: Schema.NonEmptyArray(CreationHoleFactSchema),
  }),
  Schema.Struct({
    tag: Schema.Literal("invalid"),
    issues: Schema.NonEmptyArray(CreationFinalizationRejectionFactSchema),
  }),
);
export type CreationFinalizationFact = Schema.Schema.Type<
  typeof CreationFinalizationFactSchema
>;

const CreationBatchFinalizationFactSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("ready"),
    build: CharacterBuildFactSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("incomplete"),
    blockingHoleIds: Schema.NonEmptyArray(CreationHoleIdSchema),
  }),
  Schema.Struct({
    tag: Schema.Literal("invalid"),
    issues: Schema.NonEmptyArray(CreationFinalizationRejectionFactSchema),
  }),
);
type CreationBatchFinalizationFact = Schema.Schema.Type<
  typeof CreationBatchFinalizationFactSchema
>;

function isOrderedBlockingHoleIdSubsequence(
  frontier: CreationFrontierFact,
  blockingHoleIds: NonEmptyReadonlyArray<CreationHoleIdText>,
): boolean {
  let frontierIndex = 0;
  for (const blockingHoleId of blockingHoleIds) {
    const matchingIndex = frontier.holes.findIndex(
      (hole, index) => index >= frontierIndex && hole.holeId === blockingHoleId,
    );
    if (matchingIndex === -1) {
      return false;
    }
    frontierIndex = matchingIndex + 1;
  }
  return true;
}

export const CharacterCreationBatchFactSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("accepted"),
    frontier: CreationFrontierFactSchema,
    finalization: CreationBatchFinalizationFactSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("rejected"),
    frontier: CreationFrontierFactSchema,
    issues: Schema.NonEmptyArray(CreationBatchRejectionFactSchema),
    finalization: CreationBatchFinalizationFactSchema,
  }),
).pipe(
  Schema.filter(
    ({ frontier, finalization }) =>
      finalization.tag !== "incomplete" ||
      isOrderedBlockingHoleIdSubsequence(
        frontier,
        finalization.blockingHoleIds,
      ),
    {
      message: () =>
        "finalization blocker ids must be an ordered subsequence of the frontier",
    },
  ),
);
export type CharacterCreationBatchFact = Schema.Schema.Type<
  typeof CharacterCreationBatchFactSchema
>;

const strictDecodeOptions: { readonly onExcessProperty: "error" } = {
  onExcessProperty: "error",
};
export const decodeCreationHoleFact = Schema.decodeUnknownEither(
  CreationHoleFactSchema,
  strictDecodeOptions,
);
export const decodeCreationFrontierFact = Schema.decodeUnknownEither(
  CreationFrontierFactSchema,
  strictDecodeOptions,
);
export const decodeCreationFillFact = Schema.decodeUnknownEither(
  CreationFillFactSchema,
  strictDecodeOptions,
);
export const decodeCharacterBuildFact = Schema.decodeUnknownEither(
  CharacterBuildFactSchema,
  strictDecodeOptions,
);
export const decodeCreationBatchRejectionFact = Schema.decodeUnknownEither(
  CreationBatchRejectionFactSchema,
  strictDecodeOptions,
);
export const decodeCreationFinalizationRejectionFact =
  Schema.decodeUnknownEither(
    CreationFinalizationRejectionFactSchema,
    strictDecodeOptions,
  );
export const decodeCreationFinalizationFact = Schema.decodeUnknownEither(
  CreationFinalizationFactSchema,
  strictDecodeOptions,
);
export const decodeCharacterCreationBatchFact = Schema.decodeUnknownEither(
  CharacterCreationBatchFactSchema,
  strictDecodeOptions,
);

function noUnprojectedFields(
  fields: Readonly<Record<PropertyKey, never>>,
): void;
function noUnprojectedFields(): void {}

function mapNonEmpty<A, B>(
  values: NonEmptyReadonlyArray<A>,
  project: (value: A) => B,
): NonEmptyReadonlyArray<B> {
  return [project(values[0]), ...values.slice(1).map(project)];
}

type ChoiceHole = Extract<CreationHole, { readonly kind: "choice" }>;
type ChoiceHoleFact = Extract<CreationHoleFact, { readonly kind: "choice" }>;
type ChoiceOption = ChoiceHole["options"][number];
type ChoiceOptionFact = ChoiceHoleFact["options"][number];

function choiceHoleSourceFact(
  source: ChoiceHole["source"],
): ChoiceHoleFact["source"] {
  return Match.value(source).pipe(
    Match.when({ tag: "draft" }, ({ tag, path, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag, path };
    }),
    Match.when(
      { tag: "unitChoice" },
      ({ tag, unitId, choiceKey, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, unitId, choiceKey };
      },
    ),
    Match.when(
      { tag: "loadout" },
      ({ tag, equipmentUnitId, slot, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, equipmentUnitId, slot };
      },
    ),
    Match.exhaustive,
  );
}

function choiceCardinalityFact(
  cardinality: ChoiceHole["cardinality"],
): ChoiceHoleFact["cardinality"] {
  return Match.value(cardinality).pipe(
    Match.when({ tag: "exactly" }, ({ tag, count, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag, count };
    }),
    Match.when({ tag: "between" }, ({ tag, min, max, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag, min, max };
    }),
    Match.exhaustive,
  );
}

function choiceOptionFact(option: ChoiceOption): ChoiceOptionFact {
  const { optionId, unitRef, label: _label, ...unprojected } = option;
  noUnprojectedFields(unprojected);
  if (unitRef === undefined) return { optionId };

  const { unitId, selectedOption, ...unprojectedUnitRef } = unitRef;
  noUnprojectedFields(unprojectedUnitRef);
  if (selectedOption === undefined) return { optionId, unitRef: { unitId } };

  const { kind, selection, ...unprojectedSelectedOption } = selectedOption;
  noUnprojectedFields(unprojectedSelectedOption);
  return { optionId, unitRef: { unitId, selectedOption: { kind, selection } } };
}

function abilityScoreAssignmentFact(
  assignment: Extract<
    CreationFill,
    { readonly kind: "abilityScores" }
  >["value"] &
    CharacterBuild["abilityScores"],
): Extract<CreationFillFact, { readonly kind: "abilityScores" }>["value"] {
  const { str, dex, con, int, wis, cha, ...unprojected } = assignment;
  noUnprojectedFields(unprojected);
  return { str, dex, con, int, wis, cha };
}

export function creationHoleFact(hole: CreationHole): CreationHoleFact {
  return Match.value(hole).pipe(
    Match.when({ kind: "choice" }, (choice) => {
      const {
        kind,
        holeId: _holeId,
        source,
        cardinality,
        options,
        ...unprojected
      } = choice;
      noUnprojectedFields(unprojected);
      return {
        kind,
        holeId: holeIdForSource(source),
        source: choiceHoleSourceFact(source),
        cardinality: choiceCardinalityFact(cardinality),
        options: options.map(choiceOptionFact),
      };
    }),
    Match.when({ kind: "abilityScores" }, (abilityScores) => {
      const {
        kind,
        holeId: _holeId,
        source,
        methods,
        ...unprojected
      } = abilityScores;
      noUnprojectedFields(unprojected);
      const { tag, path, ...unprojectedSource } = source;
      noUnprojectedFields(unprojectedSource);
      return {
        kind,
        holeId: holeIdForSource(source),
        source: { tag, path },
        methods,
      };
    }),
    Match.exhaustive,
  );
}

export function creationFrontierFact(
  holes: readonly CreationHole[],
): CreationFrontierFact {
  return { holes: holes.map(creationHoleFact) };
}

export function creationFillFact(fill: CreationFill): CreationFillFact {
  return Match.value(fill).pipe(
    Match.when({ kind: "choice" }, (choice) => {
      const { kind, holeId, optionIds, ...unprojected } = choice;
      noUnprojectedFields(unprojected);
      return { kind, holeId, optionIds };
    }),
    Match.when({ kind: "abilityScores" }, (abilityScores) => {
      const { kind, holeId, method, value, ...unprojected } = abilityScores;
      noUnprojectedFields(unprojected);
      return { kind, holeId, method, value: abilityScoreAssignmentFact(value) };
    }),
    Match.exhaustive,
  );
}

function progressionFact(
  progression: CharacterBuild["progression"],
): CharacterBuildFact["progression"] {
  const { startingClass, advancements, ...unprojected } = progression;
  noUnprojectedFields(unprojected);
  return {
    startingClass,
    advancements: advancements.map((advancement) => {
      const { classUnitId, hitPointRule, ...unprojectedAdvancement } =
        advancement;
      noUnprojectedFields(unprojectedAdvancement);
      const { tag, ...unprojectedHitPointRule } = hitPointRule;
      noUnprojectedFields(unprojectedHitPointRule);
      return { classUnitId, hitPointRule: { tag } };
    }),
  };
}

function speciesChoiceFactsFact(
  facts: NonNullable<CharacterBuild["speciesChoiceFacts"]>,
): NonNullable<CharacterBuildFact["speciesChoiceFacts"]> {
  if (facts.draconicAncestry !== undefined) {
    const {
      draconicAncestry,
      gnomishLineage: _gnomishLineage,
      ...unprojected
    } = facts;
    noUnprojectedFields(unprojected);
    const { kind, ancestorId, ...unprojectedAncestry } = draconicAncestry;
    noUnprojectedFields(unprojectedAncestry);
    return { draconicAncestry: { kind, ancestorId } };
  }

  const {
    gnomishLineage,
    draconicAncestry: _draconicAncestry,
    ...unprojected
  } = facts;
  noUnprojectedFields(unprojected);
  const { kind, lineageId, spellcastingAbility, ...unprojectedLineage } =
    gnomishLineage;
  noUnprojectedFields(unprojectedLineage);
  return { gnomishLineage: { kind, lineageId, spellcastingAbility } };
}

function classFeatureLanguageFact(
  language: CharacterBuild["classFeatureLanguages"][number],
): CharacterBuildFact["classFeatureLanguages"][number] {
  const { kind, sourceUnitId, language: languageId, ...unprojected } = language;
  noUnprojectedFields(unprojected);
  return { kind, sourceUnitId, language: languageId };
}

function proficiencyChoiceFact(
  choice: CharacterBuild["proficiencyChoices"][number],
): CharacterBuildFact["proficiencyChoices"][number] {
  return Match.value(choice).pipe(
    Match.when({ kind: "skill" }, ({ kind, skill, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { kind, skill };
    }),
    Match.when(
      { kind: "skill_expertise" },
      ({ kind, skill, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { kind, skill };
      },
    ),
    Match.when(
      { kind: "weapon_category" },
      ({ kind, category, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { kind, category };
      },
    ),
    Match.when(
      { kind: "armor_category" },
      ({ kind, category, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { kind, category };
      },
    ),
    Match.when({ kind: "tool" }, ({ kind, toolId, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { kind, toolId };
    }),
    Match.exhaustive,
  );
}

function eldritchInvocationSelectionFact(
  selection: Extract<
    CharacterBuild["features"][number],
    { readonly kind: "selectedEldritchInvocation" }
  >["selection"],
): Extract<
  CharacterBuildFact["features"][number],
  { readonly kind: "selectedEldritchInvocation" }
>["selection"] {
  return Match.value(selection).pipe(
    Match.when(
      { kind: "nonRepeatable" },
      ({ kind, invocationId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { kind, invocationId };
      },
    ),
    Match.when(
      { kind: "repeatable" },
      ({ kind, invocationId, repeatableChoice, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        const projectedRepeatableChoice = Match.value(repeatableChoice).pipe(
          Match.when(
            { kind: "knownWarlockCantrip" },
            ({ kind: repeatableKind, cantripId, ...unprojectedChoice }) => {
              noUnprojectedFields(unprojectedChoice);
              return { kind: repeatableKind, cantripId };
            },
          ),
          Match.when(
            { kind: "originFeat" },
            ({ kind: repeatableKind, featUnitId, ...unprojectedChoice }) => {
              noUnprojectedFields(unprojectedChoice);
              return { kind: repeatableKind, featUnitId };
            },
          ),
          Match.exhaustive,
        );
        return {
          kind,
          invocationId,
          repeatableChoice: projectedRepeatableChoice,
        };
      },
    ),
    Match.exhaustive,
  );
}

function featureFact(
  feature: CharacterBuild["features"][number],
): CharacterBuildFact["features"][number] {
  return Match.value(feature).pipe(
    Match.when(
      { kind: "selectedClassChoice" },
      ({
        kind,
        selectedFromUnitId,
        unitId,
        selectedOption,
        ...unprojected
      }) => {
        noUnprojectedFields(unprojected);
        if (selectedOption === undefined) {
          return { kind, selectedFromUnitId, unitId };
        }
        const {
          kind: selectedOptionKind,
          selection,
          ...unprojectedSelectedOption
        } = selectedOption;
        noUnprojectedFields(unprojectedSelectedOption);
        return {
          kind,
          selectedFromUnitId,
          unitId,
          selectedOption: { kind: selectedOptionKind, selection },
        };
      },
    ),
    Match.when(
      { kind: "selectedEldritchInvocation" },
      ({ kind, selectedFromUnitId, selection, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return {
          kind,
          selectedFromUnitId,
          selection: eldritchInvocationSelectionFact(selection),
        };
      },
    ),
    Match.when(
      { kind: "selectedSorcererMetamagicOption" },
      ({ kind, selectedFromUnitId, optionId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { kind, selectedFromUnitId, optionId };
      },
    ),
    Match.when(
      { kind: "abilityCheckBonus" },
      ({
        kind,
        selectedFromUnitId,
        ability,
        skills,
        bonus,
        ...unprojected
      }) => {
        noUnprojectedFields(unprojected);
        const {
          kind: bonusKind,
          ability: bonusAbility,
          minimum,
          ...unprojectedBonus
        } = bonus;
        noUnprojectedFields(unprojectedBonus);
        return {
          kind,
          selectedFromUnitId,
          ability,
          skills,
          bonus: { kind: bonusKind, ability: bonusAbility, minimum },
        };
      },
    ),
    Match.exhaustive,
  );
}

function spellcastingFact(
  spellcasting: NonNullable<CharacterBuild["spellcasting"]>,
): NonNullable<CharacterBuildFact["spellcasting"]> {
  const { sources, slotPools, ...unprojected } = spellcasting;
  noUnprojectedFields(unprojected);
  const projectedSources = mapNonEmpty(sources, (source) => {
    const {
      sourceUnitId,
      spellcastingAbility,
      cantrips,
      spellbook,
      preparedSpells,
      spellcastingFocuses,
      bookOfShadows,
      ...unprojectedSource
    } = source;
    noUnprojectedFields(unprojectedSource);
    if (bookOfShadows === undefined) {
      return {
        sourceUnitId,
        spellcastingAbility,
        cantrips,
        spellbook,
        preparedSpells,
        spellcastingFocuses,
      };
    }
    const {
      tag,
      cantrips: bookCantrips,
      ritualSpells,
      spellcastingFocus,
      ...unprojectedBook
    } = bookOfShadows;
    noUnprojectedFields(unprojectedBook);
    return {
      sourceUnitId,
      spellcastingAbility,
      cantrips,
      spellbook,
      preparedSpells,
      spellcastingFocuses,
      bookOfShadows: {
        tag,
        cantrips: bookCantrips,
        ritualSpells,
        spellcastingFocus,
      },
    };
  });

  const {
    spellcasting: ordinarySlots,
    pactMagic,
    ...unprojectedSlotPools
  } = slotPools;
  noUnprojectedFields(unprojectedSlotPools);
  const projectedOrdinarySlots =
    ordinarySlots === undefined
      ? undefined
      : (() => {
          const { kind, slots, ...unprojectedPool } = ordinarySlots;
          noUnprojectedFields(unprojectedPool);
          return {
            kind,
            slots: slots.map(({ spellLevel, count, ...unprojectedSlot }) => {
              noUnprojectedFields(unprojectedSlot);
              return { spellLevel, count };
            }),
          };
        })();
  const projectedPactMagic =
    pactMagic === undefined
      ? undefined
      : (() => {
          const { kind, slotLevel, count, ...unprojectedPool } = pactMagic;
          noUnprojectedFields(unprojectedPool);
          return { kind, slotLevel, count };
        })();

  return {
    sources: projectedSources,
    slotPools: {
      ...(projectedOrdinarySlots === undefined
        ? {}
        : { spellcasting: projectedOrdinarySlots }),
      ...(projectedPactMagic === undefined
        ? {}
        : { pactMagic: projectedPactMagic }),
    },
  };
}

function equipmentFact(
  equipment: CharacterBuild["equipment"],
): CharacterBuildFact["equipment"] {
  const {
    owned,
    loadout,
    startingEquipmentCurrencyRemainderCp,
    ...unprojected
  } = equipment;
  noUnprojectedFields(unprojected);
  const projectedOwned = owned.map((item) =>
    Match.value(item).pipe(
      Match.when({ kind: "catalogItem" }, (catalogItem) => {
        const { kind, itemId, quantity, ...unprojectedItem } = catalogItem;
        noUnprojectedFields(unprojectedItem);
        return { kind, itemId, quantity };
      }),
      Match.when({ kind: "authoredCatalogItem" }, (catalogItem) => {
        const {
          kind,
          itemId,
          authoredItemId,
          spellcastingFocusKind,
          quantity,
          ...unprojectedItem
        } = catalogItem;
        noUnprojectedFields(unprojectedItem);
        return {
          kind,
          itemId,
          authoredItemId,
          spellcastingFocusKind,
          quantity,
        };
      }),
      Match.when({ kind: "authoredStartingItem" }, (authoredItem) => {
        const { kind, itemName, quantity, ...unprojectedItem } = authoredItem;
        noUnprojectedFields(unprojectedItem);
        return { kind, itemName, quantity };
      }),
      Match.when({ kind: "selectedToolItem" }, (toolItem) => {
        const { kind, toolProficiencyId, quantity, ...unprojectedItem } =
          toolItem;
        noUnprojectedFields(unprojectedItem);
        return { kind, toolProficiencyId, quantity };
      }),
      Match.exhaustive,
    ),
  );
  const { armor, shield, weapon, offHandWeapon, ...unprojectedLoadout } =
    loadout;
  noUnprojectedFields(unprojectedLoadout);
  const projectedWeapon = weapon;
  const projectedOffHandWeapon =
    offHandWeapon === undefined
      ? undefined
      : (() => {
          const { itemId, ...unprojectedWeapon } = offHandWeapon;
          noUnprojectedFields(unprojectedWeapon);
          return { itemId };
        })();
  return {
    startingEquipmentCurrencyRemainderCp,
    owned: projectedOwned,
    loadout: {
      ...(armor === undefined ? {} : { armor }),
      ...(shield === undefined ? {} : { shield }),
      ...(projectedWeapon === undefined ? {} : { weapon: projectedWeapon }),
      ...(projectedOffHandWeapon === undefined
        ? {}
        : { offHandWeapon: projectedOffHandWeapon }),
    },
  };
}

export function characterBuildFact(build: CharacterBuild): CharacterBuildFact {
  const {
    progression,
    background,
    species,
    speciesSize,
    speciesChoiceFacts,
    originLanguages,
    classFeatureLanguages,
    alignment,
    abilityScores,
    proficiencyChoices,
    features,
    spellcasting,
    magicInitiateSpellAccesses,
    equipment,
    ...unprojected
  } = build;
  noUnprojectedFields(unprojected);
  return {
    progression: progressionFact(progression),
    background,
    species,
    ...(speciesSize === undefined ? {} : { speciesSize }),
    ...(speciesChoiceFacts === undefined
      ? {}
      : { speciesChoiceFacts: speciesChoiceFactsFact(speciesChoiceFacts) }),
    originLanguages,
    classFeatureLanguages: classFeatureLanguages.map(classFeatureLanguageFact),
    alignment: (() => {
      const { order, morality, ...unprojectedAlignment } = alignment;
      noUnprojectedFields(unprojectedAlignment);
      return { order, morality };
    })(),
    abilityScores: abilityScoreAssignmentFact(abilityScores),
    proficiencyChoices: proficiencyChoices.map(proficiencyChoiceFact),
    features: features.map(featureFact),
    ...(spellcasting === undefined
      ? {}
      : { spellcasting: spellcastingFact(spellcasting) }),
    magicInitiateSpellAccesses: magicInitiateSpellAccesses.map((access) => {
      const {
        featUnitId,
        spellcastingAbility,
        cantrips,
        levelOneSpell,
        ...unprojectedAccess
      } = access;
      noUnprojectedFields(unprojectedAccess);
      return { featUnitId, spellcastingAbility, cantrips, levelOneSpell };
    }),
    equipment: equipmentFact(equipment),
  };
}

function creationBatchRejectionFact(
  issue: CreationBatchFillIssue,
): CreationBatchRejectionFact {
  return Match.value(issue).pipe(
    Match.when({ tag: "illegalFill" }, (fillIssue) => {
      const {
        tag,
        holeId,
        fillIndex,
        code,
        message: _message,
        ...unprojected
      } = fillIssue;
      noUnprojectedFields(unprojected);
      return { tag, holeId, fillIndex, code };
    }),
    Match.when({ tag: "illegalBatch" }, (batchIssue) => {
      const { tag, code, message: _message, ...unprojected } = batchIssue;
      noUnprojectedFields(unprojected);
      return { tag, code };
    }),
    Match.exhaustive,
  );
}

const byTag = Match.discriminator("tag");

function creationFinalizationIllegalCauseFact(
  cause: CreationFinalizationIllegalCause,
): CreationFinalizationIllegalCauseFact {
  return Match.value(cause).pipe(
    byTag("draftIncomplete", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag(
      "conflictingSpeciesChoiceSources",
      ({ tag, speciesUnitId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, speciesUnitId };
      },
    ),
    byTag(
      "missingDraconicAncestrySource",
      ({ tag, speciesUnitId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, speciesUnitId };
      },
    ),
    byTag(
      "invalidDraconicAncestrySelection",
      ({ tag, speciesUnitId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, speciesUnitId };
      },
    ),
    byTag(
      "multipleSpeciesLineageSources",
      ({ tag, speciesUnitId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, speciesUnitId };
      },
    ),
    byTag(
      "invalidGnomishLineageSelection",
      ({ tag, traitUnitId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, traitUnitId };
      },
    ),
    byTag("multipleSpellcastingSlotPools", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("multiplePactMagicSlotPools", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    Match.exhaustive,
  );
}

function characterBuildProjectionCauseFact(
  cause: CharacterBuildProjectionCause,
): CharacterBuildProjectionCauseFact {
  return Match.value(cause).pipe(
    byTag(
      "missingStartingClassFacts",
      ({ tag, projection, classUnitId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, projection, classUnitId };
      },
    ),
    byTag(
      "missingHitPointMaximumGrantSourceUnit",
      ({ tag, sourceUnitId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, sourceUnitId };
      },
    ),
    byTag(
      "unsupportedHitPointMaximumGrant",
      ({ tag, sourceUnitId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, sourceUnitId };
      },
    ),
    byTag(
      "unsupportedClassFeatureLanguage",
      ({ tag, featureUnitId, languageId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, featureUnitId, languageId };
      },
    ),
    byTag(
      "duplicateClassFeatureLanguage",
      ({ tag, featureUnitId, language, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, featureUnitId, language };
      },
    ),
    byTag(
      "missingClassFeatureLanguageChoice",
      ({ tag, featureUnitId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, featureUnitId };
      },
    ),
    byTag(
      "classFeatureLanguageChoiceCountMismatch",
      ({ tag, featureUnitId, mismatch, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return {
          tag,
          featureUnitId,
          mismatch: classFeatureLanguageChoiceCountMismatchFact(mismatch),
        };
      },
    ),
    byTag(
      "unsupportedClassFeatureLanguageChoice",
      ({ tag, featureUnitId, optionId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, featureUnitId, optionId };
      },
    ),
    byTag(
      "duplicateClassFeatureLanguageChoice",
      ({ tag, featureUnitId, language, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, featureUnitId, language };
      },
    ),
    Match.orElse(characterBuildProjectionCauseFactRemaining),
  );
}

type ClassFeatureLanguageChoiceCountMismatch = Extract<
  CharacterBuildProjectionCause,
  { readonly tag: "classFeatureLanguageChoiceCountMismatch" }
>["mismatch"];

type ClassFeatureLanguageChoiceCountMismatchFact = Extract<
  CharacterBuildProjectionCauseFact,
  { readonly tag: "classFeatureLanguageChoiceCountMismatch" }
>["mismatch"];

function classFeatureLanguageChoiceCountMismatchFact(
  mismatch: ClassFeatureLanguageChoiceCountMismatch,
): ClassFeatureLanguageChoiceCountMismatchFact {
  return Match.value(mismatch).pipe(
    byTag("missing", ({ tag, receivedCount, missingCount, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag, receivedCount, missingCount };
    }),
    byTag("extra", ({ tag, expectedCount, extraCount, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag, expectedCount, extraCount };
    }),
    Match.exhaustive,
  );
}

type AbilityScoreCapExceededCause = Extract<
  CharacterBuildProjectionCause,
  { readonly tag: "abilityScoreCapExceeded" }
>;

type AbilityScoreCapExceededFact = Extract<
  CharacterBuildProjectionCauseFact,
  { readonly tag: "abilityScoreCapExceeded" }
>;

function abilityScoreCapExceededFact(
  cause: AbilityScoreCapExceededCause,
): AbilityScoreCapExceededFact {
  return Match.value(cause).pipe(
    Match.when(
      { source: "background" },
      ({ tag, source, ability, excess, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, source, ability, excess };
      },
    ),
    Match.when(
      { source: "classFeature" },
      ({ tag, source, ability, maximum, excess, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, source, ability, maximum, excess };
      },
    ),
    Match.exhaustive,
  );
}

type RemainingCharacterBuildProjectionCause = Extract<
  CharacterBuildProjectionCause,
  {
    readonly tag:
      | "unprojectableAbilityCheckBonus"
      | "unsupportedEquipmentUnitId"
      | "unsupportedEquipmentCost"
      | "unsupportedStartingCurrency"
      | "currencySumOutsideCopperPieceAmountRange"
      | "startingCurrencyInsufficientForEquipmentPurchases"
      | "unreadableUnit"
      | "unknownUnit"
      | "abilityScoreCapExceeded"
      | "unsupportedToolProficiency"
      | "invalidChoiceOption";
  }
>;

function characterBuildProjectionCauseFactRemaining(
  cause: RemainingCharacterBuildProjectionCause,
): CharacterBuildProjectionCauseFact {
  return Match.value(cause).pipe(
    byTag(
      "unprojectableAbilityCheckBonus",
      ({ tag, featureUnitId, optionId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, featureUnitId, optionId };
      },
    ),
    byTag(
      "unsupportedEquipmentUnitId",
      ({ tag, equipmentUnitId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, equipmentUnitId };
      },
    ),
    byTag(
      "unsupportedEquipmentCost",
      ({ tag, equipmentUnitId, costGp, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, equipmentUnitId, costGp };
      },
    ),
    byTag(
      "unsupportedStartingCurrency",
      ({ tag, sourceUnitId, coinsGp, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, sourceUnitId, coinsGp };
      },
    ),
    byTag(
      "currencySumOutsideCopperPieceAmountRange",
      ({ tag, source, components, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, source, components };
      },
    ),
    byTag(
      "startingCurrencyInsufficientForEquipmentPurchases",
      ({ tag, availableCp, purchaseCostCp, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, availableCp, purchaseCostCp };
      },
    ),
    byTag("unreadableUnit", ({ tag, role, unitId, issues, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return {
        tag,
        role,
        unitId,
        issues: surfaceReadIssueFacts(issues),
      };
    }),
    byTag("unknownUnit", ({ tag, role, unitId, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag, role, unitId };
    }),
    byTag("abilityScoreCapExceeded", abilityScoreCapExceededFact),
    byTag(
      "unsupportedToolProficiency",
      ({ tag, source, toolId, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag, source, toolId };
      },
    ),
    byTag(
      "invalidChoiceOption",
      ({ tag, optionId, reason, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return {
          tag,
          optionId,
          reason: creationChoiceOptionDecodeCauseFact(reason),
        };
      },
    ),
    Match.exhaustive,
  );
}

function surfaceReadIssueFacts(
  issues: Extract<
    CharacterBuildProjectionCause,
    { tag: "unreadableUnit" }
  >["issues"],
): readonly [
  Schema.Schema.Type<typeof SurfaceReadIssueFactSchema>,
  ...Schema.Schema.Type<typeof SurfaceReadIssueFactSchema>[],
] {
  const [firstIssue, ...remainingIssues] = issues;
  return [
    surfaceReadIssueFact(firstIssue),
    ...remainingIssues.map(surfaceReadIssueFact),
  ];
}

function surfaceReadIssueFact(
  issue: Extract<
    CharacterBuildProjectionCause,
    { tag: "unreadableUnit" }
  >["issues"][number],
): Schema.Schema.Type<typeof SurfaceReadIssueFactSchema> {
  return Match.value(issue).pipe(
    Match.when({ code: "unsupportedUnitKind" }, (unsupported) => {
      const { code, ...unprojected } = unsupported;
      noUnprojectedFields(unprojected);
      return { code };
    }),
    Match.exhaustive,
  );
}

function creationChoiceOptionDecodeCauseFact(
  cause: CreationChoiceOptionDecodeCause,
): CreationChoiceOptionDecodeCauseFact {
  return Match.value(cause).pipe(
    byTag("unsupportedAbility", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("duplicateAbilities", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("invalidAbilityScoreIncreaseValue", (invalidValue) =>
      Match.value(invalidValue).pipe(
        Match.when(
          { field: "increase" },
          ({ tag, field, reason, ...unprojected }) => {
            noUnprojectedFields(unprojected);
            return { tag, field, reason };
          },
        ),
        Match.when(
          { field: "maximum" },
          ({ tag, field, reason, ...unprojected }) => {
            noUnprojectedFields(unprojected);
            return { tag, field, reason };
          },
        ),
        Match.exhaustive,
      ),
    ),
    byTag("invalidAbilityScoreIncreaseEncoding", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("unsupportedWeaponCategory", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("unsupportedArmorCategory", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("unsupportedToolProficiencyId", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("invalidProficiencyEncoding", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag(
      "unsupportedCharacterBuildToolProficiencyId",
      ({ tag, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag };
      },
    ),
    Match.exhaustive,
  );
}

function creationFinalizationUnsupportedCauseFact(
  cause: CreationFinalizationUnsupportedCause,
): CreationFinalizationUnsupportedCauseFact {
  return Match.value(cause).pipe(
    byTag("unsupportedBackground", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("unsupportedSpecies", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("speciesSizeMismatch", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("draconicAncestryMismatch", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("unsupportedProgression", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("unsupportedAbilityScoreGeneration", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag(
      "unsupportedBackgroundAbilityScoreIncrease",
      ({ tag, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return { tag };
      },
    ),
    byTag("manifestLanguagesMismatch", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("manifestAlignmentMismatch", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("unsupportedChoices", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("selectedFeatPrerequisitesNotMet", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("duplicateMagicInitiateSpellList", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("missingSpellcastingFacts", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("preparedSpellSelectionMismatch", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("duplicateWizardSpellbookSelection", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    byTag("unsupportedEquipmentSelection", ({ tag, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag };
    }),
    Match.exhaustive,
  );
}

function creationFinalizationRejectionFact(
  issue: CreationFinalizationIssue,
): CreationFinalizationRejectionFact {
  return Match.value(issue).pipe(
    Match.when({ tag: "illegalFinalization" }, (illegal) => {
      const { tag, cause, ...unprojected } = illegal;
      noUnprojectedFields(unprojected);
      return { tag, cause: creationFinalizationIllegalCauseFact(cause) };
    }),
    Match.when({ tag: "characterBuildProjection" }, (projection) => {
      const { tag, cause, ...unprojected } = projection;
      noUnprojectedFields(unprojected);
      return {
        tag,
        cause: characterBuildProjectionCauseFact(cause),
      };
    }),
    Match.when({ tag: "unsupportedFinalization" }, (unsupported) => {
      const { tag, cause, ...unprojected } = unsupported;
      noUnprojectedFields(unprojected);
      return {
        tag,
        cause: creationFinalizationUnsupportedCauseFact(cause),
      };
    }),
    Match.exhaustive,
  );
}

export function creationFinalizationFact(
  result: CreationFinalizationResult,
): CreationFinalizationFact {
  return Match.value(result).pipe(
    Match.when({ tag: "ready" }, ({ tag, build, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag, build: characterBuildFact(build) };
    }),
    Match.when({ tag: "incomplete" }, ({ tag, holes, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag, blockingHoles: mapNonEmpty(holes, creationHoleFact) };
    }),
    Match.when({ tag: "invalid" }, ({ tag, issues, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return {
        tag,
        issues: mapNonEmpty(issues, creationFinalizationRejectionFact),
      };
    }),
    Match.exhaustive,
  );
}

function creationBatchFinalizationFact(
  result: CreationFinalizationResult,
): CreationBatchFinalizationFact {
  return Match.value(result).pipe(
    Match.when({ tag: "ready" }, ({ tag, build, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag, build: characterBuildFact(build) };
    }),
    Match.when({ tag: "incomplete" }, ({ tag, holes, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return {
        tag,
        blockingHoleIds: mapNonEmpty(
          holes,
          (hole) => creationHoleFact(hole).holeId,
        ),
      };
    }),
    Match.when({ tag: "invalid" }, ({ tag, issues, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return {
        tag,
        issues: mapNonEmpty(issues, creationFinalizationRejectionFact),
      };
    }),
    Match.exhaustive,
  );
}

export function characterCreationBatchFact(
  result: CreationBatchFillResult,
): Either.Either<CharacterCreationBatchFact, ParseResult.ParseError> {
  const candidate = Match.value(result).pipe(
    Match.when(
      { tag: "accepted" },
      ({ tag, holes, finalization, draft: _draft, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return {
          tag,
          frontier: creationFrontierFact(holes),
          finalization: creationBatchFinalizationFact(finalization),
        };
      },
    ),
    Match.when(
      { tag: "rejected" },
      ({ tag, holes, issues, finalization, draft: _draft, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return {
          tag,
          frontier: creationFrontierFact(holes),
          issues: mapNonEmpty(issues, creationBatchRejectionFact),
          finalization: creationBatchFinalizationFact(finalization),
        };
      },
    ),
    Match.exhaustive,
  );
  return decodeCharacterCreationBatchFact(candidate);
}
