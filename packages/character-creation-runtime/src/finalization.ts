// KERNEL-COVERAGE: runtime-owner CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION CREATION.MAGIC_INITIATE.CHOICE_FINALIZATION
// KERNEL-COVERAGE: runtime-owner CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner CREATION.CLASS_FEATURE_OPTION.PROJECTION CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION
// KERNEL-COVERAGE: runtime-owner CREATION.CLASS_FEATURE_RESOURCE.PROJECTION
// KERNEL-COVERAGE: runtime-owner CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY
// KERNEL-COVERAGE: runtime-owner SHEET.HIT_POINTS.MAXIMUM_DERIVATION
// KERNEL-COVERAGE: runtime-owner CHARACTER.LIFECYCLE.LAYER_PROJECTION
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-prepared-spell-access
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.grappler-general-feat character-creation.wizard-spellbook-learning-choice character-creation.origin-feat-proficiency-choice character-creation.species-trait-proficiency-choice character-creation.species-origin-feat-choice character-creation.species-origin-feat-proficiency-choice
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.hit-point-maximum-projection unit-feature.hunters-prey character-creation.species-lineage-choice
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Either, Match, Option } from "effect";
import { isValidAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import { zeroHitPointReplacementUnitProfile } from "@dnd/shared-algebras/zero-hit-point-replacement-algebra";
import {
  NonNegativeInteger,
  PositiveInteger,
  abilityScore,
  hp,
} from "@dnd/shared/types";
import {
  MAGIC_INITIATE_SPELLCASTING_ABILITY_OPTIONS,
  readBackgroundCreationFacts,
  readClassCreationFacts,
  readMagicInitiateSpellAccessSourceFacts,
  readSpeciesCreationFacts,
  type ClassCreationFacts,
  type SpeciesCreationFacts,
  type SurfaceReadIssue,
  type UnitReaderResult,
  type WizardClassCreationFacts,
} from "@dnd/surface/surface/character-creation-readers";
import { SKILLS } from "@dnd/surface/surface/types";
import type {
  Ability,
  ArmorTrainingCategory,
  ClassFeatureRecord,
  DiceExpr,
  DiceExprDelta,
  ProficiencyGrant,
  ProficiencyGrantSubject,
  Skill,
  StartingEquipmentChoice,
  EffectAtom,
  GnomishLineageMechanics,
  PassiveMechanics,
  DragonbornSpeciesRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import {
  discoverCreationHoles,
  originFeatGrantChoiceHoles,
  passiveGrantChoiceHoles,
  selectedClassFeatureAcquisitionGrantChoiceHoles,
  speciesLineageChoiceHoles,
  magicInitiateSpellListsForUnitIds,
} from "./discovery.ts";
import { characterBuildSpeciesOriginFeatUnitIds } from "./magic-initiate-spell-access.ts";
import { type CharacterProgression } from "./character-progression-algebra.ts";
import {
  classUnitId,
  classLevelForUnit,
  computeTotalLevel,
  progressionClassUnitIds,
  progressionClassLevels,
  startingClassUnitId,
} from "./character-progression-types.ts";
import {
  backgroundToolChoiceSpec,
  classFeatureGrantChoiceHoles,
  classSpellcastingChoiceHoles,
  choiceSelectionOptionIds,
  choiceSelectionMatchesHole,
  doNotIgnoreSelection,
  eligibleExpertiseSkills,
  grantExpertiseSkillSourceForSelection,
  sameCreationHoleSource,
  selectedFeatAbilityScoreIncreaseOptions,
  sameOptionIdMultiset,
  skillExpertiseFromChoiceSelections,
  skillProficienciesFromChoiceSelections,
  startingEquipmentChoiceHole,
  startingEquipmentUnitIds,
} from "./discovery.ts";
import {
  decodeAbilityScoreIncreaseOptionId,
  decodeProficiencyGrantSubjectOptionId,
  parseToolProficiencyId,
  proficiencyGrantSubjectOptionId,
  proficiencyGrantSubjectOptions,
  toolProficiencyIdsFromDirectToolOptionIds,
  toolProficiencyIdsFromProficiencyChoiceOptionIds,
  toolProficiencyIdsFromSubjects,
  type AbilityScoreIncreaseDeltaWithCap,
  type ChoiceOptionCodecIssue,
  type ParsedProficiencyGrantSubject,
} from "./choice-option-codecs.ts";
import {
  choiceHole,
  loadoutSource,
  skillOption,
  unitSource,
} from "./hole-factories.ts";
import {
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  CLASS_CANTRIP_CHOICE_KEY,
  CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  CLASS_PREPARED_SPELL_CHOICE_KEY,
  CLASS_SUBCLASS_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  CLASS_TOOL_PROFICIENCY_CHOICE_KEY,
  EXACTLY_ONE_CHOICE,
  MULTICLASS_PROFICIENCY_CHOICE_KEYS,
  ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
  ORIGIN_FEAT_MAGIC_INITIATE_CANTRIP_CHOICE_KEY,
  ORIGIN_FEAT_MAGIC_INITIATE_LEVEL_ONE_SPELL_CHOICE_KEY,
  ORIGIN_FEAT_MAGIC_INITIATE_SPELLCASTING_ABILITY_CHOICE_KEY,
  SPECIES_ORIGIN_FEAT_CHOICE_KEY,
  SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
  SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY,
  WIZARD_CANTRIP_CHOICE_KEY,
  WIZARD_PREPARED_SPELL_CHOICE_KEY,
  WIZARD_SPELLBOOK_CHOICE_KEY,
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
  GNOMISH_LINEAGE_SPELLCASTING_ABILITY_CHOICE_KEY,
  SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY,
  HUNTERS_PREY_CHOICE_KEY,
} from "./phase1-manifest.ts";
import { selectedEldritchInvocationFeatures } from "./eldritch-invocations.ts";
import {
  availableSpellSlotLevels,
  classSpellcastingCreationAtLevel,
  isListPreparedSpellcastingCreation,
  isPactMagicSpellcastingCreation,
  isWizardSpellcastingCreation,
  type ReadableClassSpellcasting,
} from "./class-spellcasting.ts";
import {
  languageFromCreationChoiceOptionId,
  languageFromSurfaceLanguageId,
} from "./language-codecs.ts";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  isSupportedProgression,
  supportedBackgroundUnitIds,
  supportedLoadoutChoiceForSource,
  supportedLoadoutChoices,
  supportedPurchasableEquipmentUnitIdsForClass,
  finalizableSpeciesUnitIds,
  speciesUnitIdsWithSupportedTraitChoices,
  supportsCharacterBuildResourceUnitId,
  unitRefsForSupportedSelectedUnitChoice,
  type CharacterCreationSupportProfile,
} from "./support-gates.ts";
import {
  characterEquipmentItemId,
  characterEquipmentItemSourceFromId,
  characterEquipmentItemUnitId,
  characterEquipmentItemUnitIdFromLoadoutEquipmentUnitId,
  creationChoiceOptionId,
  choiceCardinalityBounds,
  exactChoiceCardinality,
  copperPieceAmount,
  hitDieSize,
  hitDieTotal,
  nonEmptyReadonlyArray,
  isCopperPieceAmount,
  loadoutSourceKey,
  isCharacterBuildToolProficiencyId,
  sorcererMetamagicOptionId,
  unitChoiceKey,
  unitChoiceSourceKey,
  type AbilityScoreAssignment,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterBuild,
  type CharacterBuildOwnedEquipmentItem,
  type CharacterBuildEquipment,
  type CharacterEquipmentItemSlot,
  type CharacterBuildClassFeatureLanguage,
  type CharacterBuildSpeciesChoiceFacts,
  type CharacterBuildGnomishLineageId,
  type CharacterBuildGnomishLineageSpellcastingAbility,
  type CharacterBuildFeature,
  type CharacterBuildMagicInitiateSpellAccess,
  type MagicInitiateSpellcastingAbility,
  type CharacterBuildHitPoints,
  type CharacterBuildLoadout,
  type CharacterBuildProficiencies,
  type CharacterBuildProficiencyChoiceSubject,
  type CharacterBuildProjectionCause,
  type CharacterBuildProjectionIssue,
  type CopperPieceAmount,
  type CharacterBuildResource,
  type CharacterBuildPactMagicSlotPool,
  type CharacterBuildSpellcasting,
  type CharacterBuildSpellcastingSource,
  type CharacterBuildSpellcastingSlotPool,
  type CharacterBuildSpellSlotCapacity,
  type CreationChoiceOption,
  type CreationChoiceOptionDecodeCause,
  type CreationChoiceOptionId,
  type CharacterChoiceSelection,
  type ChoiceCreationHole,
  type CreationHole,
  type CharacterDraft,
  type CreationFinalizationIssue,
  type CreationFinalizationIllegalCause,
  type CreationFinalizationResult,
  type CreationFinalizationLookupUnitRole,
  type CreationFinalizationReadableUnitRole,
  type CreationFinalizationUnsupportedCause,
  type FinalizedCharacterSelections,
  type NonEmptyReadonlyArray,
  type ToolProficiencyId,
  type UnitCatalog,
  type LoadoutEquipmentUnitId,
  type LoadoutSourceKey,
  type UnitChoiceSourceKey,
  type UnitChoiceSource,
  type UnitChoiceKey,
  type UnitRef,
  type UnitRefSelectedOption,
} from "./types.ts";

type UnitChoiceCreationHole = ChoiceCreationHole & {
  readonly source: UnitChoiceSource;
};

type LoadoutCreationHole = ChoiceCreationHole & {
  readonly source: Extract<ChoiceCreationHole["source"], { tag: "loadout" }>;
};

type UnitChoiceSelection = Extract<
  CharacterChoiceSelection,
  { readonly kind: "unitChoice" }
>;

type LoadoutChoiceSelection = Extract<
  CharacterChoiceSelection,
  { readonly kind: "loadout" }
>;
type ModifyRollNumericGrant = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_numeric" }
>;
type FixedModifyRollAbilityFilter = Extract<
  NonNullable<ModifyRollNumericGrant["abilityFilter"]>,
  readonly Ability[]
>;

const BACKGROUND_ABILITY_SCORE_INCREASE_MAX_SCORE = 20;

type BackgroundAbilityScoreIncreaseDelta = {
  readonly ability: Ability;
  readonly increase: number;
};

type ClassFactsByUnitId = ReadonlyMap<UnitRecord["id"], ClassCreationFacts>;
type FinalizationIssues = NonEmptyReadonlyArray<CreationFinalizationIssue>;
type ProjectionIssues = NonEmptyReadonlyArray<CharacterBuildProjectionIssue>;
type HitPointMaximumDelta = Extract<
  EffectAtom,
  { readonly kind: "modify_max_hp" }
>["delta"];

export function finalizeCharacterDraft(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile?: CharacterCreationSupportProfile;
}): CreationFinalizationResult {
  const supportProfile =
    input.supportProfile ?? CHARACTER_CREATION_SUPPORT_PROFILE;
  const holes = discoverCreationHoles({ ...input, supportProfile });
  const openHoles = nonEmptyReadonlyArray(
    unfilledFinalizationHoles(input.draft, holes),
  );
  if (openHoles != null) {
    return {
      tag: "incomplete",
      holes: openHoles,
    };
  }

  const selections = finalizedSelectionsAfterHoleClosure(input.draft);
  /* v8 ignore start -- No open holes plus a parsed CharacterDraft necessarily produces FinalizedCharacterSelections. */
  if (selections == null) {
    return {
      tag: "invalid",
      issues: [illegalFinalizationIssue({ tag: "draftIncomplete" })],
    };
  }
  /* v8 ignore stop */

  const supportedSelections = executableSupportSelections(
    selections,
    input.unitLibrary,
    supportProfile,
  );
  if (Either.isLeft(supportedSelections)) {
    return {
      tag: "invalid",
      issues: supportedSelections.left,
    };
  }

  const build = buildCharacterBuild({
    supportedSelections: supportedSelections.right,
    unitLibrary: input.unitLibrary,
    supportProfile,
  });
  if (Either.isLeft(build)) {
    return {
      tag: "invalid",
      issues: build.left,
    };
  }

  return {
    tag: "ready",
    build: build.right,
  };
}

function finalizedSelectionsAfterHoleClosure(
  draft: CharacterDraft,
): FinalizedCharacterSelections | undefined {
  return finalizedSelections({
    ...draft,
    selections: {
      ...draft.selections,
      equipment: draft.selections.equipment ?? { selectedUnitIds: [] },
    },
  });
}

function unfilledFinalizationHoles(
  draft: CharacterDraft,
  holes: readonly CreationHole[],
): readonly CreationHole[] {
  return holes.filter(
    (hole) => !hasCardinalityCompleteChoiceSelection(draft, hole),
  );
}

function hasCardinalityCompleteChoiceSelection(
  draft: CharacterDraft,
  hole: CreationHole,
): boolean {
  if (hole.kind !== "choice") {
    return false;
  }

  const selection = draft.selections.choices.find((candidate) =>
    sameCreationHoleSource(candidate.source, hole.source),
  );
  if (selection === undefined) {
    return false;
  }

  const bounds = choiceCardinalityBounds(hole.cardinality);
  const optionCount = choiceSelectionOptionIds(selection).length;
  return optionCount >= bounds.min && optionCount <= bounds.max;
}

export function finalizedSelections(
  draft: CharacterDraft,
): FinalizedCharacterSelections | undefined {
  // Narrow an in-progress draft's optional selections into the complete
  // finalization shape. Projection code below should consume this required
  // shape instead of repeatedly re-checking draft fields for undefined.
  const selections = draft.selections;
  if (
    selections.progression == null ||
    selections.background == null ||
    selections.abilityScoreGeneration == null ||
    selections.backgroundAbilityScoreIncrease == null ||
    selections.species == null ||
    selections.languages == null ||
    selections.alignment == null ||
    selections.equipment == null
  ) {
    return undefined;
  }

  return {
    progression: selections.progression,
    background: selections.background,
    abilityScoreGeneration: selections.abilityScoreGeneration,
    backgroundAbilityScoreIncrease: selections.backgroundAbilityScoreIncrease,
    species: selections.species,
    ...(selections.speciesSize === undefined
      ? {}
      : { speciesSize: selections.speciesSize }),
    ...(selections.draconicAncestry === undefined
      ? {}
      : { draconicAncestry: selections.draconicAncestry }),
    languages: selections.languages,
    alignment: selections.alignment,
    choices: selections.choices,
    equipment: selections.equipment,
  };
}

// Executable support gate. This is narrower than rules legality: it rejects
// complete drafts that are legal for the active rules corpus but that this
// runtime cannot yet project or execute.
export function executableSupportIssues(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): readonly CreationFinalizationIssue[] {
  const dependencies = executableSupportDependencies(selections, unitLibrary);

  return [
    ...dependencyIssues(dependencies.background),
    ...dependencyIssues(dependencies.species),
    ...dependencies.classFactsByUnitId.issues,
    ...dependencies.selectedFeatUnits.issues,
    ...(Either.isRight(dependencies.background)
      ? [
          ...expectedValueIssue(
            supportedBackgroundUnitIds(supportProfile).includes(
              selections.background,
            ),
            { tag: "unsupportedBackground" },
          ),
          ...expectedValueIssue(
            isSupportedBackgroundAbilityScoreIncrease(
              selections.backgroundAbilityScoreIncrease,
              unitLibrary,
              selections.background,
              selections.abilityScoreGeneration.assignedScores,
            ),
            { tag: "unsupportedBackgroundAbilityScoreIncrease" },
          ),
        ]
      : []),
    ...(Either.isRight(dependencies.species)
      ? [
          ...expectedValueIssue(
            finalizableSpeciesUnitIds().includes(selections.species),
            { tag: "unsupportedSpecies" },
          ),
          ...expectedValueIssue(
            speciesSizeSelectionMatchesSurface(
              selections,
              dependencies.species.right.speciesFacts,
            ),
            { tag: "speciesSizeMismatch" },
          ),
          ...expectedValueIssue(
            draconicAncestrySelectionMatchesSurface(
              selections,
              dependencies.species.right.speciesUnit,
            ),
            { tag: "draconicAncestryMismatch" },
          ),
        ]
      : []),
    ...(dependencies.classFactsByUnitId.issues.length === 0
      ? expectedValueIssue(
          isSupportedFinalizableProgression(selections, supportProfile),
          { tag: "unsupportedProgression" },
        )
      : []),
    ...expectedValueIssue(
      isValidAbilityScoreAssignment(
        selections.abilityScoreGeneration.method,
        selections.abilityScoreGeneration.assignedScores,
      ),
      { tag: "unsupportedAbilityScoreGeneration" },
    ),
    ...expectedValueIssue(
      sameOptionIdMultiset(selections.languages, [
        ...supportProfile.manifest.languages,
      ]),
      { tag: "manifestLanguagesMismatch" },
    ),
    ...expectedValueIssue(
      selections.alignment.morality ===
        supportProfile.manifest.alignment.morality &&
        selections.alignment.order === supportProfile.manifest.alignment.order,
      { tag: "manifestAlignmentMismatch" },
    ),
    ...(Either.isRight(dependencies.background) &&
    Either.isRight(dependencies.species) &&
    dependencies.classFactsByUnitId.issues.length === 0 &&
    dependencies.selectedFeatUnits.issues.length === 0
      ? expectedValueIssue(
          allFinalizedChoicesSupported(selections, unitLibrary, supportProfile),
          { tag: "unsupportedChoices" },
        )
      : []),
    ...(Either.isRight(dependencies.background)
      ? expectedValueIssue(
          selectedFeatPrerequisitesSupported(
            selections,
            dependencies.background.right.scoresAfterBackground,
            dependencies.selectedFeatUnits.value,
          ),
          { tag: "selectedFeatPrerequisitesNotMet" },
        )
      : []),
    ...expectedValueIssue(
      magicInitiateSpellListsAreDistinct(selections, unitLibrary),
      { tag: "duplicateMagicInitiateSpellList" },
    ),
    ...expectedValueIssue(
      spellcastingFactsAuthoredForSelectedClassLevels(
        selections,
        dependencies.classFactsByUnitId.value,
      ),
      { tag: "missingSpellcastingFacts" },
    ),
    ...(dependencies.classFactsByUnitId.value.has(
      startingClassUnitId(selections.progression),
    )
      ? expectedValueIssue(
          selectedPreparedSpellsAreInSelectedSpellbook(selections, unitLibrary),
          { tag: "preparedSpellSelectionMismatch" },
        )
      : []),
    ...expectedValueIssue(
      finalizedWizardSpellbookSelectionsAreDistinct(selections),
      { tag: "duplicateWizardSpellbookSelection" },
    ),
    ...(dependencies.classFactsByUnitId.value.has(
      startingClassUnitId(selections.progression),
    )
      ? expectedValueIssue(
          isSupportedEquipmentSelection(
            selections,
            unitLibrary,
            supportProfile,
          ),
          { tag: "unsupportedEquipmentSelection" },
        )
      : []),
  ];
}

function magicInitiateSpellListsAreDistinct(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): boolean {
  const background = unitLibrary.getUnit(selections.background);
  const backgroundFacts = Option.isSome(background)
    ? readBackgroundCreationFacts(background.value)
    : undefined;
  const backgroundFeatUnitIds =
    backgroundFacts?.tag === "readable"
      ? [backgroundFacts.value.originFeatId]
      : [];
  const features = finalizedClassChoiceFeaturesForSupportedChoices(
    unitChoiceSelections(selections),
  );
  const spellLists = [
    ...backgroundFeatUnitIds,
    ...characterBuildSpeciesOriginFeatUnitIds({
      species: selections.species,
      features,
      unitLibrary,
    }),
  ].flatMap((unitId) => {
    const unit = unitLibrary.getUnit(unitId);
    if (Option.isNone(unit)) return [];
    const facts = readMagicInitiateSpellAccessSourceFacts(unit.value);
    return facts.tag === "readable" ? [facts.value.spellList] : [];
  });
  return new Set(spellLists).size === spellLists.length;
}

type ExecutableSupportDependencies = {
  readonly background: Either.Either<
    { readonly scoresAfterBackground: AbilityScoreAssignment },
    ProjectionIssues
  >;
  readonly species: Either.Either<
    {
      readonly speciesFacts: SpeciesCreationFacts;
      readonly speciesUnit: UnitRecord;
    },
    ProjectionIssues
  >;
  readonly classFactsByUnitId: SupportDependencyCollection<ClassFactsByUnitId>;
  readonly selectedFeatUnits: SupportDependencyCollection<
    ReadonlyMap<UnitRecord["id"], UnitRecord>
  >;
};

type SupportDependencyCollection<T> = {
  readonly value: T;
  readonly issues: readonly CharacterBuildProjectionIssue[];
};

function executableSupportDependencies(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): ExecutableSupportDependencies {
  return {
    background: backgroundSupportDependencies(selections, unitLibrary),
    species: speciesSupportDependencies(selections, unitLibrary),
    classFactsByUnitId: classFactsForSupport(
      selections.progression,
      unitLibrary,
    ),
    selectedFeatUnits: selectedFeatUnitsForFinalization(
      selections,
      unitLibrary,
    ),
  };
}

function dependencyIssues<T>(
  dependency: Either.Either<T, ProjectionIssues>,
): readonly CharacterBuildProjectionIssue[] {
  return Either.isLeft(dependency) ? dependency.left : [];
}

function backgroundSupportDependencies(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): Either.Either<
  { readonly scoresAfterBackground: AbilityScoreAssignment },
  ProjectionIssues
> {
  const backgroundUnit = unitForFinalization(
    unitLibrary,
    selections.background,
    "background",
  );
  if (Either.isLeft(backgroundUnit)) {
    return Either.left([backgroundUnit.left]);
  }
  const backgroundFacts = readableForFinalization(
    readBackgroundCreationFacts(backgroundUnit.right),
    selections.background,
    "background",
  );
  /* v8 ignore start -- The selected background was admitted as readable from this catalog before score projection. */
  if (Either.isLeft(backgroundFacts)) {
    return Either.left([backgroundFacts.left]);
  }
  /* v8 ignore stop */
  const scoresAfterBackground = applyBackgroundAbilityScoreIncrease(
    selections.abilityScoreGeneration.assignedScores,
    selections.backgroundAbilityScoreIncrease,
    backgroundFacts.right.abilityScoreIncrease.abilities,
  );
  if (Either.isLeft(scoresAfterBackground)) {
    return Either.left([scoresAfterBackground.left]);
  }
  return Either.right({
    scoresAfterBackground: scoresAfterBackground.right,
  });
}

function speciesSupportDependencies(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): Either.Either<
  {
    readonly speciesFacts: SpeciesCreationFacts;
    readonly speciesUnit: UnitRecord;
  },
  ProjectionIssues
> {
  const speciesUnit = unitForFinalization(
    unitLibrary,
    selections.species,
    "species",
  );
  if (Either.isLeft(speciesUnit)) return Either.left([speciesUnit.left]);
  const speciesFacts = readableForFinalization(
    readSpeciesCreationFacts(speciesUnit.right),
    selections.species,
    "species",
  );
  /* v8 ignore start -- The selected species was admitted as readable from this catalog before dependency projection. */
  return Either.isLeft(speciesFacts)
    ? Either.left([speciesFacts.left])
    : Either.right({
        speciesFacts: speciesFacts.right,
        speciesUnit: speciesUnit.right,
      });
  /* v8 ignore stop */
}

function selectedFeatUnitsForFinalization(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): SupportDependencyCollection<ReadonlyMap<UnitRecord["id"], UnitRecord>> {
  const units = new Map<UnitRecord["id"], UnitRecord>();
  const issues: CharacterBuildProjectionIssue[] = [];
  for (const selection of unitChoiceSelections(selections)) {
    if (selection.source.choiceKey !== CLASS_FEATURE_FEAT_CHOICE_KEY) continue;
    for (const option of selection.options) {
      const featUnitId = option.unitRef?.unitId;
      if (featUnitId === undefined || units.has(featUnitId)) continue;
      const unit = unitForFinalization(unitLibrary, featUnitId, "feat");
      if (Either.isLeft(unit)) issues.push(unit.left);
      else units.set(featUnitId, unit.right);
    }
  }
  return { value: units, issues };
}

function selectedFeatPrerequisitesSupported(
  selections: FinalizedCharacterSelections,
  scoresAfterBackground: AbilityScoreAssignment,
  selectedFeatUnits: ReadonlyMap<UnitRecord["id"], UnitRecord>,
): boolean {
  return unitChoiceSelections(selections).every((selection) => {
    if (selection.source.choiceKey !== CLASS_FEATURE_FEAT_CHOICE_KEY) {
      return true;
    }
    return selection.options.every((option) => {
      const featUnitId = option.unitRef?.unitId;
      if (featUnitId === undefined) return true;
      const featUnit = selectedFeatUnits.get(featUnitId);
      if (featUnit === undefined) return true;
      if (
        featUnit.kind !== "feat" ||
        featUnit.mechanics.family !== "grappler"
      ) {
        return true;
      }
      return (
        computeTotalLevel(selections.progression) >= 4 &&
        (Number(scoresAfterBackground.str) >= 13 ||
          Number(scoresAfterBackground.dex) >= 13)
      );
    });
  });
}

function spellcastingFactsAuthoredForSelectedClassLevels(
  selections: Pick<FinalizedCharacterSelections, "progression">,
  classFactsByUnitId: ClassFactsByUnitId,
): boolean {
  return [...classFactsByUnitId].every(([classUnitId, classFacts]) => {
    const classLevel = classLevelForUnit(selections.progression, classUnitId);
    return (
      !("spellcasting" in classFacts) ||
      classFacts.spellcasting == null ||
      classFacts.spellcasting.featureLevel > classLevel ||
      classSpellcastingCreation(classFacts, classLevel) !== undefined
    );
  });
}

export function selectedPreparedSpellsAreInSelectedSpellbook(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): boolean {
  const classUnit = unitLibrary.getUnit(
    startingClassUnitId(selections.progression),
  );
  if (Option.isNone(classUnit)) return false;
  const classFacts = readClassCreationFacts(classUnit.value);
  if (
    classFacts.tag !== "readable" ||
    !isWizardClassCreationFacts(classFacts.value)
  ) {
    return true;
  }

  const spellcasting = classSpellcastingCreationAtLevel(
    classFacts.value.spellcasting,
    classLevelForUnit(
      selections.progression,
      startingClassUnitId(selections.progression),
    ),
  );
  /* v8 ignore start -- Admitted Wizard class facts project Wizard spellcasting at every supported character-creation level. */
  if (spellcasting == null || !isWizardSpellcastingCreation(spellcasting)) {
    return false;
  }
  /* v8 ignore stop */
  const unitChoices = unitChoiceSelections(selections);
  const selectedSpellbook = new Set(
    selectedWizardSpellbookUnitRefs(unitChoices),
  );
  const selectedPrepared = selectedUnitRefsForChoice(
    unitChoices,
    WIZARD_PREPARED_SPELL_CHOICE_KEY,
  );
  const slotLevels = availableSpellSlotLevels(
    spellcasting.spellSlotProjection.slots,
  );
  const spellbookLevels = new Map(
    spellcasting.spellbookAccess.spells.map((spell) => [
      spell.spellId,
      spell.spellLevel,
    ]),
  );

  return selectedPrepared.every((spellId) => {
    const spellLevel = spellbookLevels.get(spellId);
    return (
      selectedSpellbook.has(spellId) &&
      spellLevel != null &&
      slotLevels.has(spellLevel)
    );
  });
}

function finalizedWizardSpellbookSelectionsAreDistinct(
  selections: FinalizedCharacterSelections,
): boolean {
  const spellbookSpellIds = selectedWizardSpellbookUnitRefs(
    unitChoiceSelections(selections),
  );
  return spellbookSpellIds.every(
    (spellId, index) => spellbookSpellIds.indexOf(spellId) === index,
  );
}

const ExecutableSupportSelections = Symbol("ExecutableSupportSelections");

type ExecutableSupportSelections = {
  readonly selections: FinalizedCharacterSelections;
  readonly progression: CharacterProgression;
  readonly unitChoices: readonly UnitChoiceSelection[];
  readonly loadoutChoices: readonly LoadoutChoiceSelection[];
  readonly [ExecutableSupportSelections]: true;
};

function executableSupportSelections(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
  supportProfile: CharacterCreationSupportProfile,
): Either.Either<
  ExecutableSupportSelections,
  NonEmptyReadonlyArray<CreationFinalizationIssue>
> {
  const issues = nonEmptyReadonlyArray([
    ...executableSupportIssues(selections, unitLibrary, supportProfile),
  ]);
  if (issues != null) {
    return Either.left(issues);
  }

  return Either.right({
    selections,
    progression: selections.progression,
    unitChoices: unitChoiceSelections(selections),
    loadoutChoices: loadoutChoiceSelections(selections),
    [ExecutableSupportSelections]: true,
  });
}

function unitChoiceSelections(
  selections: FinalizedCharacterSelections,
): readonly UnitChoiceSelection[] {
  return selections.choices.flatMap((choice) =>
    choice.kind === "unitChoice" ? [choice] : [],
  );
}

function loadoutChoiceSelections(
  selections: FinalizedCharacterSelections,
): readonly LoadoutChoiceSelection[] {
  return selections.choices.flatMap((choice) =>
    choice.kind === "loadout" ? [choice] : [],
  );
}

export function expectedValueIssue(
  condition: boolean,
  cause: CreationFinalizationUnsupportedCause,
): readonly CreationFinalizationIssue[] {
  return condition ? [] : [unsupportedFinalizationIssue(cause)];
}

function speciesSizeSelectionMatchesSurface(
  selections: Pick<FinalizedCharacterSelections, "species" | "speciesSize">,
  facts: SpeciesCreationFacts,
): boolean {
  if (facts.size.kind === "fixed") {
    return selections.speciesSize === undefined;
  }

  return (
    selections.speciesSize !== undefined &&
    facts.size.options.some((size) => size === selections.speciesSize)
  );
}

function draconicAncestrySelectionMatchesSurface(
  selections: Pick<
    FinalizedCharacterSelections,
    "species" | "draconicAncestry"
  >,
  speciesUnit: UnitRecord,
): boolean {
  const source = draconicAncestryDamageTypeSource(speciesUnit);
  if (source === undefined) {
    return selections.draconicAncestry === undefined;
  }

  return (
    selections.draconicAncestry !== undefined &&
    source.options.some((option) => option.id === selections.draconicAncestry)
  );
}

function draconicAncestryDamageTypeSource(
  unit: UnitRecord,
): DragonbornSpeciesRecord["draconicAncestry"]["damageType"] | undefined {
  return unit.kind === "species" && "draconicAncestry" in unit
    ? unit.draconicAncestry.damageType
    : undefined;
}

function finalizedSpeciesChoiceFacts(
  selections: Pick<
    FinalizedCharacterSelections,
    "choices" | "draconicAncestry"
  >,
  species: UnitRecord,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterBuildSpeciesChoiceFacts | undefined,
  FinalizationIssues
> {
  const draconicSource = draconicAncestryDamageTypeSource(species);
  const lineageSource = speciesLineageChoiceSource(species, unitLibrary);
  /* v8 ignore start -- Support admission rejects unreadable, conflicting, or absent species-choice sources before projection. */
  if (Either.isLeft(lineageSource)) {
    return Either.left(lineageSource.left);
  }
  if (draconicSource !== undefined && lineageSource.right !== undefined) {
    return Either.left([
      illegalFinalizationIssue({
        tag: "conflictingSpeciesChoiceSources",
        speciesUnitId: species.id,
      }),
    ]);
  }
  if (draconicSource !== undefined) {
    return finalizedDraconicAncestryChoiceFacts(
      selections,
      species,
      draconicSource,
    );
  }
  if (lineageSource.right !== undefined) {
    return finalizedGnomishLineageChoiceFacts(selections, lineageSource.right);
  }

  return selections.draconicAncestry === undefined
    ? Either.right(undefined)
    : Either.left([
        illegalFinalizationIssue({
          tag: "missingDraconicAncestrySource",
          speciesUnitId: species.id,
        }),
      ]);
  /* v8 ignore stop */
}

function finalizedDraconicAncestryChoiceFacts(
  selections: Pick<FinalizedCharacterSelections, "draconicAncestry">,
  species: UnitRecord,
  source: DragonbornSpeciesRecord["draconicAncestry"]["damageType"],
): Either.Either<CharacterBuildSpeciesChoiceFacts, FinalizationIssues> {
  const selected = source.options.find(
    (option) => option.id === selections.draconicAncestry,
  );
  /* v8 ignore start -- Support admission retains a Draconic Ancestry id only after matching this exact species option roster. */
  if (selected === undefined || selections.draconicAncestry === undefined) {
    return Either.left([
      illegalFinalizationIssue({
        tag: "invalidDraconicAncestrySelection",
        speciesUnitId: species.id,
      }),
    ]);
  }
  /* v8 ignore stop */

  return Either.right({
    draconicAncestry: {
      kind: "draconicAncestry",
      ancestorId: selections.draconicAncestry,
    },
  });
}

type SpeciesLineageChoiceSource = {
  readonly traitUnitId: UnitRecord["id"];
  readonly mechanics: GnomishLineageMechanics;
};

function speciesLineageChoiceSource(
  species: UnitRecord,
  unitLibrary: UnitCatalog,
): Either.Either<SpeciesLineageChoiceSource | undefined, FinalizationIssues> {
  const facts = readSpeciesCreationFacts(species);
  /* v8 ignore start -- Species-choice projection receives readable species facts with installed trait references from support admission. */
  if (facts.tag !== "readable") {
    return Either.right(undefined);
  }

  const sources = Object.values(facts.value.traits).flatMap((traitUnitId) => {
    const traitUnit = unitLibrary.getUnit(traitUnitId);
    if (Option.isNone(traitUnit) || traitUnit.value.kind !== "species_trait") {
      return [];
    }
    return traitUnit.value.mechanics.family === "species_lineage_choice"
      ? [
          {
            traitUnitId: traitUnit.value.id,
            mechanics: traitUnit.value.mechanics,
          },
        ]
      : [];
  });
  /* v8 ignore stop */
  /* v8 ignore start -- The supported species catalog admits at most one trait carrying Gnomish Lineage mechanics. */
  if (sources.length > 1) {
    return Either.left([
      illegalFinalizationIssue({
        tag: "multipleSpeciesLineageSources",
        speciesUnitId: species.id,
      }),
    ]);
  }
  /* v8 ignore stop */

  return Either.right(sources[0]);
}

function finalizedGnomishLineageChoiceFacts(
  selections: Pick<FinalizedCharacterSelections, "choices">,
  source: SpeciesLineageChoiceSource,
): Either.Either<CharacterBuildSpeciesChoiceFacts, FinalizationIssues> {
  const lineageId = selectedGnomishLineageId(selections, source);
  const spellcastingAbility = selectedGnomishLineageSpellcastingAbility(
    selections,
    source,
  );
  /* v8 ignore start -- Support admission retains both lineage choices only after matching the installed trait's option rosters. */
  if (lineageId === undefined || spellcastingAbility === undefined) {
    return Either.left([
      illegalFinalizationIssue({
        tag: "invalidGnomishLineageSelection",
        traitUnitId: source.traitUnitId,
      }),
    ]);
  }
  /* v8 ignore stop */

  return Either.right({
    gnomishLineage: {
      kind: "gnomishLineage",
      lineageId,
      spellcastingAbility,
    },
  });
}

function selectedGnomishLineageId(
  selections: Pick<FinalizedCharacterSelections, "choices">,
  source: SpeciesLineageChoiceSource,
): CharacterBuildGnomishLineageId | undefined {
  const selectedOptionId = selectedSingleUnitChoiceOptionId(
    selections,
    source.traitUnitId,
    source.mechanics.choiceKey,
  );
  return source.mechanics.options.find(
    (option) => option.id === selectedOptionId,
  )?.id;
}

function selectedGnomishLineageSpellcastingAbility(
  selections: Pick<FinalizedCharacterSelections, "choices">,
  source: SpeciesLineageChoiceSource,
): CharacterBuildGnomishLineageSpellcastingAbility | undefined {
  const selectedOptionId = selectedSingleUnitChoiceOptionId(
    selections,
    source.traitUnitId,
    GNOMISH_LINEAGE_SPELLCASTING_ABILITY_CHOICE_KEY,
  );
  return source.mechanics.spellcastingAbilityChoice.abilities.find(
    (ability) => ability === selectedOptionId,
  );
}

function selectedSingleUnitChoiceOptionId(
  selections: Pick<FinalizedCharacterSelections, "choices">,
  traitUnitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): CreationChoiceOptionId | undefined {
  const selection = selections.choices.find(
    (candidate) =>
      candidate.kind === "unitChoice" &&
      candidate.source.unitId === traitUnitId &&
      candidate.source.choiceKey === choiceKey,
  );
  /* v8 ignore start -- A one-option retained selection necessarily has an element at index zero. */
  return selection?.options.length === 1
    ? selection.options[0]?.optionId
    : undefined;
  /* v8 ignore stop */
}

export function illegalFinalizationIssue(
  cause: CreationFinalizationIllegalCause,
): CreationFinalizationIssue {
  return {
    tag: "illegalFinalization",
    cause,
  };
}

/* v8 ignore start -- Supported selections have already decoded these option ids; only malformed direct projections reach this translator. */
function choiceOptionCodecProjectionIssue(
  issue: ChoiceOptionCodecIssue,
): CharacterBuildProjectionIssue {
  return {
    tag: "characterBuildProjection",
    cause: {
      tag: "invalidChoiceOption",
      optionId: issue.optionId,
      reason: issue.cause,
    },
  };
}
/* v8 ignore stop */

export function unsupportedFinalizationIssue(
  cause: CreationFinalizationUnsupportedCause,
): CreationFinalizationIssue {
  return {
    tag: "unsupportedFinalization",
    cause,
  };
}

function characterBuildProjectionIssue(
  cause: CharacterBuildProjectionCause,
): CharacterBuildProjectionIssue {
  return { tag: "characterBuildProjection", cause };
}

export function characterCreationIssueMessage(
  issue: CreationFinalizationIssue,
): string {
  return Match.value(issue).pipe(
    Match.when({ tag: "illegalFinalization" }, ({ cause }) =>
      illegalFinalizationCauseMessage(cause),
    ),
    Match.when({ tag: "unsupportedFinalization" }, ({ cause }) =>
      unsupportedFinalizationCauseMessage(cause),
    ),
    Match.when({ tag: "characterBuildProjection" }, ({ cause }) =>
      characterBuildProjectionCauseMessage(cause),
    ),
    Match.exhaustive,
  );
}

function illegalFinalizationCauseMessage(
  cause: CreationFinalizationIllegalCause,
): string {
  return Match.value(cause).pipe(
    Match.when({ tag: "draftIncomplete" }, () => "Draft is incomplete."),
    Match.when(
      { tag: "conflictingSpeciesChoiceSources" },
      ({ speciesUnitId }) =>
        `Cannot project multiple species choice source facts for species: ${speciesUnitId}.`,
    ),
    Match.when(
      { tag: "missingDraconicAncestrySource" },
      ({ speciesUnitId }) =>
        `Cannot project Draconic Ancestry for species without a Draconic Ancestry source fact: ${speciesUnitId}.`,
    ),
    Match.when(
      { tag: "invalidDraconicAncestrySelection" },
      ({ speciesUnitId }) =>
        `Cannot project selected Draconic Ancestry for species: ${speciesUnitId}.`,
    ),
    Match.when(
      { tag: "multipleSpeciesLineageSources" },
      ({ speciesUnitId }) =>
        `Cannot project multiple species lineage choice source facts for species: ${speciesUnitId}.`,
    ),
    Match.when(
      { tag: "invalidGnomishLineageSelection" },
      ({ traitUnitId }) =>
        `Cannot project selected Gnomish Lineage for species trait: ${traitUnitId}.`,
    ),
    Match.when(
      { tag: "multipleSpellcastingSlotPools" },
      () =>
        "Cannot finalize multiclass Spell Slot pools without a supported multiclass slot projection.",
    ),
    Match.when(
      { tag: "multiplePactMagicSlotPools" },
      () => "Cannot finalize multiple Pact Magic slot pools.",
    ),
    Match.exhaustive,
  );
}

function unsupportedFinalizationCauseMessage(
  cause: CreationFinalizationUnsupportedCause,
): string {
  return Match.value(cause).pipe(
    Match.when(
      { tag: "unsupportedBackground" },
      () => "Finalized build must use a supported background.",
    ),
    Match.when(
      { tag: "unsupportedSpecies" },
      () => "Finalized build must use a supported species.",
    ),
    Match.when(
      { tag: "speciesSizeMismatch" },
      () =>
        "Finalized build species size selection must match the selected species Surface facts.",
    ),
    Match.when(
      { tag: "draconicAncestryMismatch" },
      () =>
        "Finalized build Draconic Ancestry selection must match the selected species Surface facts.",
    ),
    Match.when(
      { tag: "unsupportedProgression" },
      () =>
        "Finalized build progression must match a supported progression profile.",
    ),
    Match.when(
      { tag: "unsupportedAbilityScoreGeneration" },
      () =>
        "Finalized build must use a supported ability-score generation method.",
    ),
    Match.when(
      { tag: "unsupportedBackgroundAbilityScoreIncrease" },
      () =>
        "Finalized build must use a supported background ability-score increase.",
    ),
    Match.when(
      { tag: "manifestLanguagesMismatch" },
      () => "Finalized build must use the supported manifest languages.",
    ),
    Match.when(
      { tag: "manifestAlignmentMismatch" },
      () => "Finalized build must use the supported manifest alignment.",
    ),
    Match.when(
      { tag: "unsupportedChoices" },
      () =>
        "Finalized build must carry exactly the supported choices for the selected progression.",
    ),
    Match.when(
      { tag: "selectedFeatPrerequisitesNotMet" },
      () =>
        "Selected feat prerequisites must be met before applying its Ability Score Increase.",
    ),
    Match.when(
      { tag: "duplicateMagicInitiateSpellList" },
      () => "Magic Initiate can be selected only once for each spell list.",
    ),
    Match.when(
      { tag: "missingSpellcastingFacts" },
      () =>
        "Finalized build must have authored spellcasting facts for the selected class levels.",
    ),
    Match.when(
      { tag: "preparedSpellSelectionMismatch" },
      () =>
        "Finalized prepared spells must be selected from the spellbook and match available Spell Slot levels.",
    ),
    Match.when(
      { tag: "duplicateWizardSpellbookSelection" },
      () =>
        "Finalized spellbook selections must be distinct across class and feature grants.",
    ),
    Match.when(
      { tag: "unsupportedEquipmentSelection" },
      () => "Finalized build must own supported purchased equipment.",
    ),
    Match.exhaustive,
  );
}

function characterBuildProjectionCauseMessage(
  cause: CharacterBuildProjectionCause,
): string {
  return Match.value(cause).pipe(
    Match.when(
      { tag: "missingStartingClassFacts" },
      ({ projection, classUnitId }) =>
        `Cannot derive ${projection} without starting class facts: ${classUnitId}.`,
    ),
    Match.when(
      { tag: "missingHitPointMaximumGrantSourceUnit" },
      ({ sourceUnitId }) =>
        `Cannot derive Hit Point maximum without grant source Unit: ${sourceUnitId}.`,
    ),
    Match.when(
      { tag: "unsupportedHitPointMaximumGrant" },
      ({ sourceUnitId }) =>
        `Hit Point maximum grant on Unit ${sourceUnitId} must use a supported deterministic amount and level axis.`,
    ),
    Match.when(
      { tag: "unsupportedClassFeatureLanguage" },
      ({ featureUnitId, languageId }) =>
        `Unsupported class-feature language id ${languageId} on Unit ${featureUnitId}.`,
    ),
    Match.when(
      { tag: "duplicateClassFeatureLanguage" },
      ({ featureUnitId, language }) =>
        `Duplicate Character Build language ${language} from class feature Unit ${featureUnitId}.`,
    ),
    Match.when(
      { tag: "missingClassFeatureLanguageChoice" },
      ({ featureUnitId }) =>
        `Missing class-feature language choice for Unit ${featureUnitId}.`,
    ),
    Match.when(
      { tag: "classFeatureLanguageChoiceCountMismatch" },
      ({ featureUnitId, mismatch }) => {
        const counts =
          mismatch.tag === "missing"
            ? {
                expected: mismatch.receivedCount + mismatch.missingCount,
                received: mismatch.receivedCount,
              }
            : {
                expected: mismatch.expectedCount,
                received: mismatch.expectedCount + mismatch.extraCount,
              };
        return `Class-feature language choice on Unit ${featureUnitId} expected ${counts.expected} selection(s), received ${counts.received}.`;
      },
    ),
    Match.when(
      { tag: "unsupportedClassFeatureLanguageChoice" },
      ({ featureUnitId, optionId }) =>
        `Unsupported class-feature language choice option ${optionId} on Unit ${featureUnitId}.`,
    ),
    Match.when(
      { tag: "duplicateClassFeatureLanguageChoice" },
      ({ featureUnitId, language }) =>
        `Duplicate Character Build language ${language} from class feature choice Unit ${featureUnitId}.`,
    ),
    Match.when(
      { tag: "unprojectableAbilityCheckBonus" },
      ({ featureUnitId, optionId }) =>
        `Cannot project class-feature acquisition ability-check bonus for ${featureUnitId}:${optionId}.`,
    ),
    Match.when(
      { tag: "unsupportedEquipmentUnitId" },
      ({ equipmentUnitId }) =>
        `Unsupported equipment Unit id for Character Build: ${equipmentUnitId}.`,
    ),
    Match.when(
      { tag: "unsupportedEquipmentCost" },
      ({ equipmentUnitId, costGp }) =>
        `Equipment Unit ${equipmentUnitId} has unsupported GP cost ${costGp}.`,
    ),
    Match.when(
      { tag: "unsupportedStartingCurrency" },
      ({ sourceUnitId, coinsGp }) =>
        `Starting-equipment source ${sourceUnitId} has unsupported GP currency ${coinsGp}.`,
    ),
    Match.when(
      { tag: "currencySumOutsideCopperPieceAmountRange" },
      ({ source, components }) =>
        `The ${source} CP values cannot be represented as one Copper Piece Amount: ${components.join(", ")}.`,
    ),
    Match.when(
      { tag: "startingCurrencyInsufficientForEquipmentPurchases" },
      ({ availableCp, purchaseCostCp }) =>
        `Starting equipment purchases cost ${purchaseCostCp} CP but only ${availableCp} CP is available.`,
    ),
    Match.when({ tag: "unreadableUnit" }, ({ role, unitId, issues }) =>
      [
        `Cannot read ${role} Unit ${unitId}`,
        ...issues.map(surfaceReadIssueCauseMessage),
      ].join(": "),
    ),
    Match.when(
      { tag: "unknownUnit" },
      ({ role, unitId }) => `Cannot find ${role} Unit: ${unitId}.`,
    ),
    Match.when({ tag: "abilityScoreCapExceeded" }, (cap) =>
      abilityScoreCapExceededMessage(cap),
    ),
    Match.when(
      { tag: "unsupportedToolProficiency" },
      ({ source, toolId }) =>
        `Unsupported ${source} tool proficiency for Character Build: ${toolId}.`,
    ),
    Match.orElse(characterBuildProjectionCauseMessageRemaining),
  );
}

type RemainingCharacterBuildProjectionCause = Extract<
  CharacterBuildProjectionCause,
  { readonly tag: "invalidChoiceOption" }
>;

function characterBuildProjectionCauseMessageRemaining(
  cause: RemainingCharacterBuildProjectionCause,
): string {
  return Match.value(cause).pipe(
    Match.when(
      { tag: "invalidChoiceOption" },
      ({ optionId, reason }) =>
        `${choiceOptionDecodeCauseMessage(reason)} Selected option: ${optionId}`,
    ),
    Match.exhaustive,
  );
}

function abilityScoreCapExceededMessage(
  cause: Extract<
    CharacterBuildProjectionCause,
    { readonly tag: "abilityScoreCapExceeded" }
  >,
): string {
  return Match.value(cause).pipe(
    Match.when({ source: "background" }, ({ ability, excess }) => {
      const maximum = BACKGROUND_ABILITY_SCORE_INCREASE_MAX_SCORE;
      return `Cannot apply background ability-score increase: ${ability} ${maximum + excess} would exceed ${maximum} by ${excess}.`;
    }),
    Match.when(
      { source: "classFeature" },
      ({ ability, maximum, excess }) =>
        `Cannot apply classFeature ability-score increase: ${ability} ${maximum + excess} would exceed ${maximum} by ${excess}.`,
    ),
    Match.exhaustive,
  );
}

function choiceOptionDecodeCauseMessage(
  cause: CreationChoiceOptionDecodeCause,
): string {
  return Match.value(cause).pipe(
    Match.when(
      { tag: "unsupportedAbility" },
      () => "Choice option encodes an unsupported ability score.",
    ),
    Match.when(
      { tag: "duplicateAbilities" },
      () => "Choice option must encode two distinct ability scores.",
    ),
    Match.when(
      { tag: "invalidAbilityScoreIncreaseValue" },
      ({ field, reason }) =>
        `Choice option has an invalid ability-score ${field}: ${reason}.`,
    ),
    Match.when(
      { tag: "invalidAbilityScoreIncreaseEncoding" },
      () => "Choice option does not encode an ability-score increase.",
    ),
    Match.when(
      { tag: "unsupportedWeaponCategory" },
      () => "Choice option encodes an unsupported weapon category.",
    ),
    Match.when(
      { tag: "unsupportedArmorCategory" },
      () => "Choice option encodes an unsupported armor category.",
    ),
    Match.when(
      { tag: "unsupportedToolProficiencyId" },
      () => "Choice option encodes an unsupported tool proficiency id.",
    ),
    Match.when(
      { tag: "invalidProficiencyEncoding" },
      () => "Choice option does not encode a proficiency grant subject.",
    ),
    Match.when(
      { tag: "unsupportedCharacterBuildToolProficiencyId" },
      () => "Expected a supported Character Build tool proficiency id.",
    ),
    Match.exhaustive,
  );
}

function surfaceReadIssueCauseMessage(
  issue: Extract<
    CharacterBuildProjectionCause,
    { tag: "unreadableUnit" }
  >["issues"][number],
): string {
  return Match.value(issue).pipe(
    Match.when({ code: "unsupportedUnitKind" }, () => "unsupported Unit kind"),
    Match.exhaustive,
  );
}

export function isSupportedFinalizableProgression(
  selections: Pick<FinalizedCharacterSelections, "progression">,
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): boolean {
  return isSupportedProgression(selections.progression, supportProfile);
}

export function isSupportedBackgroundAbilityScoreIncrease(
  selection: BackgroundAbilityScoreIncreaseSelection,
  unitLibrary: UnitCatalog,
  backgroundUnitId: UnitRecord["id"],
  baseScores: AbilityScoreAssignment,
): boolean {
  const backgroundOption = unitLibrary.getUnit(backgroundUnitId);
  if (Option.isNone(backgroundOption)) return false;
  const background = backgroundOption.value;
  const facts = readBackgroundCreationFacts(background);
  if (facts.tag !== "readable") {
    return false;
  }

  const eligible = facts.value.abilityScoreIncrease.abilities;
  if (selection.kind === "oneEach") {
    return backgroundAbilityScoreIncreaseFitsCap(
      baseScores,
      backgroundAbilityScoreIncreaseDeltas(selection, eligible),
    );
  }

  return (
    eligible.includes(selection.plusTwo) &&
    eligible.includes(selection.plusOne) &&
    backgroundAbilityScoreIncreaseFitsCap(
      baseScores,
      backgroundAbilityScoreIncreaseDeltas(selection, eligible),
    )
  );
}

function allClassFactsForFinalization(
  progression: CharacterProgression,
  unitLibrary: UnitCatalog,
): Either.Either<ClassFactsByUnitId, ProjectionIssues> {
  return Either.map(
    traverseValidation(progressionClassUnitIds(progression), (classUnitId) =>
      classFactsEntryForFinalization(unitLibrary, classUnitId),
    ),
    (entries) => new Map(entries),
  );
}

function classFactsForSupport(
  progression: CharacterProgression,
  unitLibrary: UnitCatalog,
): SupportDependencyCollection<ClassFactsByUnitId> {
  const entries: Array<readonly [UnitRecord["id"], ClassCreationFacts]> = [];
  const issues: CharacterBuildProjectionIssue[] = [];
  for (const classUnitId of progressionClassUnitIds(progression)) {
    const entry = classFactsEntryForFinalization(unitLibrary, classUnitId);
    if (Either.isLeft(entry)) issues.push(entry.left);
    else entries.push(entry.right);
  }
  return { value: new Map(entries), issues };
}

function classFactsEntryForFinalization(
  unitLibrary: UnitCatalog,
  classUnitId: UnitRecord["id"],
): Either.Either<
  readonly [UnitRecord["id"], ClassCreationFacts],
  CharacterBuildProjectionIssue
> {
  const classUnit = unitForFinalization(unitLibrary, classUnitId, "class");
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  const facts = readableForFinalization(
    readClassCreationFacts(classUnit.right),
    classUnitId,
    "class",
  );
  return Either.isLeft(facts)
    ? Either.left(facts.left)
    : Either.right([classUnitId, facts.right]);
}

function fixedMulticlassProficiencySubjects(
  selections: Pick<FinalizedCharacterSelections, "progression">,
  classFactsByUnitId: ClassFactsByUnitId,
): readonly ProficiencyGrantSubject[] {
  const startingUnitId = startingClassUnitId(selections.progression);
  return [...classFactsByUnitId].flatMap(([classUnitId, facts]) =>
    classUnitId !== startingUnitId
      ? fixedProficiencySubjects(facts.multiclassProficiencies)
      : [],
  );
}

function fixedProficiencySubjects(
  proficiency: ProficiencyGrant,
): readonly ProficiencyGrantSubject[] {
  if (proficiency.kind === "fixed") {
    return proficiency.proficiencies;
  }
  if (proficiency.kind === "mixed") {
    return proficiency.fixed;
  }
  if (proficiency.kind === "mixed_choices") {
    return proficiency.fixed;
  }
  return [];
}

export function buildCharacterBuild(input: {
  readonly supportedSelections: ExecutableSupportSelections;
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile: CharacterCreationSupportProfile;
}): Either.Either<CharacterBuild, FinalizationIssues> {
  const { selections } = input.supportedSelections;
  const progression = input.supportedSelections.progression;
  const selectedClassUnitId = startingClassUnitId(progression);
  const classFactsByUnitId = allClassFactsForFinalization(
    progression,
    input.unitLibrary,
  );
  /* v8 ignore start -- The support gate already read every class in this progression from this catalog. */
  if (Either.isLeft(classFactsByUnitId)) {
    return Either.left(classFactsByUnitId.left);
  }
  /* v8 ignore stop */
  const classFacts = classFactsByUnitId.right.get(selectedClassUnitId);
  /* v8 ignore start -- The support gate already established facts for the starting class id. */
  if (classFacts == null) {
    return Either.left([
      characterBuildProjectionIssue({
        tag: "missingStartingClassFacts",
        projection: "characterBuild",
        classUnitId: selectedClassUnitId,
      }),
    ]);
  }
  /* v8 ignore stop */
  const backgroundUnit = unitForFinalization(
    input.unitLibrary,
    selections.background,
    "background",
  );
  /* v8 ignore start -- The support gate already resolved this selected background in the same catalog. */
  if (Either.isLeft(backgroundUnit)) return Either.left([backgroundUnit.left]);
  /* v8 ignore stop */
  const backgroundFacts = readableForFinalization(
    readBackgroundCreationFacts(backgroundUnit.right),
    selections.background,
    "background",
  );
  /* v8 ignore start -- The support gate already parsed this selected background's creation facts. */
  if (Either.isLeft(backgroundFacts))
    return Either.left([backgroundFacts.left]);
  /* v8 ignore stop */
  const speciesUnit = unitForFinalization(
    input.unitLibrary,
    selections.species,
    "species",
  );
  /* v8 ignore start -- The support gate already resolved this selected species in the same catalog. */
  if (Either.isLeft(speciesUnit)) return Either.left([speciesUnit.left]);
  /* v8 ignore stop */
  const speciesFacts = readableForFinalization(
    readSpeciesCreationFacts(speciesUnit.right),
    selections.species,
    "species",
  );
  /* v8 ignore start -- The support gate already parsed this selected species's creation facts. */
  if (Either.isLeft(speciesFacts)) return Either.left([speciesFacts.left]);
  /* v8 ignore stop */
  const speciesChoiceFacts = finalizedSpeciesChoiceFacts(
    selections,
    speciesUnit.right,
    input.unitLibrary,
  );
  /* v8 ignore start -- The support gate already proved the species source agrees with its selected choices. */
  if (Either.isLeft(speciesChoiceFacts)) {
    return Either.left(speciesChoiceFacts.left);
  }
  /* v8 ignore stop */
  const baseScores = selections.abilityScoreGeneration.assignedScores;
  const finalScores = applyBackgroundAbilityScoreIncrease(
    baseScores,
    selections.backgroundAbilityScoreIncrease,
    backgroundFacts.right.abilityScoreIncrease.abilities,
  );
  /* v8 ignore start -- The support gate already admitted this background increase against these scores. */
  if (Either.isLeft(finalScores)) return Either.left([finalScores.left]);
  /* v8 ignore stop */
  const featureScores = applyClassFeatureAbilityScoreIncreases(
    finalScores.right,
    selections,
  );
  /* v8 ignore start -- Supported choice holes and feat prerequisites already establish these feature increases. */
  if (Either.isLeft(featureScores)) return Either.left(featureScores.left);
  /* v8 ignore stop */
  const finalAbilityScores = featureScores.right;
  const proficiencyChoices = selectedBuildProficiencyChoiceSubjects(
    selections,
    input.unitLibrary,
  );
  /* v8 ignore start -- The support gate already decoded all selected proficiency option ids. */
  if (Either.isLeft(proficiencyChoices)) {
    return Either.left(proficiencyChoices.left);
  }
  /* v8 ignore stop */
  const buildSpellcasting = finalizedBuildSpellcasting({
    classFactsByUnitId: classFactsByUnitId.right,
    selections,
    supportedSelections: input.supportedSelections,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore start -- The support gate already checked authored spellcasting facts and selected spells. */
  if (Either.isLeft(buildSpellcasting)) {
    return Either.left(buildSpellcasting.left);
  }
  /* v8 ignore stop */
  const abilityCheckBonusFeatures =
    finalizedClassFeatureAcquisitionAbilityCheckBonusFeatures(
      input.supportedSelections.unitChoices,
      input.unitLibrary,
    );
  /* v8 ignore start -- Support admission retains only acquisition choices whose mechanics project supported ability-check bonuses. */
  if (Either.isLeft(abilityCheckBonusFeatures)) {
    return Either.left(abilityCheckBonusFeatures.left);
  }
  /* v8 ignore stop */
  const buildFeatures: readonly CharacterBuildFeature[] = [
    ...finalizedClassChoiceFeaturesForSupportedChoices(
      input.supportedSelections.unitChoices,
    ),
    ...abilityCheckBonusFeatures.right,
  ];
  const magicInitiateSpellAccesses = finalizedMagicInitiateSpellAccesses(
    selections,
    buildFeatures,
    input.unitLibrary,
  );
  const classFeatureLanguages = finalizedClassFeatureLanguages({
    progression,
    originLanguages: selections.languages,
    features: buildFeatures,
    unitChoices: input.supportedSelections.unitChoices,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(classFeatureLanguages)) {
    return Either.left(classFeatureLanguages.left);
  }
  const buildEquipment = finalizedBuildEquipmentForSupportedLoadoutChoices(
    selections,
    input.supportedSelections.loadoutChoices,
    input.unitLibrary,
    input.supportProfile,
  );
  /* v8 ignore start -- Support admission validates every retained loadout and owned equipment id before build projection. */
  if (Either.isLeft(buildEquipment)) {
    return Either.left(buildEquipment.left);
  }
  /* v8 ignore stop */

  return Either.right({
    progression,
    background: selections.background,
    species: selections.species,
    ...(selections.speciesSize === undefined
      ? {}
      : { speciesSize: selections.speciesSize }),
    ...(speciesChoiceFacts.right === undefined
      ? {}
      : { speciesChoiceFacts: speciesChoiceFacts.right }),
    originLanguages: selections.languages,
    classFeatureLanguages: classFeatureLanguages.right,
    alignment: selections.alignment,
    abilityScores: finalAbilityScores,
    proficiencyChoices: proficiencyChoices.right,
    features: buildFeatures,
    ...(buildSpellcasting.right == null
      ? {}
      : { spellcasting: buildSpellcasting.right }),
    magicInitiateSpellAccesses,
    equipment: buildEquipment.right,
  });
}

function finalizedMagicInitiateSpellAccesses(
  selections: FinalizedCharacterSelections,
  features: readonly CharacterBuildFeature[],
  unitLibrary: UnitCatalog,
): readonly CharacterBuildMagicInitiateSpellAccess[] {
  const selectedFeatUnitIds = [
    ...(() => {
      const background = unitLibrary.getUnit(selections.background);
      if (Option.isNone(background)) return [];
      const facts = readBackgroundCreationFacts(background.value);
      return facts.tag === "readable" ? [facts.value.originFeatId] : [];
    })(),
    ...characterBuildSpeciesOriginFeatUnitIds({
      species: selections.species,
      features,
      unitLibrary,
    }),
  ];

  return selectedFeatUnitIds.flatMap((featUnitId) =>
    finalizedMagicInitiateSpellAccessForFeat({
      selections,
      featUnitId,
      unitLibrary,
    }),
  );
}

function finalizedMagicInitiateSpellAccessForFeat(input: {
  readonly selections: FinalizedCharacterSelections;
  readonly featUnitId: UnitRecord["id"];
  readonly unitLibrary: UnitCatalog;
}): readonly CharacterBuildMagicInitiateSpellAccess[] {
  const featUnit = input.unitLibrary.getUnit(input.featUnitId);
  if (Option.isNone(featUnit)) return [];
  const facts = readMagicInitiateSpellAccessSourceFacts(featUnit.value);
  if (facts.tag !== "readable") return [];
  const cantrips = selectedUnitChoiceOptionUnitIds(
    input.selections,
    input.featUnitId,
    ORIGIN_FEAT_MAGIC_INITIATE_CANTRIP_CHOICE_KEY,
  );
  const levelOneSpells = selectedUnitChoiceOptionUnitIds(
    input.selections,
    input.featUnitId,
    ORIGIN_FEAT_MAGIC_INITIATE_LEVEL_ONE_SPELL_CHOICE_KEY,
  );
  const abilityOptionIds = selectedUnitChoiceOptionIds(
    input.selections,
    input.featUnitId,
    ORIGIN_FEAT_MAGIC_INITIATE_SPELLCASTING_ABILITY_CHOICE_KEY,
  );
  const firstCantrip = cantrips[0];
  const secondCantrip = cantrips[1];
  const levelOneSpell = levelOneSpells[0];
  const spellcastingAbility = magicInitiateSpellcastingAbility(
    abilityOptionIds[0],
  );
  const selection = finalizedMagicInitiateSpellAccessSelection({
    cantrips,
    expectedCantripCount: facts.value.selectedCantrips.count,
    firstCantrip,
    secondCantrip,
    levelOneSpells,
    expectedLevelOneSpellCount: facts.value.selectedLevelOneSpell.count,
    levelOneSpell,
    spellcastingAbility,
    abilityOptionCount: abilityOptionIds.length,
  });
  return selection === undefined
    ? []
    : [
        {
          featUnitId: input.featUnitId,
          spellcastingAbility: selection.spellcastingAbility,
          cantrips: selection.cantrips,
          levelOneSpell: selection.levelOneSpell,
        },
      ];
}

function finalizedMagicInitiateSpellAccessSelection(input: {
  readonly cantrips: readonly UnitRecord["id"][];
  readonly expectedCantripCount: number;
  readonly firstCantrip: UnitRecord["id"] | undefined;
  readonly secondCantrip: UnitRecord["id"] | undefined;
  readonly levelOneSpells: readonly UnitRecord["id"][];
  readonly expectedLevelOneSpellCount: number;
  readonly levelOneSpell: UnitRecord["id"] | undefined;
  readonly spellcastingAbility:
    | CharacterBuildMagicInitiateSpellAccess["spellcastingAbility"]
    | undefined;
  readonly abilityOptionCount: number;
}):
  | {
      readonly spellcastingAbility: CharacterBuildMagicInitiateSpellAccess["spellcastingAbility"];
      readonly cantrips: readonly [UnitRecord["id"], UnitRecord["id"]];
      readonly levelOneSpell: UnitRecord["id"];
    }
  | undefined {
  if (
    input.firstCantrip === undefined ||
    input.secondCantrip === undefined ||
    input.cantrips.length !== input.expectedCantripCount ||
    input.levelOneSpell === undefined ||
    input.levelOneSpells.length !== input.expectedLevelOneSpellCount ||
    input.spellcastingAbility === undefined ||
    input.abilityOptionCount !== 1
  ) {
    return undefined;
  }
  return {
    spellcastingAbility: input.spellcastingAbility,
    cantrips: [input.firstCantrip, input.secondCantrip],
    levelOneSpell: input.levelOneSpell,
  };
}

function selectedUnitChoiceOptionIds(
  selections: FinalizedCharacterSelections,
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): readonly CreationChoiceOptionId[] {
  return selections.choices.flatMap((selection) =>
    selection.kind === "unitChoice" &&
    selection.source.unitId === unitId &&
    selection.source.choiceKey === choiceKey
      ? selection.options.map(({ optionId }) => optionId)
      : [],
  );
}

function selectedUnitChoiceOptionUnitIds(
  selections: FinalizedCharacterSelections,
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): readonly UnitRecord["id"][] {
  return selections.choices.flatMap((selection) =>
    selection.kind === "unitChoice" &&
    selection.source.unitId === unitId &&
    selection.source.choiceKey === choiceKey
      ? selection.options.flatMap(({ unitRef }) =>
          unitRef === undefined ? [] : [unitRef.unitId],
        )
      : [],
  );
}

function magicInitiateSpellcastingAbility(
  optionId: CreationChoiceOptionId | undefined,
): MagicInitiateSpellcastingAbility | undefined {
  return MAGIC_INITIATE_SPELLCASTING_ABILITY_OPTIONS.find(
    (ability) => ability === optionId,
  );
}

type CharacterHitPointMaximumFacts = {
  readonly startingHitPointDie: number;
  readonly constitutionModifier: number;
  readonly fixedHigherLevelHitPointDice: readonly number[];
  readonly hitPointMaximumBonus: number;
};

function fixedHigherLevelHitPointGain(input: {
  readonly hitPointDie: number;
  readonly constitutionModifier: number;
}): number {
  return Math.max(
    1,
    Math.floor(input.hitPointDie / 2) + 1 + input.constitutionModifier,
  );
}

function normalHitPointMaximum(facts: CharacterHitPointMaximumFacts): number {
  return (
    facts.startingHitPointDie +
    facts.constitutionModifier +
    facts.fixedHigherLevelHitPointDice.reduce(
      (total, hitPointDie) =>
        total +
        fixedHigherLevelHitPointGain({
          hitPointDie,
          constitutionModifier: facts.constitutionModifier,
        }),
      0,
    ) +
    facts.hitPointMaximumBonus
  );
}

export function characterBuildHitPoints(
  build: Pick<
    CharacterBuild,
    "progression" | "species" | "abilityScores" | "features"
  >,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterBuildHitPoints, ProjectionIssues> {
  const classFactsByUnitId = allClassFactsForFinalization(
    build.progression,
    unitLibrary,
  );
  if (Either.isLeft(classFactsByUnitId)) {
    return Either.left(classFactsByUnitId.left);
  }

  const startingClassFacts = classFactsByUnitId.right.get(
    startingClassUnitId(build.progression),
  );
  /* v8 ignore start -- allClassFactsForFinalization just populated this map from the same nonempty progression. */
  if (startingClassFacts == null) {
    return Either.left([
      characterBuildProjectionIssue({
        tag: "missingStartingClassFacts",
        projection: "hitPoints",
        classUnitId: startingClassUnitId(build.progression),
      }),
    ]);
  }
  /* v8 ignore stop */

  const hitPointMaximumGrantBonus = hitPointMaximumGrantBonusTotal(
    build,
    unitLibrary,
  );
  if (Either.isLeft(hitPointMaximumGrantBonus)) {
    return Either.left(hitPointMaximumGrantBonus.left);
  }

  const constitutionModifier = abilityModifier(build.abilityScores.con);
  const maximum = normalHitPointMaximum({
    startingHitPointDie: startingClassFacts.hitPointDie,
    constitutionModifier,
    fixedHigherLevelHitPointDice: build.progression.advancements.flatMap(
      (advancement) => {
        const facts = classFactsByUnitId.right.get(advancement.classUnitId);
        /* v8 ignore start -- allClassFactsForFinalization populated this map from the same progression advancements. */
        return facts == null ? [] : [facts.hitPointDie];
        /* v8 ignore stop */
      },
    ),
    hitPointMaximumBonus: hitPointMaximumGrantBonus.right,
  });

  return Either.right({
    maximum: hp(maximum),
    hitDice: progressionClassLevels(build.progression).flatMap((entry) => {
      const facts = classFactsByUnitId.right.get(entry.classUnitId);
      /* v8 ignore start -- allClassFactsForFinalization populated this map from the same progression class ids. */
      return facts == null
        ? []
        : [
            {
              classUnitId: entry.classUnitId,
              dieSize: hitDieSize(facts.hitPointDie),
              total: hitDieTotal(entry.classLevel),
            },
          ];
      /* v8 ignore stop */
    }),
  });
}

function hitPointMaximumGrantBonusTotal(
  build: Pick<CharacterBuild, "progression" | "species" | "features">,
  unitLibrary: UnitCatalog,
): Either.Either<number, ProjectionIssues> {
  let total = 0;
  const issues: CharacterBuildProjectionIssue[] = [];

  const speciesTraitIds = speciesTraitUnitIdsForHitPointProjection(
    build,
    unitLibrary,
  );
  if (Either.isLeft(speciesTraitIds)) {
    issues.push(speciesTraitIds.left);
  }
  const sourceUnitIds = uniqueValues([
    ...characterBuildFeatureUnitIds(build, unitLibrary),
    ...(Either.isRight(speciesTraitIds) ? speciesTraitIds.right : []),
  ]);
  for (const sourceUnitId of sourceUnitIds) {
    const projection = hitPointMaximumGrantBonusForSourceUnit({
      build,
      unitLibrary,
      sourceUnitId,
    });
    total += projection.total;
    issues.push(...projection.issues);
  }

  const collectedIssues = nonEmptyReadonlyArray(issues);
  return collectedIssues === undefined
    ? Either.right(total)
    : Either.left(collectedIssues);
}

type HitPointMaximumGrantProjection = {
  readonly total: number;
  readonly issues: readonly CharacterBuildProjectionIssue[];
};

function hitPointMaximumGrantBonusForSourceUnit(input: {
  readonly build: Pick<CharacterBuild, "progression">;
  readonly unitLibrary: UnitCatalog;
  readonly sourceUnitId: UnitRecord["id"];
}): HitPointMaximumGrantProjection {
  const unit = input.unitLibrary.getUnit(input.sourceUnitId);
  if (Option.isNone(unit)) {
    return {
      total: 0,
      issues: [
        characterBuildProjectionIssue({
          tag: "missingHitPointMaximumGrantSourceUnit",
          sourceUnitId: input.sourceUnitId,
        }),
      ],
    };
  }
  if (
    unit.value.kind !== "class_feature" &&
    unit.value.kind !== "species_trait"
  ) {
    return { total: 0, issues: [] };
  }
  const sourceClassLevel =
    unit.value.kind === "class_feature"
      ? classLevelForUnit(
          input.build.progression,
          classUnitId(authoredUnitId(`class_${unit.value.className}`)),
        )
      : undefined;
  const components: PassiveMechanics[] =
    unit.value.mechanics.family === "composite"
      ? unit.value.mechanics.parts.filter(
          (part): part is PassiveMechanics => part.family === "passive",
        )
      : unit.value.mechanics.family === "passive"
        ? [unit.value.mechanics]
        : [];
  return hitPointMaximumGrantBonusForComponents({
    components,
    characterLevel: computeTotalLevel(input.build.progression),
    sourceClassLevel,
    sourceUnitId: input.sourceUnitId,
  });
}

function hitPointMaximumGrantBonusForComponents(input: {
  readonly components: readonly PassiveMechanics[];
  readonly characterLevel: number;
  readonly sourceClassLevel: number | undefined;
  readonly sourceUnitId: UnitRecord["id"];
}): HitPointMaximumGrantProjection {
  let total = 0;
  const issues: CharacterBuildProjectionIssue[] = [];
  for (const component of input.components) {
    for (const grant of component.grants) {
      if (grant.kind !== "modify_max_hp" || grant.direction !== "increase") {
        continue;
      }
      const bonus = deterministicHitPointMaximumDelta(grant.delta, {
        characterLevel: input.characterLevel,
        sourceClassLevel: input.sourceClassLevel,
      });
      if (bonus === undefined) {
        issues.push(
          characterBuildProjectionIssue({
            tag: "unsupportedHitPointMaximumGrant",
            sourceUnitId: input.sourceUnitId,
          }),
        );
        continue;
      }
      total += bonus;
    }
  }
  return { total, issues };
}

function deterministicHitPointMaximumDelta(
  delta: HitPointMaximumDelta,
  levels: {
    readonly characterLevel: number;
    readonly sourceClassLevel: number | undefined;
  },
): number | undefined {
  return Match.value(delta).pipe(
    Match.when({ kind: "fixed" }, (fixed) =>
      deterministicFlatDiceExpr(fixed.expr),
    ),
    Match.when({ kind: "linear_per_level" }, (linear) => {
      const scaleLevel =
        linear.axis === "character"
          ? levels.characterLevel
          : linear.axis === "class"
            ? levels.sourceClassLevel
            : undefined;
      if (scaleLevel === undefined) return undefined;
      const base = deterministicFlatDiceExpr(linear.base);
      const perLevel = deterministicFlatDiceDelta(linear.perLevel);
      if (base === undefined || perLevel === undefined) return undefined;
      return base + Math.max(0, scaleLevel - linear.startingAtLevel) * perLevel;
    }),
    Match.when({ kind: "threshold_tiers" }, () => undefined),
    Match.when({ kind: "threshold_tiers_exploding_max_die" }, () => undefined),
    Match.when({ kind: "resource_spent" }, () => undefined),
    Match.when({ kind: "proficiency_bonus" }, () => undefined),
    Match.when({ kind: "resource_spent_linear" }, () => undefined),
    Match.when({ kind: "linked" }, () => undefined),
    Match.exhaustive,
  );
}

function deterministicFlatDiceExpr(amount: DiceExpr): number | undefined {
  /* v8 ignore start -- This helper exists only to reject malformed nondeterministic maximum-HP grants; admitted grants use explicit flat expressions. */
  return amount.dice === 0 ? (amount.flat ?? 0) : undefined;
  /* v8 ignore stop */
}

function deterministicFlatDiceDelta(amount: DiceExprDelta): number | undefined {
  /* v8 ignore start -- This helper exists only to reject malformed nondeterministic maximum-HP deltas; admitted grants use explicit flat deltas. */
  return (amount.dice ?? 0) === 0 ? (amount.flat ?? 0) : undefined;
  /* v8 ignore stop */
}

export function characterBuildProficiencies(
  build: Pick<
    CharacterBuild,
    "progression" | "background" | "proficiencyChoices"
  >,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterBuildProficiencies, ProjectionIssues> {
  const classFactsByUnitId = allClassFactsForFinalization(
    build.progression,
    unitLibrary,
  );
  if (Either.isLeft(classFactsByUnitId)) {
    return Either.left(classFactsByUnitId.left);
  }

  const startingClassFacts = classFactsByUnitId.right.get(
    startingClassUnitId(build.progression),
  );
  /* v8 ignore start -- allClassFactsForFinalization just populated this map from the same nonempty progression. */
  if (startingClassFacts == null) {
    return Either.left([
      characterBuildProjectionIssue({
        tag: "missingStartingClassFacts",
        projection: "proficiencies",
        classUnitId: startingClassUnitId(build.progression),
      }),
    ]);
  }
  /* v8 ignore stop */

  const backgroundUnit = unitForFinalization(
    unitLibrary,
    build.background,
    "background",
  );
  if (Either.isLeft(backgroundUnit)) return Either.left([backgroundUnit.left]);
  const backgroundFacts = readableForFinalization(
    readBackgroundCreationFacts(backgroundUnit.right),
    build.background,
    "background",
  );
  if (Either.isLeft(backgroundFacts))
    return Either.left([backgroundFacts.left]);

  const multiclassSubjects = fixedMulticlassProficiencySubjects(
    {
      progression: build.progression,
    },
    classFactsByUnitId.right,
  );
  const multiclassTools =
    finalizedBuildSurfaceToolProficiencyIds(multiclassSubjects);
  /* v8 ignore start -- Supported multiclass tool grants already carry ids admitted by the shared tool codec. */
  if (Either.isLeft(multiclassTools)) return Either.left(multiclassTools.left);
  /* v8 ignore stop */
  const startingClassTools = finalizedBuildSurfaceToolProficiencyIds(
    fixedToolProficiencySubjects(startingClassFacts.toolProficiencies),
  );
  /* v8 ignore start -- Supported starting-class tool grants already carry ids admitted by the shared tool codec. */
  if (Either.isLeft(startingClassTools)) {
    return Either.left(startingClassTools.left);
  }
  /* v8 ignore stop */

  return Either.right({
    savingThrows: startingClassFacts.savingThrowProficiencies,
    skills: uniqueValues([
      ...backgroundFacts.right.skillProficiencies,
      ...build.proficiencyChoices.flatMap((subject) =>
        subject.kind === "skill" || subject.kind === "skill_expertise"
          ? [subject.skill]
          : [],
      ),
    ]),
    expertise: uniqueValues(
      build.proficiencyChoices.flatMap((subject) =>
        subject.kind === "skill_expertise" ? [subject.skill] : [],
      ),
    ),
    weapon: uniqueValues([
      ...startingClassFacts.weaponProficiencies.flatMap((proficiency) =>
        proficiency.kind === "weapon_category" ? [proficiency.category] : [],
      ),
      ...multiclassSubjects.flatMap((subject) =>
        subject.kind === "weapon_category" ? [subject.category] : [],
      ),
      ...build.proficiencyChoices.flatMap((subject) =>
        subject.kind === "weapon_category" ? [subject.category] : [],
      ),
    ]),
    weaponPropertyFilters: uniqueValues(
      startingClassFacts.weaponProficiencies.flatMap((proficiency) =>
        proficiency.kind === "weapon_category_with_properties"
          ? [proficiency]
          : [],
      ),
    ),
    tools: uniqueValues([
      ...startingClassTools.right,
      ...multiclassTools.right,
      ...build.proficiencyChoices.flatMap((subject) =>
        subject.kind === "tool" ? [subject.toolId] : [],
      ),
    ]),
  });
}

export function characterBuildArmorTraining(
  build: Pick<CharacterBuild, "progression" | "proficiencyChoices">,
  unitLibrary: UnitCatalog,
): Either.Either<readonly ArmorTrainingCategory[], ProjectionIssues> {
  const classFactsByUnitId = allClassFactsForFinalization(
    build.progression,
    unitLibrary,
  );
  if (Either.isLeft(classFactsByUnitId)) {
    return Either.left(classFactsByUnitId.left);
  }

  const startingClassFacts = classFactsByUnitId.right.get(
    startingClassUnitId(build.progression),
  );
  /* v8 ignore start -- allClassFactsForFinalization just populated this map from the same nonempty progression. */
  if (startingClassFacts == null) {
    return Either.left([
      characterBuildProjectionIssue({
        tag: "missingStartingClassFacts",
        projection: "armorTraining",
        classUnitId: startingClassUnitId(build.progression),
      }),
    ]);
  }
  /* v8 ignore stop */

  const multiclassSubjects = fixedMulticlassProficiencySubjects(
    {
      progression: build.progression,
    },
    classFactsByUnitId.right,
  );
  return Either.right(
    uniqueValues([
      ...startingClassFacts.armorTraining,
      ...multiclassSubjects.flatMap((subject) =>
        subject.kind === "armor_category" ? [subject.category] : [],
      ),
      ...build.proficiencyChoices.flatMap((subject) =>
        subject.kind === "armor_category" ? [subject.category] : [],
      ),
    ]),
  );
}

export function characterBuildFeatureUnitIds(
  build: Pick<CharacterBuild, "progression" | "features">,
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  const selectedClassChoiceUnitIds = build.features.flatMap((feature) =>
    feature.kind === "selectedClassChoice" ? [feature.unitId] : [],
  );
  return uniqueValues([
    ...progressionClassUnitIds(build.progression).flatMap((classUnitId) => {
      const unit = unitLibrary.getUnit(classUnitId);
      if (Option.isNone(unit)) return [];
      const facts = readClassCreationFacts(unit.value);
      if (facts.tag !== "readable") return [];
      return facts.value.featureGrants
        .filter(
          (grant) =>
            grant.level <= classLevelForUnit(build.progression, classUnitId),
        )
        .map((grant) => grant.unitId);
    }),
    ...selectedClassChoiceUnitIds,
    ...selectedSubclassFeatureGrantUnitIds({
      build,
      selectedClassChoiceUnitIds,
      unitLibrary,
    }),
  ]);
}

function selectedSubclassFeatureGrantUnitIds(input: {
  readonly build: Pick<CharacterBuild, "progression">;
  readonly selectedClassChoiceUnitIds: readonly UnitRecord["id"][];
  readonly unitLibrary: UnitCatalog;
}): readonly UnitRecord["id"][] {
  return input.selectedClassChoiceUnitIds.flatMap((unitId) => {
    const unit = input.unitLibrary.getUnit(unitId);
    if (Option.isNone(unit) || unit.value.kind !== "subclass") {
      return [];
    }
    const classUnitId = classUnitIdForSubclass({
      build: input.build,
      subclass: unit.value,
      unitLibrary: input.unitLibrary,
    });
    if (classUnitId === undefined) {
      return [];
    }
    const classLevel = classLevelForUnit(input.build.progression, classUnitId);
    return unit.value.featureGrants
      .filter((grant) => grant.level <= classLevel)
      .map((grant) => grant.unitId);
  });
}

function classUnitIdForSubclass(input: {
  readonly build: Pick<CharacterBuild, "progression">;
  readonly subclass: Extract<UnitRecord, { readonly kind: "subclass" }>;
  readonly unitLibrary: UnitCatalog;
}): UnitRecord["id"] | undefined {
  return progressionClassUnitIds(input.build.progression).find(
    (classUnitId) => {
      const unit = input.unitLibrary.getUnit(classUnitId);
      return (
        Option.isSome(unit) &&
        unit.value.kind === "class" &&
        unit.value.className === input.subclass.className
      );
    },
  );
}

function finalizedClassFeatureLanguages(
  input: Pick<
    CharacterBuild,
    "progression" | "originLanguages" | "features"
  > & {
    readonly unitChoices: readonly UnitChoiceSelection[];
    readonly unitLibrary: UnitCatalog;
  },
): Either.Either<
  readonly CharacterBuildClassFeatureLanguage[],
  ProjectionIssues
> {
  const issues: CharacterBuildProjectionIssue[] = [];
  const classFeatureLanguages: CharacterBuildClassFeatureLanguage[] = [];
  const knownLanguages = new Set<
    CharacterBuildClassFeatureLanguage["language"]
  >(input.originLanguages);

  for (const unitId of characterBuildFeatureUnitIds(input, input.unitLibrary)) {
    const unit = input.unitLibrary.getUnit(unitId);
    if (
      Option.isNone(unit) ||
      unit.value.kind !== "class_feature" ||
      unit.value.mechanics.family !== "passive"
    ) {
      continue;
    }

    for (const grant of unit.value.mechanics.grants) {
      if (grant.kind === "grant_language") {
        const language = languageFromSurfaceLanguageId(grant.languageId);
        /* v8 ignore start -- Supported passive language grants carry only Surface language ids admitted by the codec. */
        if (Either.isLeft(language)) {
          issues.push(
            characterBuildProjectionIssue({
              tag: "unsupportedClassFeatureLanguage",
              featureUnitId: unitId,
              languageId: grant.languageId,
            }),
          );
          continue;
        }

        if (knownLanguages.has(language.right)) {
          issues.push(
            characterBuildProjectionIssue({
              tag: "duplicateClassFeatureLanguage",
              featureUnitId: unitId,
              language: language.right,
            }),
          );
          continue;
        }
        /* v8 ignore stop */

        knownLanguages.add(language.right);
        classFeatureLanguages.push({
          kind: "classFeatureLanguageGrant",
          sourceUnitId: unitId,
          language: language.right,
        });
        continue;
      }

      if (grant.kind !== "grant_language_choice") {
        continue;
      }

      const selection = classFeatureLanguageChoiceSelection(
        input.unitChoices,
        unitId,
      );
      /* v8 ignore start -- The support gate admits exactly the authored number of unique language options for each retained language-choice grant. */
      if (selection === undefined) {
        issues.push(
          characterBuildProjectionIssue({
            tag: "missingClassFeatureLanguageChoice",
            featureUnitId: unitId,
          }),
        );
        continue;
      }

      if (selection.options.length !== grant.count) {
        issues.push(
          characterBuildProjectionIssue({
            tag: "classFeatureLanguageChoiceCountMismatch",
            featureUnitId: unitId,
            mismatch:
              selection.options.length < grant.count
                ? {
                    tag: "missing",
                    receivedCount: NonNegativeInteger(selection.options.length),
                    missingCount: PositiveInteger(
                      grant.count - selection.options.length,
                    ),
                  }
                : {
                    tag: "extra",
                    expectedCount: PositiveInteger(grant.count),
                    extraCount: PositiveInteger(
                      selection.options.length - grant.count,
                    ),
                  },
          }),
        );
        continue;
      }

      for (const option of classFeatureLanguageChoiceOptions(
        grant,
        selection,
      )) {
        const language = option.language;
        if (Either.isLeft(language)) {
          issues.push(
            characterBuildProjectionIssue({
              tag: "unsupportedClassFeatureLanguageChoice",
              featureUnitId: unitId,
              optionId: option.optionId,
            }),
          );
          continue;
        }

        if (knownLanguages.has(language.right)) {
          issues.push(
            characterBuildProjectionIssue({
              tag: "duplicateClassFeatureLanguageChoice",
              featureUnitId: unitId,
              language: language.right,
            }),
          );
          continue;
        }
        /* v8 ignore stop */

        knownLanguages.add(language.right);
        classFeatureLanguages.push({
          kind: "classFeatureLanguageChoice",
          sourceUnitId: unitId,
          language: language.right,
        });
      }
    }
  }

  const nonEmptyIssues = nonEmptyReadonlyArray(issues);
  return nonEmptyIssues === undefined
    ? Either.right(classFeatureLanguages)
    : Either.left(nonEmptyIssues);
}

function classFeatureLanguageChoiceSelection(
  unitChoices: readonly UnitChoiceSelection[],
  sourceUnitId: UnitRecord["id"],
): UnitChoiceSelection | undefined {
  return unitChoices.find(
    (selection) =>
      selection.source.unitId === sourceUnitId &&
      selection.source.choiceKey === CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
  );
}

type ParsedClassFeatureLanguageChoiceOption = {
  readonly optionId: CreationChoiceOptionId;
  readonly language: ReturnType<typeof languageFromCreationChoiceOptionId>;
};

function classFeatureLanguageChoiceOptions(
  grant: Extract<EffectAtom, { readonly kind: "grant_language_choice" }>,
  selection: UnitChoiceSelection,
): readonly ParsedClassFeatureLanguageChoiceOption[] {
  return Match.value(grant.source).pipe(
    Match.when("character_creation_language_tables", () =>
      selection.options.map((option) => ({
        optionId: option.optionId,
        language: languageFromCreationChoiceOptionId(option.optionId),
      })),
    ),
    Match.exhaustive,
  );
}

export function characterBuildResources(
  build: Pick<CharacterBuild, "progression" | "features">,
  unitLibrary: UnitCatalog,
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): readonly CharacterBuildResource[] {
  return characterBuildFeatureUnitIds(build, unitLibrary).flatMap((unitId) => {
    const unit = unitLibrary.getUnit(unitId);
    return Option.isSome(unit)
      ? characterBuildResourcesForUnit(unit.value, supportProfile)
      : [];
  });
}

export function characterBuildSpellcastingSlotCapacity(
  build: Pick<CharacterBuild, "spellcasting">,
): readonly CharacterBuildSpellSlotCapacity[] {
  return build.spellcasting?.slotPools.spellcasting?.slots ?? [];
}

export function allFinalizedChoicesSupported(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): boolean {
  const selectedClassUnitId = startingClassUnitId(selections.progression);
  const classUnit = unitLibrary.getUnit(selectedClassUnitId);
  if (Option.isNone(classUnit)) return false;
  const classFacts = readClassCreationFacts(classUnit.value);
  if (classFacts.tag !== "readable") return false;
  const classFactsByUnitId = allClassFactsForFinalization(
    selections.progression,
    unitLibrary,
  );
  if (Either.isLeft(classFactsByUnitId)) return false;
  const backgroundUnit = unitLibrary.getUnit(selections.background);
  if (Option.isNone(backgroundUnit)) return false;
  const backgroundFacts = readBackgroundCreationFacts(backgroundUnit.value);
  if (backgroundFacts.tag !== "readable") return false;
  const classEquipmentHole = requireUnitChoiceCreationHole(
    startingEquipmentChoiceHole(
      unitSource(selectedClassUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
      classFacts.value.startingEquipment,
    ),
  );
  const backgroundEquipmentHole = requireUnitChoiceCreationHole(
    startingEquipmentChoiceHole(
      unitSource(selections.background, BACKGROUND_EQUIPMENT_CHOICE_KEY),
      backgroundFacts.value.startingEquipment,
    ),
  );
  /* v8 ignore start -- Supported class and background equipment choices each produce a Unit-sourced choice hole. */
  if (
    classEquipmentHole === undefined ||
    backgroundEquipmentHole === undefined
  ) {
    return false;
  }
  /* v8 ignore stop */
  const supportedHoles = supportedFinalizationChoiceHoles({
    selections,
    classFacts: classFacts.value,
    classFactsByUnitId: classFactsByUnitId.right,
    backgroundFacts: backgroundFacts.value,
    unitLibrary,
    classEquipmentHole,
    backgroundEquipmentHole,
    supportProfile,
  });
  const supportedUnitHolesBySource = supportedChoiceHolesBySource(
    supportedHoles.flatMap((hole) =>
      isUnitChoiceCreationHole(hole) ? [hole] : [],
    ),
  );
  const supportedLoadoutHoles = supportedLoadoutHolesBySource(
    supportedHoles.flatMap((hole) =>
      isLoadoutCreationHole(hole) ? [hole] : [],
    ),
  );
  const unitChoices = selections.choices.flatMap((choice) =>
    choice.kind === "unitChoice" ? [choice] : [],
  );
  const loadoutChoices = selections.choices.flatMap((choice) =>
    choice.kind === "loadout" ? [choice] : [],
  );
  const unitChoiceSourceKeys = unitChoices.map((choice) =>
    unitChoiceSourceKey(choice.source),
  );
  const loadoutSourceKeys = loadoutChoices.map((choice) =>
    loadoutSourceKey(choice.source),
  );
  const loadoutSlots = loadoutChoices.map((choice) => choice.source.slot);

  return (
    new Set(unitChoiceSourceKeys).size === unitChoiceSourceKeys.length &&
    new Set(loadoutSourceKeys).size === loadoutSourceKeys.length &&
    new Set(loadoutSlots).size === loadoutSlots.length &&
    unitChoices.every((choice) => {
      const supportedHole = supportedUnitHolesBySource.get(
        unitChoiceSourceKey(choice.source),
      );
      if (
        supportedHole == null ||
        !choiceSelectionMatchesHole(choice, supportedHole, supportProfile)
      ) {
        return false;
      }

      if (sameCreationHoleSource(choice.source, classEquipmentHole.source)) {
        return supportedStartingEquipmentChoice(
          choice,
          selectedClassUnitId,
          CLASS_EQUIPMENT_CHOICE_KEY,
          classFacts.value.startingEquipment,
          supportProfile,
        );
      }

      if (
        sameCreationHoleSource(choice.source, backgroundEquipmentHole.source)
      ) {
        return supportedStartingEquipmentChoice(
          choice,
          selections.background,
          BACKGROUND_EQUIPMENT_CHOICE_KEY,
          backgroundFacts.value.startingEquipment,
          supportProfile,
        );
      }

      return (
        !sameCreationHoleSource(choice.source, classEquipmentHole.source) &&
        !sameCreationHoleSource(choice.source, backgroundEquipmentHole.source)
      );
    }) &&
    loadoutChoices.every((choice) => {
      const supportedHole = supportedLoadoutHoles.get(
        loadoutSourceKey(choice.source),
      );
      return (
        supportedHole != null &&
        choiceSelectionMatchesHole(choice, supportedHole, supportProfile)
      );
    })
  );
}

export function supportedChoiceHolesBySource(
  holes: readonly UnitChoiceCreationHole[],
): ReadonlyMap<UnitChoiceSourceKey, UnitChoiceCreationHole> {
  const bySource = new Map<UnitChoiceSourceKey, UnitChoiceCreationHole>();
  for (const hole of holes) {
    const sourceKey = unitChoiceSourceKey(hole.source);
    const existing = bySource.get(sourceKey);
    if (existing == null) {
      bySource.set(sourceKey, hole);
      continue;
    }

    const merged = mergeChoiceHoles(existing, hole);
    if (merged !== undefined) {
      bySource.set(sourceKey, merged);
    }
  }

  return bySource;
}

export function supportedLoadoutHolesBySource(
  holes: readonly LoadoutCreationHole[],
): ReadonlyMap<LoadoutSourceKey, LoadoutCreationHole> {
  const bySource = new Map<LoadoutSourceKey, LoadoutCreationHole>();
  for (const hole of holes) {
    bySource.set(loadoutSourceKey(hole.source), hole);
  }

  return bySource;
}

function mergeChoiceHoles(
  left: UnitChoiceCreationHole,
  right: UnitChoiceCreationHole,
): UnitChoiceCreationHole | undefined {
  if (!sameChoiceCardinality(left, right)) {
    return undefined;
  }

  return {
    ...left,
    options: mergeChoiceHoleOptions(left.options, right.options),
  };
}

function sameChoiceCardinality(
  left: UnitChoiceCreationHole,
  right: UnitChoiceCreationHole,
): boolean {
  const leftBounds = choiceCardinalityBounds(left.cardinality);
  const rightBounds = choiceCardinalityBounds(right.cardinality);
  return (
    leftBounds.min === rightBounds.min && leftBounds.max === rightBounds.max
  );
}

function mergeChoiceHoleOptions(
  left: readonly CreationChoiceOption[],
  right: readonly CreationChoiceOption[],
): readonly CreationChoiceOption[] {
  const merged = [...left];
  for (const option of right) {
    const alreadyPresent = merged.some(
      (existing) =>
        existing.optionId === option.optionId &&
        existing.unitRef?.unitId === option.unitRef?.unitId,
    );
    if (!alreadyPresent) {
      merged.push(option);
    }
  }

  return merged;
}

type SupportedFinalizationChoiceHoleInput = {
  readonly selections: FinalizedCharacterSelections;
  readonly classFacts: ClassCreationFacts;
  readonly classFactsByUnitId: ClassFactsByUnitId;
  readonly backgroundFacts: Extract<
    ReturnType<typeof readBackgroundCreationFacts>,
    { readonly tag: "readable" }
  >["value"];
  readonly unitLibrary: UnitCatalog;
  readonly classEquipmentHole: UnitChoiceCreationHole;
  readonly backgroundEquipmentHole: UnitChoiceCreationHole;
  readonly supportProfile: CharacterCreationSupportProfile;
};

function supportedFinalizationChoiceHoles(
  input: SupportedFinalizationChoiceHoleInput,
): readonly ChoiceCreationHole[] {
  const classSkillHole = requireUnitChoiceCreationHole(
    choiceHole({
      source: unitSource(
        startingClassUnitId(input.selections.progression),
        CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
      ),
      cardinality: exactChoiceCardinality(
        input.classFacts.skillProficiencyChoice.choose,
      ),
      options: input.classFacts.skillProficiencyChoice.options.map(skillOption),
    }),
  );
  const classFeatureHoles = [...input.classFactsByUnitId]
    .flatMap(([classUnitId, facts]) =>
      facts.featureGrants
        .filter(
          (grant) =>
            grant.level <=
            classLevelForUnit(input.selections.progression, classUnitId),
        )
        .map((grant) => ({
          classUnitId,
          grant,
        })),
    )
    .flatMap(({ classUnitId, grant }) =>
      classFeatureGrantChoiceHoles(grant.unitId, input.unitLibrary, {
        classLevel: classLevelForUnit(
          input.selections.progression,
          classUnitId,
        ),
        ownedSkillExpertise: skillExpertiseFromChoiceSelections(
          input.selections.choices,
          input.unitLibrary,
          (selection) =>
            selection.kind === "unitChoice" &&
            selection.source.unitId === grant.unitId &&
            selection.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
        ),
        ownedSkillProficiencies: selectedSkillProficiencies(
          input.selections,
          input.unitLibrary,
          (selection) =>
            selection.kind === "unitChoice" &&
            selection.source.unitId === grant.unitId &&
            selection.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
        ),
      }),
    )
    .flatMap((hole) => {
      const unitHole = requireUnitChoiceCreationHole(hole);
      /* v8 ignore start -- Admitted class-feature grant mechanics produce a Unit-sourced choice hole here. */
      return unitHole === undefined ? [] : [unitHole];
      /* v8 ignore stop */
    });
  const subclassHoles = [...input.classFactsByUnitId].flatMap(
    ([classUnitId, facts]) =>
      facts.subclassChoices
        .filter(
          (choice) =>
            choice.level <=
            classLevelForUnit(input.selections.progression, classUnitId),
        )
        .flatMap((choice) =>
          compact([
            requireUnitChoiceCreationHole(
              choiceHole({
                source: unitSource(classUnitId, CLASS_SUBCLASS_CHOICE_KEY),
                cardinality: EXACTLY_ONE_CHOICE,
                options: choice.options.flatMap((unitId) => {
                  const unit = input.unitLibrary.getUnit(unitId);
                  /* v8 ignore start -- Supported subclass choice facts reference installed subclass Units in this catalog. */
                  return Option.isSome(unit)
                    ? [
                        {
                          optionId: creationChoiceOptionId(unit.value.id),
                          label: unit.value.name,
                          unitRef: { unitId: unit.value.id },
                        },
                      ]
                    : [];
                  /* v8 ignore stop */
                }),
              }),
            ),
          ]),
        ),
  );
  const subclassFeatureHoles = selectedSubclassFeatureGrantChoiceHoles({
    selections: input.selections,
    classFactsByUnitId: input.classFactsByUnitId,
    unitLibrary: input.unitLibrary,
  });
  const multiclassProficiencyHoles = [...input.classFactsByUnitId].flatMap(
    ([classUnitId, facts]) =>
      classUnitId === startingClassUnitId(input.selections.progression)
        ? []
        : multiclassProficiencyChoiceHoles(classUnitId, facts),
  );
  const classToolProficiencyHoles =
    input.classFacts.toolProficiencies.kind === "choice"
      ? compact([
          requireUnitChoiceCreationHole(
            choiceHole({
              source: unitSource(
                startingClassUnitId(input.selections.progression),
                CLASS_TOOL_PROFICIENCY_CHOICE_KEY,
              ),
              cardinality: exactChoiceCardinality(
                input.classFacts.toolProficiencies.count,
              ),
              options: input.classFacts.toolProficiencies.options.flatMap(
                proficiencyGrantSubjectOptions,
              ),
            }),
          ),
        ])
      : [];
  const selectedFeatAbilityScoreHoles = selectedFeatAbilityScoreChoiceHoles(
    input.selections,
    input.unitLibrary,
  );
  const originFeatProficiencyHoles = originFeatGrantChoiceHoles(
    input.backgroundFacts.originFeatId,
    input.unitLibrary,
    {
      ownedSkillProficiencies: selectedSkillProficiencies(
        input.selections,
        input.unitLibrary,
        (selection) =>
          selection.kind === "unitChoice" &&
          selection.source.unitId === input.backgroundFacts.originFeatId &&
          selection.source.choiceKey === ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
      ),
      ownedToolProficiencies: originFeatOwnedToolProficiencies({
        selections: input.selections,
        classFacts: input.classFacts,
        classFactsByUnitId: input.classFactsByUnitId,
        originFeatUnitId: input.backgroundFacts.originFeatId,
        originFeatProficiencyChoiceKey: ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
      }),
    },
  ).flatMap((hole) => compact([requireUnitChoiceCreationHole(hole)]));
  const speciesTraitHoles = speciesTraitGrantChoiceHolesForFinalization(
    input,
  ).flatMap((hole) => compact([requireUnitChoiceCreationHole(hole)]));
  const speciesOriginFeatProficiencyHoles =
    speciesSelectedOriginFeatGrantChoiceHolesForFinalization(input).flatMap(
      (hole) => compact([requireUnitChoiceCreationHole(hole)]),
    );
  const spellcastingHoles = classSpellcastingChoiceHoles(
    startingClassUnitId(input.selections.progression),
    input.classFacts,
    classLevelForUnit(
      input.selections.progression,
      startingClassUnitId(input.selections.progression),
    ),
  ).flatMap((hole) => compact([requireUnitChoiceCreationHole(hole)]));
  const selectedClassFeatureAcquisitionGrantHoles = [
    ...input.classFactsByUnitId,
  ].flatMap(([classUnitId, facts]) =>
    selectedClassFeatureAcquisitionGrantChoiceHoles({
      choices: input.selections.choices,
      classUnitId,
      classFacts: facts,
      classLevel: classLevelForUnit(input.selections.progression, classUnitId),
      unitLibrary: input.unitLibrary,
    }).flatMap((hole) => compact([requireUnitChoiceCreationHole(hole)])),
  );
  const backgroundToolHole = backgroundToolChoiceSpec(
    input.backgroundFacts.toolProficiency,
  );
  const selectedEquipment = new Set([
    ...input.selections.equipment.selectedUnitIds,
    ...startingEquipmentUnitIds(
      selectedStartingEquipmentForBuild(
        input.selections,
        startingClassUnitId(input.selections.progression),
        CLASS_EQUIPMENT_CHOICE_KEY,
        input.classFacts.startingEquipment,
      ),
    ),
    ...startingEquipmentUnitIds(
      selectedStartingEquipmentForBuild(
        input.selections,
        input.selections.background,
        BACKGROUND_EQUIPMENT_CHOICE_KEY,
        input.backgroundFacts.startingEquipment,
      ),
    ),
  ]);

  return [
    classSkillHole,
    ...classToolProficiencyHoles,
    ...classFeatureHoles,
    ...subclassHoles,
    ...subclassFeatureHoles,
    ...multiclassProficiencyHoles,
    ...selectedFeatAbilityScoreHoles,
    ...originFeatProficiencyHoles,
    ...speciesTraitHoles,
    ...speciesOriginFeatProficiencyHoles,
    ...spellcastingHoles,
    ...selectedClassFeatureAcquisitionGrantHoles,
    ...(backgroundToolHole == null
      ? []
      : compact([
          requireUnitChoiceCreationHole(
            choiceHole({
              source: unitSource(
                input.selections.background,
                BACKGROUND_TOOL_CHOICE_KEY,
              ),
              cardinality: backgroundToolHole.cardinality,
              options: backgroundToolHole.options,
            }),
          ),
        ])),
    input.classEquipmentHole,
    input.backgroundEquipmentHole,
    ...supportedLoadoutChoices(input.supportProfile).flatMap(
      (loadoutChoice) => {
        const selectedInSlot = input.selections.choices.find(
          (selection) =>
            selection.kind === "loadout" &&
            selection.source.slot === loadoutChoice.slot,
        );
        return selectedEquipment.has(loadoutChoice.unitId) &&
          (selectedInSlot === undefined ||
            (selectedInSlot.kind === "loadout" &&
              String(selectedInSlot.source.equipmentUnitId) ===
                String(loadoutChoice.unitId)))
          ? compact([
              requireLoadoutCreationHole(
                choiceHole({
                  source: loadoutSource(
                    loadoutChoice.unitId,
                    loadoutChoice.slot,
                  ),
                  cardinality: EXACTLY_ONE_CHOICE,
                  options: [
                    {
                      optionId: loadoutChoice.optionId,
                      label: loadoutChoice.label,
                      unitRef: { unitId: loadoutChoice.unitId },
                    },
                  ],
                }),
              ),
            ])
          : [];
      },
    ),
  ].filter(isPresent);
}

function speciesTraitGrantChoiceHolesForFinalization(
  input: SupportedFinalizationChoiceHoleInput,
): readonly ChoiceCreationHole[] {
  const background = input.unitLibrary.getUnit(input.selections.background);
  const backgroundFacts = Option.isSome(background)
    ? readBackgroundCreationFacts(background.value)
    : undefined;
  const excludedMagicInitiateSpellLists = magicInitiateSpellListsForUnitIds(
    backgroundFacts?.tag === "readable"
      ? [backgroundFacts.value.originFeatId]
      : [],
    input.unitLibrary,
  );
  return selectedSpeciesTraitUnitsForFinalization(input).flatMap((trait) => {
    if (trait.mechanics.family === "species_lineage_choice") {
      return speciesLineageChoiceHoles(trait.id, trait.mechanics);
    }

    if (trait.mechanics.family !== "passive") {
      return [];
    }

    return trait.mechanics.grants.flatMap((grant) =>
      passiveGrantChoiceHoles(trait.id, grant, input.unitLibrary, {
        ownedSkillProficiencies: selectedSkillProficiencies(
          input.selections,
          input.unitLibrary,
          (selection) =>
            selection.kind === "unitChoice" &&
            selection.source.unitId === trait.id &&
            selection.source.choiceKey === SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY,
        ),
        ownedToolProficiencies: selectedAndFixedToolProficiencies({
          selections: input.selections,
          classFacts: input.classFacts,
          classFactsByUnitId: input.classFactsByUnitId,
          shouldIgnoreSelection: (selection) =>
            selection.kind === "unitChoice" &&
            selection.source.unitId === trait.id &&
            selection.source.choiceKey === SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY,
        }),
        proficiencyChoiceKey: SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY,
        featChoiceKey: SPECIES_ORIGIN_FEAT_CHOICE_KEY,
        excludedMagicInitiateSpellLists,
      }),
    );
  });
}

function speciesSelectedOriginFeatGrantChoiceHolesForFinalization(
  input: SupportedFinalizationChoiceHoleInput,
): readonly ChoiceCreationHole[] {
  return selectedSpeciesOriginFeatUnitIds(input.selections).flatMap(
    (featUnitId) =>
      originFeatGrantChoiceHoles(featUnitId, input.unitLibrary, {
        ownedSkillProficiencies: selectedSkillProficiencies(
          input.selections,
          input.unitLibrary,
          (selection) =>
            selection.kind === "unitChoice" &&
            selection.source.unitId === featUnitId &&
            selection.source.choiceKey ===
              SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
        ),
        ownedToolProficiencies: originFeatOwnedToolProficiencies({
          selections: input.selections,
          classFacts: input.classFacts,
          classFactsByUnitId: input.classFactsByUnitId,
          originFeatUnitId: featUnitId,
          originFeatProficiencyChoiceKey:
            SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
        }),
        proficiencyChoiceKey: SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
      }),
  );
}

function selectedSpeciesTraitUnitsForFinalization(
  input: Pick<
    SupportedFinalizationChoiceHoleInput,
    "selections" | "unitLibrary"
  >,
): readonly Extract<UnitRecord, { readonly kind: "species_trait" }>[] {
  if (
    !speciesUnitIdsWithSupportedTraitChoices().includes(
      input.selections.species,
    )
  ) {
    return [];
  }

  const speciesUnit = input.unitLibrary.getUnit(input.selections.species);
  /* v8 ignore start -- Support admission resolves this selected species, parses its facts, and retains installed species-trait references. */
  if (Option.isNone(speciesUnit)) {
    return [];
  }
  const facts = readSpeciesCreationFacts(speciesUnit.value);
  if (facts.tag !== "readable") {
    return [];
  }

  return Object.values(facts.value.traits).flatMap((traitUnitId) => {
    const traitUnit = input.unitLibrary.getUnit(traitUnitId);
    return Option.isSome(traitUnit) && traitUnit.value.kind === "species_trait"
      ? [traitUnit.value]
      : [];
  });
  /* v8 ignore stop */
}

function selectedSpeciesOriginFeatUnitIds(
  selections: FinalizedCharacterSelections,
): readonly UnitRecord["id"][] {
  return uniqueValues(
    selections.choices.flatMap((selection) =>
      selection.kind === "unitChoice" &&
      selection.source.choiceKey === SPECIES_ORIGIN_FEAT_CHOICE_KEY
        ? selection.options.flatMap(
            (option) =>
              /* v8 ignore start -- Supported species Origin feat selections retain Unit references on every option. */
              option.unitRef == null ? [] : [option.unitRef.unitId],
            /* v8 ignore stop */
          )
        : [],
    ),
  );
}

function selectedSubclassFeatureGrantChoiceHoles(input: {
  readonly selections: FinalizedCharacterSelections;
  readonly classFactsByUnitId: ClassFactsByUnitId;
  readonly unitLibrary: UnitCatalog;
}): readonly UnitChoiceCreationHole[] {
  return [...input.classFactsByUnitId].flatMap(([classUnitId, facts]) => {
    const classLevel = classLevelForUnit(
      input.selections.progression,
      classUnitId,
    );
    const selectedSubclassIds = input.selections.choices.flatMap((choice) =>
      choice.kind === "unitChoice" &&
      choice.source.unitId === classUnitId &&
      choice.source.choiceKey === CLASS_SUBCLASS_CHOICE_KEY
        ? choice.options.flatMap(
            (option) =>
              /* v8 ignore start -- Supported subclass selections retain Unit references on every option. */
              option.unitRef == null ? [] : [option.unitRef.unitId],
            /* v8 ignore stop */
          )
        : [],
    );

    return selectedSubclassIds.flatMap((subclassId) => {
      const subclass = input.unitLibrary.getUnit(subclassId);
      /* v8 ignore start -- Support admission retains only an installed subclass owned by the selected class. */
      if (
        Option.isNone(subclass) ||
        subclass.value.kind !== "subclass" ||
        subclass.value.className !== facts.className
      ) {
        return [];
      }
      /* v8 ignore stop */

      return subclass.value.featureGrants
        .filter((grant) => grant.level <= classLevel)
        .flatMap((grant) =>
          classFeatureGrantChoiceHoles(grant.unitId, input.unitLibrary, {
            classLevel,
            ownedSkillProficiencies: selectedSkillProficiencies(
              input.selections,
              input.unitLibrary,
              (selection) =>
                selection.kind === "unitChoice" &&
                selection.source.unitId === grant.unitId &&
                selection.source.choiceKey ===
                  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
            ),
          }),
        )
        .flatMap((hole) => compact([requireUnitChoiceCreationHole(hole)]));
    });
  });
}

function multiclassProficiencyChoiceHoles(
  classUnitId: UnitRecord["id"],
  classFacts: ClassCreationFacts,
): readonly UnitChoiceCreationHole[] {
  const proficiency = classFacts.multiclassProficiencies;
  if (proficiency.kind === "choice") {
    return multiclassProficiencyChoiceHole(
      classUnitId,
      CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
      proficiency.count,
      proficiency.options,
    );
  }
  if (proficiency.kind === "mixed") {
    return multiclassProficiencyChoiceHole(
      classUnitId,
      proficiency.choice.choiceKey,
      proficiency.choice.count,
      proficiency.choice.options,
    );
  }
  if (proficiency.kind === "mixed_choices") {
    return proficiency.choices.flatMap((choice) =>
      multiclassProficiencyChoiceHole(
        classUnitId,
        choice.choiceKey,
        choice.count,
        choice.options,
      ),
    );
  }

  return [];
}

function multiclassProficiencyChoiceHole(
  classUnitId: UnitRecord["id"],
  choiceKeyText: string,
  count: number,
  subjects: readonly ProficiencyGrantSubject[],
): readonly UnitChoiceCreationHole[] {
  const choiceKey = unitChoiceKey(choiceKeyText);
  /* v8 ignore start -- Supported multiclass proficiency facts carry a canonical nonempty choice key. */
  if (Either.isLeft(choiceKey)) {
    return [];
  }
  /* v8 ignore stop */
  const options = subjects.flatMap(proficiencyGrantSubjectOptions);
  return compact([
    requireUnitChoiceCreationHole(
      choiceHole({
        source: unitSource(classUnitId, choiceKey.right),
        cardinality: exactChoiceCardinality(count),
        options,
      }),
    ),
  ]);
}

function selectedFeatAbilityScoreChoiceHoles(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): readonly UnitChoiceCreationHole[] {
  return unitChoiceSelections(selections).flatMap((selection) => {
    if (selection.source.choiceKey !== CLASS_FEATURE_FEAT_CHOICE_KEY) {
      return [];
    }

    return selection.options.flatMap((option) => {
      const featUnitId = option.unitRef?.unitId;
      if (featUnitId == null) return [];
      const unit = unitLibrary.getUnit(featUnitId);
      /* v8 ignore start -- Supported feat selections retain an installed feat Unit reference from this catalog. */
      if (Option.isNone(unit)) return [];
      /* v8 ignore stop */
      const options = selectedFeatAbilityScoreIncreaseOptions(unit.value);
      if (options.length === 0) return [];

      return compact([
        requireUnitChoiceCreationHole(
          choiceHole({
            source: unitSource(
              selection.source.unitId,
              CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
            ),
            cardinality: EXACTLY_ONE_CHOICE,
            options,
          }),
        ),
      ]);
    });
  });
}

function requireChoiceCreationHole(
  hole: CreationHole | undefined,
): ChoiceCreationHole | undefined {
  /* v8 ignore start -- Call sites construct a choice hole immediately before narrowing it with this helper. */
  if (hole?.kind !== "choice") {
    return undefined;
  }
  /* v8 ignore stop */

  return hole;
}

function isUnitChoiceCreationHole(
  hole: ChoiceCreationHole,
): hole is UnitChoiceCreationHole {
  return hole.source.tag === "unitChoice";
}

function requireUnitChoiceCreationHole(
  hole: CreationHole | undefined,
): UnitChoiceCreationHole | undefined {
  const choice = requireChoiceCreationHole(hole);
  /* v8 ignore start -- Call sites construct a Unit-sourced choice hole immediately before narrowing it. */
  if (choice === undefined || !isUnitChoiceCreationHole(choice)) {
    return undefined;
  }
  /* v8 ignore stop */

  return choice;
}

function isLoadoutCreationHole(
  hole: ChoiceCreationHole,
): hole is LoadoutCreationHole {
  return hole.source.tag === "loadout";
}

function requireLoadoutCreationHole(
  hole: CreationHole | undefined,
): LoadoutCreationHole | undefined {
  const choice = requireChoiceCreationHole(hole);
  /* v8 ignore start -- Call sites construct a loadout-sourced choice hole immediately before narrowing it. */
  if (choice === undefined || !isLoadoutCreationHole(choice)) {
    return undefined;
  }
  /* v8 ignore stop */

  return choice;
}

function compact<T>(values: readonly (T | undefined)[]): readonly T[] {
  return values.filter(isPresent);
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function supportedStartingEquipmentChoice(
  selection: Extract<CharacterChoiceSelection, { readonly kind: "unitChoice" }>,
  unitId: UnitRecord["id"],
  choiceKey:
    | typeof CLASS_EQUIPMENT_CHOICE_KEY
    | typeof BACKGROUND_EQUIPMENT_CHOICE_KEY,
  choices: readonly StartingEquipmentChoice[],
  supportProfile: CharacterCreationSupportProfile,
): boolean {
  /* v8 ignore start -- This support helper receives a selection already matched to the expected equipment owner and choice key. */
  if (
    selection.source.unitId !== unitId ||
    selection.source.choiceKey !== choiceKey
  ) {
    return false;
  }
  /* v8 ignore stop */

  const hole = startingEquipmentChoiceHole(
    unitSource(unitId, choiceKey),
    choices,
  );
  /* v8 ignore start -- Supported equipment choices produce a well-formed hole and the retained selection matches that exact roster. */
  if (hole === undefined) {
    return false;
  }
  if (!choiceSelectionMatchesHole(selection, hole, supportProfile)) {
    return false;
  }
  /* v8 ignore stop */

  return true;
}

function isSupportedEquipmentSelection(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): boolean {
  const supportedUnitIds = supportedPurchasableEquipmentUnitIdsForClass(
    startingClassUnitId(selections.progression),
    supportProfile,
  );
  if (!supportedEquipmentUnitIdsAreSupported(selections, supportedUnitIds)) {
    return false;
  }
  return isSupportedCoinEquipmentSelection(selections, unitLibrary);
}

function supportedEquipmentUnitIdsAreSupported(
  selections: FinalizedCharacterSelections,
  supportedUnitIds: readonly UnitRecord["id"][],
): boolean {
  return selections.equipment.selectedUnitIds.every((unitId) =>
    (supportedUnitIds as readonly string[]).includes(unitId),
  );
}

function isSupportedCoinEquipmentSelection(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): boolean {
  if (selections.equipment.selectedUnitIds.length === 0) return true;

  const startingClassId = startingClassUnitId(selections.progression);
  const classUnit = unitLibrary.getUnit(startingClassId);
  const backgroundUnit = unitLibrary.getUnit(selections.background);
  if (Option.isNone(classUnit) || Option.isNone(backgroundUnit)) return false;
  const classFacts = readClassCreationFacts(classUnit.value);
  const backgroundFacts = readBackgroundCreationFacts(backgroundUnit.value);
  if (classFacts.tag !== "readable" || backgroundFacts.tag !== "readable") {
    return false;
  }
  const classChoice = selectedStartingEquipmentForBuild(
    selections,
    startingClassId,
    CLASS_EQUIPMENT_CHOICE_KEY,
    classFacts.value.startingEquipment,
  );
  const backgroundChoice = selectedStartingEquipmentForBuild(
    selections,
    selections.background,
    BACKGROUND_EQUIPMENT_CHOICE_KEY,
    backgroundFacts.value.startingEquipment,
  );
  return isCoinGrantStartingEquipmentChoices(classChoice, backgroundChoice);
}

function isCoinGrantStartingEquipmentChoices(
  classChoice: StartingEquipmentChoice | undefined,
  backgroundChoice: StartingEquipmentChoice | undefined,
): boolean {
  return (
    classChoice?.kind === "coin_grant" &&
    backgroundChoice?.kind === "coin_grant"
  );
}

export function characterBuildUnitRefs(
  build: Pick<
    CharacterBuild,
    | "progression"
    | "background"
    | "species"
    | "features"
    | "equipment"
    | "spellcasting"
    | "magicInitiateSpellAccesses"
  >,
  unitLibrary?: UnitCatalog,
): readonly UnitRef[] {
  const derivedFeatureUnitIds =
    unitLibrary === undefined
      ? []
      : characterBuildDerivedFeatureUnitIds(build, unitLibrary);
  const selectedSubclassFeatureUnitIds =
    unitLibrary === undefined
      ? []
      : characterBuildSelectedSubclassFeatureUnitIds(build, unitLibrary);
  return uniqueUnitRefs([
    ...unitRefs(
      ...progressionClassUnitIds(build.progression),
      build.background,
      build.species,
      ...derivedFeatureUnitIds,
      ...selectedSubclassFeatureUnitIds,
    ),
    ...build.features.flatMap((feature) =>
      feature.kind === "selectedClassChoice"
        ? [unitRefForSelectedClassChoice(feature)]
        : [],
    ),
    ...unitRefs(
      ...build.equipment.owned.flatMap((item) =>
        item.kind === "catalogItem" || item.kind === "authoredCatalogItem"
          ? [characterEquipmentItemSourceFromId(item.itemId).unitId]
          : [],
      ),
      ...(build.spellcasting?.sources.flatMap((source) => [
        source.sourceUnitId,
        ...source.cantrips,
        ...source.spellbook,
        ...source.preparedSpells,
        ...(source.bookOfShadows === undefined
          ? []
          : [
              ...source.bookOfShadows.cantrips,
              ...source.bookOfShadows.ritualSpells,
            ]),
      ]) ?? []),
      ...build.magicInitiateSpellAccesses.flatMap((access) => [
        access.featUnitId,
        ...access.cantrips,
        access.levelOneSpell,
      ]),
    ),
  ]);
}

function unitRefForSelectedClassChoice(
  feature: Extract<
    CharacterBuildFeature,
    { readonly kind: "selectedClassChoice" }
  >,
): UnitRef {
  return {
    unitId: feature.unitId,
    ...(feature.selectedOption === undefined
      ? {}
      : { selectedOption: feature.selectedOption }),
  };
}

function huntersPreySelectedOption(
  optionId: CreationChoiceOptionId | undefined,
): UnitRefSelectedOption | undefined {
  // authored-id-dispatch-allow: character-creation-selected-choice-runtime-projection-boundary
  if (optionId === "colossus_slayer") {
    return { kind: "huntersPrey", selection: "woundedTargetWeaponDamage" };
  }
  // authored-id-dispatch-allow: character-creation-selected-choice-runtime-projection-boundary
  if (optionId === "horde_breaker") {
    return {
      kind: "huntersPrey",
      selection: "nearbyDifferentTargetSameWeaponAttack",
    };
    /* v8 ignore start -- Support admission retains a Hunter's Prey selection only from the feature's closed two-option roster. */
  }
  return undefined;
}
/* v8 ignore stop */

function characterBuildDerivedFeatureUnitIds(
  build: Pick<CharacterBuild, "progression" | "background" | "species">,
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  return [
    ...progressionClassUnitIds(build.progression).flatMap((classUnitId) => {
      const unit = unitLibrary.getUnit(classUnitId);
      if (Option.isNone(unit)) return [];
      const facts = readClassCreationFacts(unit.value);
      if (facts.tag !== "readable") return [];
      return facts.value.featureGrants
        .filter(
          (grant) =>
            grant.level <= classLevelForUnit(build.progression, classUnitId),
        )
        .map((grant) => grant.unitId);
    }),
    ...backgroundOriginFeatUnitIds(build, unitLibrary),
    ...speciesTraitUnitIds(build, unitLibrary),
  ];
}

function characterBuildSelectedSubclassFeatureUnitIds(
  build: Pick<CharacterBuild, "progression" | "features">,
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  return build.features.flatMap((feature) => {
    if (feature.kind !== "selectedClassChoice") return [];
    const unit = unitLibrary.getUnit(feature.unitId);
    if (Option.isNone(unit) || unit.value.kind !== "subclass") return [];
    const subclassUnit = unit.value;
    const classLevel = progressionClassUnitIds(build.progression).reduce(
      (level, classUnitId) => {
        const classUnit = unitLibrary.getUnit(classUnitId);
        if (
          Option.isSome(classUnit) &&
          classUnit.value.kind === "class" &&
          classUnit.value.className === subclassUnit.className
        ) {
          return classLevelForUnit(build.progression, classUnitId);
        }
        return level;
      },
      0,
    );
    return subclassUnit.featureGrants
      .filter((grant) => grant.level <= classLevel)
      .map((grant) => grant.unitId);
  });
}

function backgroundOriginFeatUnitIds(
  build: Pick<CharacterBuild, "background">,
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  const unit = unitLibrary.getUnit(build.background);
  if (Option.isNone(unit)) return [];
  const facts = readBackgroundCreationFacts(unit.value);
  return facts.tag === "readable" ? [facts.value.originFeatId] : [];
}

function speciesTraitUnitIds(
  build: Pick<CharacterBuild, "species">,
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  const unit = unitLibrary.getUnit(build.species);
  if (Option.isNone(unit)) return [];
  const facts = readSpeciesCreationFacts(unit.value);
  return facts.tag === "readable"
    ? Object.values(facts.value.traits).map(authoredUnitId)
    : [];
}

function speciesTraitUnitIdsForHitPointProjection(
  build: Pick<CharacterBuild, "species">,
  unitLibrary: UnitCatalog,
): Either.Either<readonly UnitRecord["id"][], CharacterBuildProjectionIssue> {
  const speciesUnit = unitForFinalization(
    unitLibrary,
    build.species,
    "species",
  );
  if (Either.isLeft(speciesUnit)) return Either.left(speciesUnit.left);
  const speciesFacts = readableForFinalization(
    readSpeciesCreationFacts(speciesUnit.right),
    build.species,
    "species",
  );
  if (Either.isLeft(speciesFacts)) return Either.left(speciesFacts.left);
  return Either.right(
    Object.values(speciesFacts.right.traits).map(authoredUnitId),
  );
}

export function finalizedClassChoiceFeatures(
  selections: FinalizedCharacterSelections,
): readonly CharacterBuildFeature[] {
  return finalizedClassChoiceFeaturesForSupportedChoices(
    unitChoiceSelections(selections),
  );
}

function finalizedClassChoiceFeaturesForSupportedChoices(
  unitChoices: readonly UnitChoiceSelection[],
): readonly CharacterBuildFeature[] {
  return unitChoices.flatMap((selection): readonly CharacterBuildFeature[] => {
    if (selection.source.choiceKey === ELDRITCH_INVOCATIONS_CHOICE_KEY) {
      return selectedEldritchInvocationFeatures({
        selectedFromUnitId: selection.source.unitId,
        optionIds: selection.options.map((option) => option.optionId),
      });
    }

    if (selection.source.choiceKey === SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY) {
      return selectedSorcererMetamagicOptionFeatures({
        selectedFromUnitId: selection.source.unitId,
        optionIds: selection.options.map((option) => option.optionId),
      });
    }

    const selectedOption =
      selection.source.choiceKey === HUNTERS_PREY_CHOICE_KEY
        ? huntersPreySelectedOption(selection.options[0]?.optionId)
        : undefined;
    return unitRefsForSupportedSelectedUnitChoice(
      selection.source,
      selection.options,
    ).map((unitId) => ({
      kind: "selectedClassChoice" as const,
      unitId,
      selectedFromUnitId: selection.source.unitId,
      ...(selectedOption === undefined ? {} : { selectedOption }),
    }));
  });
}

function selectedSorcererMetamagicOptionFeatures(input: {
  readonly selectedFromUnitId: UnitRecord["id"];
  readonly optionIds: readonly CreationChoiceOptionId[];
}): readonly CharacterBuildFeature[] {
  return input.optionIds.flatMap((optionId) => {
    const parsed = sorcererMetamagicOptionId(optionId);
    return Either.isRight(parsed)
      ? [
          {
            kind: "selectedSorcererMetamagicOption" as const,
            selectedFromUnitId: input.selectedFromUnitId,
            optionId: parsed.right,
          },
        ]
      : [];
  });
}

function finalizedClassFeatureAcquisitionAbilityCheckBonusFeatures(
  unitChoices: readonly UnitChoiceSelection[],
  unitLibrary: UnitCatalog,
): Either.Either<readonly CharacterBuildFeature[], ProjectionIssues> {
  const features: CharacterBuildFeature[] = [];
  const issues: CharacterBuildProjectionIssue[] = [];
  for (const selection of unitChoices) {
    const mechanics = classFeatureAcquisitionChoiceMechanicsForSelection(
      selection,
      unitLibrary,
    );
    if (mechanics === undefined) {
      continue;
    }

    const optionIds = new Set(choiceSelectionOptionIds(selection));
    for (const option of mechanics.options) {
      if (!optionIds.has(creationChoiceOptionId(option.id))) {
        continue;
      }

      for (const grant of option.mechanics.grants) {
        if (grant.kind !== "modify_roll_numeric") {
          continue;
        }

        const projected = classFeatureAcquisitionAbilityCheckBonusFeature(
          selection.source.unitId,
          grant,
        );
        /* v8 ignore start -- Support admission retains only acquisition grants whose typed shape projects an ability-check bonus. */
        if (projected === undefined) {
          issues.push(
            characterBuildProjectionIssue({
              tag: "unprojectableAbilityCheckBonus",
              featureUnitId: selection.source.unitId,
              optionId: option.id,
            }),
          );
          continue;
        }
        /* v8 ignore stop */
        features.push(projected);
      }
    }
  }

  const collectedIssues = nonEmptyReadonlyArray(issues);
  /* v8 ignore start -- Support admission retains only acquisition grants that project a supported ability-check bonus. */
  return collectedIssues == null
    ? Either.right(features)
    : Either.left(collectedIssues);
  /* v8 ignore stop */
}

function classFeatureAcquisitionAbilityCheckBonusFeature(
  selectedFromUnitId: UnitRecord["id"],
  grant: ModifyRollNumericGrant,
): CharacterBuildFeature | undefined {
  const abilityFilter = fixedModifyRollAbilityFilter(grant.abilityFilter);
  /* v8 ignore start -- Support admission retains only the fixed single-ability ability-check bonus grant shape projected below. */
  if (
    grant.on.length !== 1 ||
    grant.on[0] !== "ability_check" ||
    grant.delta.kind !== "ability_modifier" ||
    grant.delta.sign !== "+" ||
    grant.delta.minimum === undefined ||
    grant.skillFilter?.kind !== "fixed" ||
    abilityFilter?.length !== 1 ||
    grant.count !== undefined
  ) {
    return undefined;
  }
  /* v8 ignore stop */

  return {
    kind: "abilityCheckBonus",
    selectedFromUnitId,
    ability: abilityFilter[0],
    skills: grant.skillFilter.skills,
    bonus: {
      kind: "abilityModifier",
      ability: grant.delta.ability,
      minimum: grant.delta.minimum,
    },
  };
}

function fixedModifyRollAbilityFilter(
  abilityFilter: ModifyRollNumericGrant["abilityFilter"],
): FixedModifyRollAbilityFilter | undefined {
  /* v8 ignore start -- Supported acquisition ability-check bonuses carry the fixed ability-array form. */
  return abilityFilter === undefined || "kind" in abilityFilter
    ? undefined
    : abilityFilter;
  /* v8 ignore stop */
}

// KERNEL-COVERAGE: runtime-owner CREATION.EQUIPMENT.STARTING_CURRENCY_FINALIZATION
export function finalizedBuildEquipment(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterBuildEquipment, ProjectionIssues> {
  return finalizedBuildEquipmentForSupportedLoadoutChoices(
    selections,
    loadoutChoiceSelections(selections),
    unitLibrary,
    CHARACTER_CREATION_SUPPORT_PROFILE,
  );
}

function finalizedBuildEquipmentForSupportedLoadoutChoices(
  selections: FinalizedCharacterSelections,
  loadoutChoices: readonly LoadoutChoiceSelection[],
  unitLibrary: UnitCatalog,
  supportProfile: CharacterCreationSupportProfile,
): Either.Either<CharacterBuildEquipment, ProjectionIssues> {
  const loadout = loadoutChoices.reduce<CharacterBuildLoadout>(
    (equipment, selection) => {
      const loadoutChoice = supportedLoadoutChoiceForSource(
        selection.source,
        supportProfile,
      );
      const selectedUnitId = selectedUnitIdForLoadoutChoice(
        selection,
        loadoutChoice,
      );
      /* v8 ignore start -- Supported loadout selections retain a matched loadout choice and its selected equipment Unit id. */
      if (loadoutChoice == null || selectedUnitId == null) {
        return equipment;
      }
      /* v8 ignore stop */

      if (loadoutChoice.buildSlot === "armor") {
        return {
          ...equipment,
          armor: characterEquipmentItemId({
            slot: "armor",
            unitId:
              characterEquipmentItemUnitIdFromLoadoutEquipmentUnitId(
                selectedUnitId,
              ),
          }),
        };
      }

      if (loadoutChoice.buildSlot === "shield") {
        return {
          ...equipment,
          shield: characterEquipmentItemId({
            slot: "shield",
            unitId:
              characterEquipmentItemUnitIdFromLoadoutEquipmentUnitId(
                selectedUnitId,
              ),
          }),
        };
      }

      const itemId = characterEquipmentItemId({
        slot: "main",
        unitId:
          characterEquipmentItemUnitIdFromLoadoutEquipmentUnitId(
            selectedUnitId,
          ),
      });
      return {
        ...equipment,
        weapon: { itemId, grip: loadoutChoice.grip },
      };
    },
    {},
  );
  const purchased = traverseValidation(
    selections.equipment.selectedUnitIds,
    (unitId) => {
      const itemUnitId = characterEquipmentItemUnitId(unitId);
      const unit = unitLibrary.getUnit(unitId);
      /* v8 ignore start -- Supported equipment selections retain only ids accepted by the equipment-item id constructor. */
      if (Either.isLeft(itemUnitId) || Option.isNone(unit)) {
        return Either.left(
          characterBuildProjectionIssue({
            tag: "unsupportedEquipmentUnitId",
            equipmentUnitId: unitId,
          }),
        );
      }
      if (
        unit.value.kind !== "armor" &&
        unit.value.kind !== "shield" &&
        unit.value.kind !== "weapon"
      ) {
        return Either.left(
          characterBuildProjectionIssue({
            tag: "unsupportedEquipmentUnitId",
            equipmentUnitId: unitId,
          }),
        );
      }
      const costCopperPieces = goldPieceValueInCopperPieces(unit.value.costGp);
      return Option.isNone(costCopperPieces)
        ? Either.left(
            characterBuildProjectionIssue({
              tag: "unsupportedEquipmentCost",
              equipmentUnitId: unitId,
              costGp: unit.value.costGp,
            }),
          )
        : Either.right({
            costCopperPieces: costCopperPieces.value,
            item: {
              kind: "catalogItem",
              itemId: characterEquipmentItemId({
                slot: ownedEquipmentDefaultSlot(unitLibrary, unitId),
                unitId: itemUnitId.right,
              }),
              quantity: PositiveInteger(1),
            } satisfies CharacterBuildOwnedEquipmentItem,
          });
      /* v8 ignore stop */
    },
  );
  /* v8 ignore start -- Supported equipment selections retain only ids accepted by the item-id projection above. */
  if (Either.isLeft(purchased)) {
    return Either.left(purchased.left);
  }
  /* v8 ignore stop */

  const starting = finalizedStartingEquipment(selections, unitLibrary);
  if (Either.isLeft(starting)) {
    return Either.left(starting.left);
  }

  const availableCopperPieces = starting.right.currencyCopperPieces;
  const purchaseCostComponents = purchased.right.map(
    ({ costCopperPieces }) => costCopperPieces,
  );
  const purchaseCostCopperPieces = sumCopperPieceAmounts(
    purchaseCostComponents,
  );
  if (Option.isNone(purchaseCostCopperPieces)) {
    return Either.left([
      characterBuildProjectionIssue({
        tag: "currencySumOutsideCopperPieceAmountRange",
        source: "selectedEquipmentPurchases",
        components: purchaseCostComponents,
      }),
    ]);
  }
  if (purchaseCostCopperPieces.value > availableCopperPieces) {
    return Either.left([
      characterBuildProjectionIssue({
        tag: "startingCurrencyInsufficientForEquipmentPurchases",
        availableCp: availableCopperPieces,
        purchaseCostCp: purchaseCostCopperPieces.value,
      }),
    ]);
  }

  return Either.right({
    startingEquipmentCurrencyRemainderCp: copperPieceAmount(
      availableCopperPieces - purchaseCostCopperPieces.value,
    ),
    owned: combineCatalogEquipment([
      ...purchased.right.map(({ item }) => item),
      ...starting.right.items,
    ]),
    loadout,
  });
}

function goldPieceValueInCopperPieces(
  gp: number,
): Option.Option<CopperPieceAmount> {
  if (!Number.isFinite(gp) || gp < 0 || Number(gp.toFixed(2)) !== gp) {
    return Option.none();
  }
  const copperPieceValue = gp * 100;
  const roundedCopperPieceValue = Math.round(copperPieceValue);
  return isCopperPieceAmount(roundedCopperPieceValue)
    ? Option.some(copperPieceAmount(roundedCopperPieceValue))
    : Option.none();
}

function sumCopperPieceAmounts(
  components: readonly CopperPieceAmount[],
): Option.Option<CopperPieceAmount> {
  const total = components.reduce((sum, component) => sum + component, 0);
  return isCopperPieceAmount(total)
    ? Option.some(copperPieceAmount(total))
    : Option.none();
}

function startingCurrencyCopperPieces(
  choices: readonly {
    readonly sourceUnitId: UnitRecord["id"];
    readonly choice: StartingEquipmentChoice | undefined;
  }[],
): Either.Either<CopperPieceAmount, ProjectionIssues> {
  const amounts = traverseValidation(choices, ({ sourceUnitId, choice }) => {
    const coinsGp = choice?.coinsGp ?? 0;
    const amount = goldPieceValueInCopperPieces(coinsGp);
    return Option.isNone(amount)
      ? Either.left(
          characterBuildProjectionIssue({
            tag: "unsupportedStartingCurrency",
            sourceUnitId,
            coinsGp,
          }),
        )
      : Either.right(amount.value);
  });
  if (Either.isLeft(amounts)) {
    return Either.left(amounts.left);
  }
  const total = sumCopperPieceAmounts(amounts.right);
  return Option.isSome(total)
    ? Either.right(total.value)
    : Either.left([
        characterBuildProjectionIssue({
          tag: "currencySumOutsideCopperPieceAmountRange",
          source: "startingEquipmentGrants",
          components: amounts.right,
        }),
      ]);
}

function finalizedStartingEquipment(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): Either.Either<
  {
    readonly items: readonly CharacterBuildOwnedEquipmentItem[];
    readonly currencyCopperPieces: CopperPieceAmount;
  },
  ProjectionIssues
> {
  const startingClassId = startingClassUnitId(selections.progression);
  const choices = startingEquipmentChoicesForBuild(
    selections,
    unitLibrary,
    startingClassId,
  );
  if (Either.isLeft(choices)) return Either.left(choices.left);
  const currencyCopperPieces = startingCurrencyCopperPieces(choices.right);
  if (Either.isLeft(currencyCopperPieces)) {
    return Either.left(currencyCopperPieces.left);
  }
  const selectedToolIds = selectedBackgroundToolProficiencies(selections);
  const items = choices.right.flatMap(({ choice }) =>
    choice?.kind === "item_bundle" ? choice.items : [],
  );
  const projected = traverseValidation(items, (item) =>
    Match.value(item).pipe(
      Match.when({ kind: "unit_ref" }, (unitRef) => {
        const unitId = authoredUnitId(unitRef.unitId);
        const itemUnitId = characterEquipmentItemUnitId(unitId);
        return Either.isLeft(itemUnitId)
          ? Either.left(
              characterBuildProjectionIssue({
                tag: "unsupportedEquipmentUnitId",
                equipmentUnitId: unitId,
              }),
            )
          : Either.right<CharacterBuildOwnedEquipmentItem[]>([
              {
                kind: "catalogItem",
                itemId: characterEquipmentItemId({
                  slot: ownedEquipmentDefaultSlot(unitLibrary, unitId),
                  unitId: itemUnitId.right,
                }),
                quantity: PositiveInteger(unitRef.quantity ?? 1),
              },
            ]);
      }),
      Match.when(
        { kind: "unit_ref_with_spellcasting_focus" },
        (authoredCatalogItem) => {
          const unitId = authoredUnitId(authoredCatalogItem.unitId);
          const itemUnitId = characterEquipmentItemUnitId(unitId);
          return Either.isLeft(itemUnitId)
            ? Either.left(
                characterBuildProjectionIssue({
                  tag: "unsupportedEquipmentUnitId",
                  equipmentUnitId: unitId,
                }),
              )
            : Either.right<CharacterBuildOwnedEquipmentItem[]>([
                {
                  kind: "authoredCatalogItem",
                  itemId: characterEquipmentItemId({
                    slot: ownedEquipmentDefaultSlot(unitLibrary, unitId),
                    unitId: itemUnitId.right,
                  }),
                  authoredItemId: authoredCatalogItem.authoredItemId,
                  spellcastingFocusKind:
                    authoredCatalogItem.spellcastingFocusKind,
                  quantity: PositiveInteger(authoredCatalogItem.quantity ?? 1),
                },
              ]);
        },
      ),
      Match.when({ kind: "draft_owned_item" }, (authoredItem) =>
        Either.right<CharacterBuildOwnedEquipmentItem[]>([
          {
            kind: "authoredStartingItem",
            itemName: authoredItem.itemName,
            quantity: PositiveInteger(authoredItem.quantity ?? 1),
          },
        ]),
      ),
      Match.when({ kind: "selected_tool_proficiency" }, () =>
        Either.right<CharacterBuildOwnedEquipmentItem[]>(
          selectedToolIds.map((toolProficiencyId) => ({
            kind: "selectedToolItem",
            toolProficiencyId,
            quantity: PositiveInteger(1),
          })),
        ),
      ),
      Match.exhaustive,
    ),
  );
  return Either.isLeft(projected)
    ? Either.left(projected.left)
    : Either.right({
        items: projected.right.flat(),
        currencyCopperPieces: currencyCopperPieces.right,
      });
}

type StartingEquipmentChoiceForBuild = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly choice: StartingEquipmentChoice | undefined;
};

function startingEquipmentChoiceForBuild(input: {
  readonly selections: FinalizedCharacterSelections;
  readonly unitLibrary: UnitCatalog;
  readonly sourceUnitId: UnitRecord["id"];
  readonly lookupRole: CreationFinalizationLookupUnitRole;
  readonly readableRole: CreationFinalizationReadableUnitRole;
  readonly choiceKey:
    | typeof CLASS_EQUIPMENT_CHOICE_KEY
    | typeof BACKGROUND_EQUIPMENT_CHOICE_KEY;
  readonly readFacts: (unit: UnitRecord) => UnitReaderResult<{
    readonly startingEquipment: readonly StartingEquipmentChoice[];
  }>;
}): Either.Either<
  StartingEquipmentChoiceForBuild,
  CharacterBuildProjectionIssue
> {
  const unit = unitForFinalization(
    input.unitLibrary,
    input.sourceUnitId,
    input.lookupRole,
  );
  if (Either.isLeft(unit)) return Either.left(unit.left);
  const facts = readableForFinalization(
    input.readFacts(unit.right),
    input.sourceUnitId,
    input.readableRole,
  );
  return Either.map(facts, ({ startingEquipment }) => ({
    sourceUnitId: input.sourceUnitId,
    choice: selectedStartingEquipmentForBuild(
      input.selections,
      input.sourceUnitId,
      input.choiceKey,
      startingEquipment,
    ),
  }));
}

function startingEquipmentChoicesForBuild(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
  startingClassId: UnitRecord["id"],
): Either.Either<
  readonly [StartingEquipmentChoiceForBuild, StartingEquipmentChoiceForBuild],
  ProjectionIssues
> {
  const classChoice = startingEquipmentChoiceForBuild({
    selections,
    unitLibrary,
    sourceUnitId: startingClassId,
    lookupRole: "class",
    readableRole: "class",
    choiceKey: CLASS_EQUIPMENT_CHOICE_KEY,
    readFacts: readClassCreationFacts,
  });
  const backgroundChoice = startingEquipmentChoiceForBuild({
    selections,
    unitLibrary,
    sourceUnitId: selections.background,
    lookupRole: "background",
    readableRole: "background",
    choiceKey: BACKGROUND_EQUIPMENT_CHOICE_KEY,
    readFacts: readBackgroundCreationFacts,
  });
  if (Either.isLeft(classChoice) && Either.isLeft(backgroundChoice)) {
    return Either.left([classChoice.left, backgroundChoice.left]);
  }
  if (Either.isLeft(classChoice)) return Either.left([classChoice.left]);
  if (Either.isLeft(backgroundChoice)) {
    return Either.left([backgroundChoice.left]);
  }
  return Either.right([classChoice.right, backgroundChoice.right]);
}

function selectedStartingEquipmentForBuild(
  selections: FinalizedCharacterSelections,
  unitId: UnitRecord["id"],
  choiceKey:
    | typeof CLASS_EQUIPMENT_CHOICE_KEY
    | typeof BACKGROUND_EQUIPMENT_CHOICE_KEY,
  choices: readonly StartingEquipmentChoice[],
): StartingEquipmentChoice | undefined {
  const selection = selections.choices.find(
    (candidate) =>
      candidate.kind === "unitChoice" &&
      candidate.source.unitId === unitId &&
      candidate.source.choiceKey === choiceKey,
  );
  const optionId = selection?.options[0]?.optionId;
  return choices.find((choice) => choice.id === optionId);
}

function combineCatalogEquipment(
  items: readonly CharacterBuildOwnedEquipmentItem[],
): readonly CharacterBuildOwnedEquipmentItem[] {
  const combined: CharacterBuildOwnedEquipmentItem[] = [];
  for (const item of items) {
    if (item.kind !== "catalogItem") {
      combined.push(item);
      continue;
    }
    const priorIndex = combined.findIndex(
      (candidate) =>
        candidate.kind === "catalogItem" && candidate.itemId === item.itemId,
    );
    const prior = combined[priorIndex];
    if (prior?.kind !== "catalogItem") {
      combined.push(item);
      continue;
    }
    combined[priorIndex] = {
      ...prior,
      quantity: PositiveInteger(prior.quantity + item.quantity),
    };
  }
  return combined;
}

type FinalizedSpellcastingSourceProjection = {
  readonly source: CharacterBuildSpellcastingSource;
  readonly spellcastingSlotPool?: CharacterBuildSpellcastingSlotPool;
  readonly pactMagicSlotPool?: CharacterBuildPactMagicSlotPool;
};

export function finalizedBuildSpellcasting(input: {
  readonly classFactsByUnitId: ClassFactsByUnitId;
  readonly selections: FinalizedCharacterSelections;
  readonly supportedSelections: ExecutableSupportSelections;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterBuildSpellcasting | undefined, FinalizationIssues> {
  const startingUnitId = startingClassUnitId(input.selections.progression);
  const projections = [...input.classFactsByUnitId].flatMap(
    ([classUnitId, classFacts]) => {
      const projection = finalizedBuildSpellcastingSource({
        classUnitId,
        classFacts,
        classLevel: classLevelForUnit(
          input.selections.progression,
          classUnitId,
        ),
        includeEmptySource: classUnitId === startingUnitId,
        selections: input.selections,
        supportedSelections: input.supportedSelections,
        unitLibrary: input.unitLibrary,
      });
      return projection === undefined ? [] : [projection];
    },
  );
  const sources = nonEmptyReadonlyArray(
    projections.map((projection) => projection.source),
  );
  if (sources === undefined) {
    return Either.right(undefined);
  }

  const spellcastingSlotPool = singleSpellcastingSlotPool(projections);
  /* v8 ignore start -- Support admission rejects incompatible duplicate ordinary or Pact Magic pool projections. */
  if (Either.isLeft(spellcastingSlotPool)) {
    return Either.left([spellcastingSlotPool.left]);
  }
  const pactMagicSlotPool = singlePactMagicSlotPool(projections);
  if (Either.isLeft(pactMagicSlotPool)) {
    return Either.left([pactMagicSlotPool.left]);
  }
  /* v8 ignore stop */

  return Either.right({
    sources,
    slotPools: {
      ...(spellcastingSlotPool.right === undefined
        ? {}
        : { spellcasting: spellcastingSlotPool.right }),
      ...(pactMagicSlotPool.right === undefined
        ? {}
        : { pactMagic: pactMagicSlotPool.right }),
    },
  });
}

function finalizedBuildSpellcastingSource(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly classFacts: ClassCreationFacts;
  readonly classLevel: number;
  readonly includeEmptySource: boolean;
  readonly selections: FinalizedCharacterSelections;
  readonly supportedSelections: ExecutableSupportSelections;
  readonly unitLibrary: UnitCatalog;
}): FinalizedSpellcastingSourceProjection | undefined {
  const { classUnitId, classFacts, classLevel, supportedSelections } = input;
  const spellcasting = classSpellcastingCreation(classFacts, classLevel);
  if (spellcasting == null) {
    return undefined;
  }

  if (isListPreparedSpellcastingCreation(spellcasting)) {
    const cantrips = [
      ...(spellcasting.cantripAccess == null
        ? []
        : selectedUnitRefsForChoiceSource(
            supportedSelections.unitChoices,
            unitSource(classUnitId, CLASS_CANTRIP_CHOICE_KEY),
          )),
      ...selectedClassFeatureAcquisitionCantripUnitRefs(input),
    ];
    const preparedSpells = selectedUnitRefsForChoiceSource(
      supportedSelections.unitChoices,
      unitSource(classUnitId, CLASS_PREPARED_SPELL_CHOICE_KEY),
    );
    if (
      !input.includeEmptySource &&
      cantrips.length === 0 &&
      preparedSpells.length === 0
    ) {
      return undefined;
    }

    return {
      source: {
        sourceUnitId: classUnitId,
        spellcastingAbility: spellcasting.spellcastingAbility,
        cantrips,
        spellbook: [],
        preparedSpells,
        spellcastingFocuses: [spellcasting.spellcastingFocus],
      },
      spellcastingSlotPool: {
        kind: "spellcasting",
        slots: spellcasting.spellSlotProjection.slots,
      },
    };
  }

  if (isPactMagicSpellcastingCreation(spellcasting)) {
    const cantrips = selectedUnitRefsForChoiceSource(
      supportedSelections.unitChoices,
      unitSource(classUnitId, CLASS_CANTRIP_CHOICE_KEY),
    );
    const preparedSpells = selectedUnitRefsForChoiceSource(
      supportedSelections.unitChoices,
      unitSource(classUnitId, CLASS_PREPARED_SPELL_CHOICE_KEY),
    );
    if (
      !input.includeEmptySource &&
      cantrips.length === 0 &&
      preparedSpells.length === 0
    ) {
      return undefined;
    }

    return {
      source: {
        sourceUnitId: classUnitId,
        spellcastingAbility: spellcasting.spellcastingAbility,
        cantrips,
        spellbook: [],
        preparedSpells,
        spellcastingFocuses: [spellcasting.spellcastingFocus],
      },
      pactMagicSlotPool: {
        kind: "pactMagic",
        slotLevel: spellcasting.pactSlotProjection.spellLevel,
        count: spellcasting.pactSlotProjection.count,
      },
    };
  }

  if (!isWizardSpellcastingCreation(spellcasting)) {
    return undefined;
  }

  const cantrips = selectedUnitRefsForChoiceSource(
    supportedSelections.unitChoices,
    unitSource(classUnitId, WIZARD_CANTRIP_CHOICE_KEY),
  );
  const spellbook = selectedUnitRefsForChoiceSource(
    supportedSelections.unitChoices,
    unitSource(classUnitId, WIZARD_SPELLBOOK_CHOICE_KEY),
  );
  const featureSpellbook = selectedWizardSpellbookUnitRefs(
    supportedSelections.unitChoices,
  ).filter((spellId) => !spellbook.includes(spellId));
  const preparedSpells = selectedUnitRefsForChoiceSource(
    supportedSelections.unitChoices,
    unitSource(classUnitId, WIZARD_PREPARED_SPELL_CHOICE_KEY),
  );
  if (
    !input.includeEmptySource &&
    cantrips.length === 0 &&
    spellbook.length === 0 &&
    preparedSpells.length === 0
  ) {
    return undefined;
  }

  return {
    source: {
      sourceUnitId: classUnitId,
      spellcastingAbility: spellcasting.spellcastingAbility,
      cantrips,
      spellbook: [...spellbook, ...featureSpellbook],
      preparedSpells,
      spellcastingFocuses: spellcasting.spellcastingFocuses,
    },
    spellcastingSlotPool: {
      kind: "spellcasting",
      slots: spellcasting.spellSlotProjection.slots,
    },
  };
}

function selectedClassFeatureAcquisitionCantripUnitRefs(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly classFacts: ClassCreationFacts;
  readonly classLevel: number;
  readonly selections: FinalizedCharacterSelections;
  readonly supportedSelections: ExecutableSupportSelections;
  readonly unitLibrary: UnitCatalog;
}): readonly UnitRecord["id"][] {
  return selectedClassFeatureAcquisitionGrantChoiceHoles({
    choices: input.selections.choices,
    classUnitId: input.classUnitId,
    classFacts: input.classFacts,
    classLevel: input.classLevel,
    unitLibrary: input.unitLibrary,
  }).flatMap((hole) => {
    const unitHole = requireUnitChoiceCreationHole(hole);
    return unitHole === undefined ||
      unitHole.source.choiceKey !== CLASS_CANTRIP_CHOICE_KEY
      ? []
      : selectedUnitRefsForChoiceSource(
          input.supportedSelections.unitChoices,
          unitHole.source,
        );
  });
}

function singleSpellcastingSlotPool(
  projections: readonly FinalizedSpellcastingSourceProjection[],
): Either.Either<
  CharacterBuildSpellcastingSlotPool | undefined,
  CreationFinalizationIssue
> {
  const pools = projections.flatMap((projection) =>
    projection.spellcastingSlotPool === undefined
      ? []
      : [projection.spellcastingSlotPool],
  );
  const first = pools[0];
  if (first === undefined) {
    return Either.right(undefined);
  }
  if (pools.length === 1) {
    return Either.right(first);
    /* v8 ignore start -- Support admission rejects a second ordinary spell-slot pool before finalization. */
  }
  return Either.left(
    illegalFinalizationIssue({ tag: "multipleSpellcastingSlotPools" }),
  );
}
/* v8 ignore stop */

function singlePactMagicSlotPool(
  projections: readonly FinalizedSpellcastingSourceProjection[],
): Either.Either<
  CharacterBuildPactMagicSlotPool | undefined,
  CreationFinalizationIssue
> {
  const pools = projections.flatMap((projection) =>
    projection.pactMagicSlotPool === undefined
      ? []
      : [projection.pactMagicSlotPool],
  );
  const first = pools[0];
  if (first === undefined) {
    return Either.right(undefined);
  }
  if (pools.length === 1) {
    return Either.right(first);
    /* v8 ignore start -- Support admission rejects a second Pact Magic slot pool before finalization. */
  }
  return Either.left(
    illegalFinalizationIssue({ tag: "multiplePactMagicSlotPools" }),
  );
}
/* v8 ignore stop */

function ownedEquipmentDefaultSlot(
  unitLibrary: UnitCatalog,
  unitId: UnitRecord["id"],
): CharacterEquipmentItemSlot {
  const unit = unitLibrary.getUnit(unitId);
  if (Option.isSome(unit)) {
    if (unit.value.kind === "armor") return "armor";
    if (unit.value.kind === "shield") return "shield";
  }

  return "main";
}

function isWizardClassCreationFacts(
  facts: ClassCreationFacts,
): facts is WizardClassCreationFacts {
  return facts.className === "wizard";
}

function classSpellcastingCreation(
  facts: ClassCreationFacts,
  classLevel: number,
): ReadableClassSpellcasting | undefined {
  return classSpellcastingCreationAtLevel(
    "spellcasting" in facts ? facts.spellcasting : undefined,
    classLevel,
  );
}

function selectedUnitRefsForChoice(
  unitChoices: readonly UnitChoiceSelection[],
  choiceKey: UnitChoiceKey,
): readonly UnitRecord["id"][] {
  return unitChoices
    .filter((choice) => choice.source.choiceKey === choiceKey)
    .flatMap((choice) =>
      choice.options.flatMap(
        (option) =>
          /* v8 ignore start -- Supported spell selections retain Unit references on every option. */
          option.unitRef == null ? [] : [option.unitRef.unitId],
        /* v8 ignore stop */
      ),
    );
}

function selectedWizardSpellbookUnitRefs(
  unitChoices: readonly UnitChoiceSelection[],
): readonly UnitRecord["id"][] {
  return selectedUnitRefsForChoice(unitChoices, WIZARD_SPELLBOOK_CHOICE_KEY);
}

function selectedUnitRefsForChoiceSource(
  unitChoices: readonly UnitChoiceSelection[],
  source: UnitChoiceSource,
): readonly UnitRecord["id"][] {
  return unitChoices
    .filter((choice) => sameCreationHoleSource(choice.source, source))
    .flatMap((choice) =>
      choice.options.flatMap(
        (option) =>
          /* v8 ignore start -- Supported selected spell choices retain Unit references on every option. */
          option.unitRef == null ? [] : [option.unitRef.unitId],
        /* v8 ignore stop */
      ),
    );
}

function selectedUnitIdForLoadoutChoice(
  selection: LoadoutChoiceSelection,
  loadoutChoice: ReturnType<typeof supportedLoadoutChoiceForSource>,
): LoadoutEquipmentUnitId | undefined {
  /* v8 ignore start -- The support gate resolves this exact loadout choice and validates its sole selected option. */
  if (loadoutChoice == null) {
    return undefined;
  }

  const option = selection.options[0];
  return option?.optionId === loadoutChoice.optionId
    ? selection.source.equipmentUnitId
    : undefined;
  /* v8 ignore stop */
}

export function optionalUnitId(
  unitId: UnitRecord["id"] | undefined,
): readonly UnitRecord["id"][] {
  return unitId == null ? [] : [unitId];
}

function readableForFinalization<T>(
  result: UnitReaderResult<T>,
  unitId: UnitRecord["id"],
  role: CreationFinalizationReadableUnitRole,
): Either.Either<T, CharacterBuildProjectionIssue> {
  if (result.tag === "unreadable") {
    const [firstIssue, ...remainingIssues] = result.issues;
    return Either.left(
      characterBuildProjectionIssue({
        tag: "unreadableUnit",
        role,
        unitId,
        issues: [
          surfaceReadIssueCause(firstIssue),
          ...remainingIssues.map(surfaceReadIssueCause),
        ],
      }),
    );
  }

  return Either.right(result.value);
}

function surfaceReadIssueCause(
  issue: SurfaceReadIssue,
): Extract<
  CharacterBuildProjectionCause,
  { tag: "unreadableUnit" }
>["issues"][number] {
  return Match.value(issue).pipe(
    Match.when({ code: "unsupportedUnitKind" }, (unsupported) => {
      const {
        code,
        unitId: _unitId,
        message: _message,
        ...unprojected
      } = unsupported;
      noUnprojectedSurfaceReadIssueFields(unprojected);
      return { code };
    }),
    Match.exhaustive,
  );
}

function noUnprojectedSurfaceReadIssueFields(
  fields: Readonly<Record<PropertyKey, never>>,
): void;
function noUnprojectedSurfaceReadIssueFields(): void {}

function unitForFinalization(
  unitLibrary: UnitCatalog,
  unitId: UnitRecord["id"],
  role: CreationFinalizationLookupUnitRole,
): Either.Either<UnitRecord, CharacterBuildProjectionIssue> {
  const unit = unitLibrary.getUnit(unitId);
  return Option.isSome(unit)
    ? Either.right(unit.value)
    : Either.left(
        characterBuildProjectionIssue({ tag: "unknownUnit", role, unitId }),
      );
}

export function applyBackgroundAbilityScoreIncrease(
  baseScores: AbilityScoreAssignment,
  selection: BackgroundAbilityScoreIncreaseSelection,
  eligibleAbilities: readonly Ability[],
): Either.Either<AbilityScoreAssignment, CharacterBuildProjectionIssue> {
  const deltas = backgroundAbilityScoreIncreaseDeltas(
    selection,
    eligibleAbilities,
  );
  const capIssue = backgroundAbilityScoreIncreaseCapIssue(baseScores, deltas);
  if (capIssue != null) {
    return Either.left(capIssue);
  }

  if (selection.kind === "oneEach") {
    return Either.right(
      eligibleAbilities.reduce(
        (scores, ability) => ({
          ...scores,
          [ability]: abilityScore(scores[ability] + 1),
        }),
        baseScores,
      ),
    );
  }

  return Either.right({
    ...baseScores,
    [selection.plusTwo]: abilityScore(baseScores[selection.plusTwo] + 2),
    [selection.plusOne]: abilityScore(baseScores[selection.plusOne] + 1),
  });
}

function applyClassFeatureAbilityScoreIncreases(
  baseScores: AbilityScoreAssignment,
  selections: FinalizedCharacterSelections,
): Either.Either<AbilityScoreAssignment, ProjectionIssues> {
  const deltasWithCaps: AbilityScoreIncreaseDeltaWithCap[] = [];
  const decodingIssues: CharacterBuildProjectionIssue[] = [];
  for (const selection of selections.choices) {
    if (
      selection.kind !== "unitChoice" ||
      selection.source.choiceKey !==
        CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY
    ) {
      continue;
    }

    for (const optionId of choiceSelectionOptionIds(selection)) {
      const decoded = decodeAbilityScoreIncreaseOptionId(optionId);
      /* v8 ignore start -- Supported class-feature score choices are decoded before finalization and retain codec-emitted ids. */
      if (Either.isLeft(decoded)) {
        decodingIssues.push(choiceOptionCodecProjectionIssue(decoded.left));
        continue;
      }
      /* v8 ignore stop */
      deltasWithCaps.push(...decoded.right);
    }
  }
  const collectedDecodingIssues = nonEmptyReadonlyArray(decodingIssues);
  /* v8 ignore start -- Supported score-increase choices retain only ids emitted by the score-increase codec. */
  if (collectedDecodingIssues != null) {
    return Either.left(collectedDecodingIssues);
  }
  /* v8 ignore stop */

  const capIssues: CharacterBuildProjectionIssue[] = [];
  let scores = baseScores;
  for (const delta of deltasWithCaps) {
    const currentScore = scores[delta.ability];
    if (currentScore + delta.increase > delta.maxScore) {
      capIssues.push(
        characterBuildProjectionIssue({
          tag: "abilityScoreCapExceeded",
          source: "classFeature",
          ability: delta.ability,
          maximum: delta.maxScore,
          excess: PositiveInteger(
            currentScore + delta.increase - delta.maxScore,
          ),
        }),
      );
      continue;
    }

    scores = {
      ...scores,
      [delta.ability]: abilityScore(currentScore + delta.increase),
    };
  }
  const collectedCapIssues = nonEmptyReadonlyArray(capIssues);
  if (collectedCapIssues != null) {
    return Either.left(collectedCapIssues);
  }

  return Either.right(scores);
}

function backgroundAbilityScoreIncreaseDeltas(
  selection: BackgroundAbilityScoreIncreaseSelection,
  eligibleAbilities: readonly Ability[],
): readonly BackgroundAbilityScoreIncreaseDelta[] {
  const deltas =
    selection.kind === "oneEach"
      ? eligibleAbilities.map((ability) => ({
          ability,
          increase: 1,
        }))
      : [
          { ability: selection.plusTwo, increase: 2 },
          { ability: selection.plusOne, increase: 1 },
        ];

  return totalBackgroundAbilityScoreIncreaseDeltas(deltas);
}

function totalBackgroundAbilityScoreIncreaseDeltas(
  deltas: readonly BackgroundAbilityScoreIncreaseDelta[],
): readonly BackgroundAbilityScoreIncreaseDelta[] {
  const totals = new Map<Ability, number>();
  for (const delta of deltas) {
    totals.set(
      delta.ability,
      (totals.get(delta.ability) ?? 0) + delta.increase,
    );
  }

  return [...totals].map(([ability, increase]) => ({ ability, increase }));
}

function backgroundAbilityScoreIncreaseFitsCap(
  baseScores: AbilityScoreAssignment,
  deltas: readonly BackgroundAbilityScoreIncreaseDelta[],
): boolean {
  return deltas.every(
    (delta) =>
      baseScores[delta.ability] + delta.increase <=
      BACKGROUND_ABILITY_SCORE_INCREASE_MAX_SCORE,
  );
}

function backgroundAbilityScoreIncreaseCapIssue(
  baseScores: AbilityScoreAssignment,
  deltas: readonly BackgroundAbilityScoreIncreaseDelta[],
): CharacterBuildProjectionIssue | undefined {
  const overCapDelta = deltas.find(
    (delta) =>
      baseScores[delta.ability] + delta.increase >
      BACKGROUND_ABILITY_SCORE_INCREASE_MAX_SCORE,
  );
  if (overCapDelta == null) {
    return undefined;
  }

  return characterBuildProjectionIssue({
    tag: "abilityScoreCapExceeded",
    source: "background",
    ability: overCapDelta.ability,
    excess: PositiveInteger(
      baseScores[overCapDelta.ability] +
        overCapDelta.increase -
        BACKGROUND_ABILITY_SCORE_INCREASE_MAX_SCORE,
    ),
  });
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function skillsFromChoiceSelection(
  selection: UnitChoiceSelection | undefined,
): readonly Skill[] {
  /* v8 ignore start -- Supported proficiency selections retain only option ids from the closed skill roster. */
  return selection == null
    ? []
    : choiceSelectionOptionIds(selection).flatMap((optionId) => {
        const skill = SKILLS.find((candidate) => candidate === optionId);
        return skill == null ? [] : [skill];
      });
  /* v8 ignore stop */
}

function selectedBuildProficiencyChoiceSubjects(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterBuildProficiencyChoiceSubject[],
  ProjectionIssues
> {
  const unitProficiencySubjects = decodedUnitProficiencySubjects(
    selections,
    unitLibrary,
  );
  /* v8 ignore start -- Support admission already decoded every retained proficiency and tool option id. */
  if (Either.isLeft(unitProficiencySubjects)) {
    return Either.left(unitProficiencySubjects.left);
  }

  const toolProficiencies = finalizedBuildToolProficiencies(selections);
  if (Either.isLeft(toolProficiencies)) {
    return Either.left(toolProficiencies.left);
  }
  /* v8 ignore stop */

  return Either.right([
    ...skillsFromChoiceSelection(
      selections.choices.find(
        (selection): selection is UnitChoiceSelection =>
          selection.kind === "unitChoice" &&
          sameCreationHoleSource(
            selection.source,
            unitSource(
              startingClassUnitId(selections.progression),
              CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
            ),
          ),
      ),
    ).map((skill) => ({ kind: "skill" as const, skill })),
    ...toolProficiencies.right.map((toolId) => ({
      kind: "tool" as const,
      toolId,
    })),
    ...decodedClassToolProficiencySubjects(selections),
    ...unitProficiencySubjects.right,
  ]);
}

function decodedClassToolProficiencySubjects(
  selections: FinalizedCharacterSelections,
): readonly ParsedProficiencyGrantSubject[] {
  return selections.choices.flatMap((selection) =>
    selection.kind === "unitChoice" &&
    sameCreationHoleSource(
      selection.source,
      unitSource(
        startingClassUnitId(selections.progression),
        CLASS_TOOL_PROFICIENCY_CHOICE_KEY,
      ),
    )
      ? choiceSelectionOptionIds(selection).flatMap((optionId) => {
          const subject = decodeProficiencyGrantSubjectOptionId(optionId);
          return Either.isRight(subject) && subject.right.kind === "tool"
            ? [subject.right]
            : [];
        })
      : [],
  );
}

function fixedToolProficiencySubjects(
  proficiency: ClassCreationFacts["toolProficiencies"],
): readonly ProficiencyGrantSubject[] {
  return proficiency.kind === "fixed" ? proficiency.proficiencies : [];
}

function finalizedBuildToolProficiencies(
  selections: FinalizedCharacterSelections,
): Either.Either<readonly ToolProficiencyId[], ProjectionIssues> {
  const toolSelection = selections.choices.find(
    (selection) =>
      selection.kind === "unitChoice" &&
      sameCreationHoleSource(
        selection.source,
        unitSource(selections.background, BACKGROUND_TOOL_CHOICE_KEY),
      ),
  );

  const backgroundToolIds: ToolProficiencyId[] = [];
  if (toolSelection != null) {
    for (const optionId of choiceSelectionOptionIds(toolSelection)) {
      /* v8 ignore start -- Supported background tool choices are decoded before finalization and retain only admitted tool ids. */
      if (!isCharacterBuildToolProficiencyId(String(optionId))) {
        return Either.left([
          characterBuildProjectionIssue({
            tag: "unsupportedToolProficiency",
            source: "background",
            toolId: String(optionId),
          }),
        ]);
      }
      const parsed = parseToolProficiencyId(String(optionId));
      if (Either.isLeft(parsed)) {
        return Either.left([choiceOptionCodecProjectionIssue(parsed.left)]);
      }
      /* v8 ignore stop */
      backgroundToolIds.push(parsed.right);
    }
  }

  return Either.right(uniqueValues(backgroundToolIds));
}

function finalizedBuildSurfaceToolProficiencyIds(
  subjects: readonly ProficiencyGrantSubject[],
): Either.Either<readonly ToolProficiencyId[], ProjectionIssues> {
  const toolIds: ToolProficiencyId[] = [];
  for (const subject of subjects) {
    if (subject.kind !== "tool") continue;
    /* v8 ignore start -- Supported Surface tool grants retain only ids accepted by the shared tool codec. */
    if (!isCharacterBuildToolProficiencyId(subject.toolId)) {
      return Either.left([
        characterBuildProjectionIssue({
          tag: "unsupportedToolProficiency",
          source: "surfaceGrant",
          toolId: subject.toolId,
        }),
      ]);
    }
    const parsed = parseToolProficiencyId(subject.toolId);
    if (Either.isLeft(parsed)) {
      return Either.left([choiceOptionCodecProjectionIssue(parsed.left)]);
    }
    /* v8 ignore stop */
    toolIds.push(parsed.right);
  }
  return Either.right(toolIds);
}

function decodedUnitProficiencySubjects(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterBuildProficiencyChoiceSubject[],
  ProjectionIssues
> {
  const subjects: CharacterBuildProficiencyChoiceSubject[] = [];
  const issues: CharacterBuildProjectionIssue[] = [];
  for (const selection of selections.choices) {
    if (selection.kind !== "unitChoice") {
      continue;
    }

    if (
      selection.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY ||
      selection.source.choiceKey === ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY ||
      selection.source.choiceKey === SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY ||
      selection.source.choiceKey === SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY
    ) {
      if (
        selection.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY &&
        isGrantExpertiseSelection(selection, unitLibrary)
      ) {
        subjects.push(
          ...expertiseSubjectsForSelection(selection, selections, unitLibrary),
        );
        continue;
      }

      for (const optionId of choiceSelectionOptionIds(selection)) {
        const decoded = decodeProficiencyGrantSubjectOptionId(optionId);
        /* v8 ignore start -- Supported proficiency selections retain only ids emitted by the shared proficiency codec. */
        if (Either.isLeft(decoded)) {
          issues.push(choiceOptionCodecProjectionIssue(decoded.left));
          continue;
        }
        /* v8 ignore stop */
        subjects.push(decoded.right);
      }
      continue;
    }

    if (
      classFeatureAcquisitionChoiceMechanicsForSelection(
        selection,
        unitLibrary,
      ) !== undefined
    ) {
      subjects.push(
        ...classFeatureAcquisitionFixedProficiencySubjects(
          selection,
          unitLibrary,
        ),
      );
      continue;
    }

    if (!isMulticlassProficiencyChoiceKey(selection.source.choiceKey)) {
      continue;
    }

    for (const optionId of choiceSelectionOptionIds(selection)) {
      const decoded = decodeProficiencyGrantSubjectOptionId(optionId);
      /* v8 ignore start -- Supported multiclass proficiency selections retain only ids emitted by the shared proficiency codec. */
      if (Either.isLeft(decoded)) {
        issues.push(choiceOptionCodecProjectionIssue(decoded.left));
        continue;
      }
      /* v8 ignore stop */
      subjects.push(decoded.right);
    }
  }

  const collectedIssues = nonEmptyReadonlyArray(issues);
  /* v8 ignore start -- Supported proficiency choices retain only ids emitted by the shared proficiency codec. */
  return collectedIssues == null
    ? Either.right(subjects)
    : Either.left(collectedIssues);
  /* v8 ignore stop */
}

function expertiseSubjectsForSelection(
  selection: UnitChoiceSelection,
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): readonly CharacterBuildProficiencyChoiceSubject[] {
  const skillSource = grantExpertiseSkillSourceForSelection(
    selection,
    unitLibrary,
  );
  /* v8 ignore start -- isGrantExpertiseSelection immediately established this selection's expertise source. */
  if (skillSource === undefined) {
    return [];
  }
  /* v8 ignore stop */
  const ownedSkills = selectedSkillProficiencies(selections, unitLibrary);
  const ownedSkillExpertise = skillExpertiseFromChoiceSelections(
    selections.choices,
    unitLibrary,
    (candidate) =>
      candidate.kind === "unitChoice" &&
      sameCreationHoleSource(candidate.source, selection.source),
  );
  const eligibleSkills = eligibleExpertiseSkills(
    skillSource,
    ownedSkills,
    ownedSkillExpertise,
  );
  return choiceSelectionOptionIds(selection).flatMap((optionId) => {
    const skill = SKILLS.find((candidate) => candidate === optionId);
    /* v8 ignore start -- Support admission retains expertise options only from the eligible owned-skill roster. */
    return skill != null && eligibleSkills.includes(skill)
      ? [{ kind: "skill_expertise" as const, skill }]
      : [];
    /* v8 ignore stop */
  });
}

function selectedSkillProficiencies(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
  shouldIgnoreSelection: (
    selection: CharacterChoiceSelection,
  ) => boolean = doNotIgnoreSelection,
): readonly Skill[] {
  const backgroundSkills = backgroundSkillProficiencies(
    selections.background,
    unitLibrary,
  );
  const selectedSkills = skillProficienciesFromChoiceSelections(
    selections.choices,
    (selection) =>
      shouldIgnoreSelection(selection) ||
      (selection.kind === "unitChoice" &&
        isGrantExpertiseSelection(selection, unitLibrary)),
  );

  return uniqueValues([...backgroundSkills, ...selectedSkills]);
}

function originFeatOwnedToolProficiencies(input: {
  readonly selections: FinalizedCharacterSelections;
  readonly classFacts: ClassCreationFacts;
  readonly classFactsByUnitId: ClassFactsByUnitId;
  readonly originFeatUnitId: UnitRecord["id"];
  readonly originFeatProficiencyChoiceKey: UnitChoiceKey;
}): readonly ToolProficiencyId[] {
  return selectedAndFixedToolProficiencies({
    selections: input.selections,
    classFacts: input.classFacts,
    classFactsByUnitId: input.classFactsByUnitId,
    shouldIgnoreSelection: (selection) =>
      selection.kind === "unitChoice" &&
      selection.source.unitId === input.originFeatUnitId &&
      selection.source.choiceKey === input.originFeatProficiencyChoiceKey,
  });
}

function selectedAndFixedToolProficiencies(input: {
  readonly selections: FinalizedCharacterSelections;
  readonly classFacts: ClassCreationFacts;
  readonly classFactsByUnitId: ClassFactsByUnitId;
  readonly shouldIgnoreSelection?: (
    selection: CharacterChoiceSelection,
  ) => boolean;
}): readonly ToolProficiencyId[] {
  return uniqueValues([
    ...selectedToolProficiencies(input.selections, input.shouldIgnoreSelection),
    ...toolProficiencyIdsFromSubjects(
      fixedToolProficiencySubjects(input.classFacts.toolProficiencies),
    ),
    ...toolProficiencyIdsFromSubjects(
      fixedMulticlassProficiencySubjects(
        { progression: input.selections.progression },
        input.classFactsByUnitId,
      ),
    ),
  ]);
}

function selectedToolProficiencies(
  selections: FinalizedCharacterSelections,
  shouldIgnoreSelection: (
    selection: CharacterChoiceSelection,
  ) => boolean = doNotIgnoreSelection,
): readonly ToolProficiencyId[] {
  return uniqueValues([
    ...selectedBackgroundToolProficiencies(selections),
    ...toolProficienciesFromChoiceSelections(
      selections.choices,
      shouldIgnoreSelection,
    ),
  ]);
}

function selectedBackgroundToolProficiencies(
  selections: FinalizedCharacterSelections,
): readonly ToolProficiencyId[] {
  const selection = selections.choices.find(
    (candidate) =>
      candidate.kind === "unitChoice" &&
      candidate.source.unitId === selections.background &&
      candidate.source.choiceKey === BACKGROUND_TOOL_CHOICE_KEY,
  );
  if (selection === undefined) {
    return [];
  }

  return uniqueValues(
    toolProficiencyIdsFromDirectToolOptionIds(
      choiceSelectionOptionIds(selection),
    ),
  );
}

function toolProficienciesFromChoiceSelections(
  choices: readonly CharacterChoiceSelection[],
  shouldIgnoreSelection: (
    selection: CharacterChoiceSelection,
  ) => boolean = doNotIgnoreSelection,
): readonly ToolProficiencyId[] {
  return uniqueValues(
    choices.flatMap((selection) =>
      shouldIgnoreSelection(selection)
        ? []
        : toolProficienciesFromChoiceSelection(selection),
    ),
  );
}

function toolProficienciesFromChoiceSelection(
  selection: CharacterChoiceSelection,
): readonly ToolProficiencyId[] {
  if (selection.kind !== "unitChoice") {
    return [];
  }

  return toolProficiencyIdsFromProficiencyChoiceOptionIds(
    selection.options.map((option) => option.optionId),
  );
}

function isGrantExpertiseSelection(
  selection: UnitChoiceSelection,
  unitLibrary: UnitCatalog,
): boolean {
  return grantExpertiseSkillSourceForSelection(selection, unitLibrary) != null;
}

function backgroundSkillProficiencies(
  backgroundUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): readonly Skill[] {
  const backgroundUnit = unitLibrary.getUnit(backgroundUnitId);
  /* v8 ignore start -- Supported finalized selections resolve their admitted background id and readable facts in this catalog. */
  if (Option.isNone(backgroundUnit)) {
    return [];
  }
  const facts = readBackgroundCreationFacts(backgroundUnit.value);
  return facts.tag === "readable" ? facts.value.skillProficiencies : [];
  /* v8 ignore stop */
}

type ClassFeatureAcquisitionChoiceMechanics = Extract<
  ClassFeatureRecord["mechanics"],
  { readonly family: "class_feature_acquisition_choice" }
>;

function classFeatureAcquisitionChoiceMechanicsForSelection(
  selection: UnitChoiceSelection,
  unitLibrary: UnitCatalog,
): ClassFeatureAcquisitionChoiceMechanics | undefined {
  const feature = unitLibrary.getUnit(selection.source.unitId);
  if (
    Option.isNone(feature) ||
    feature.value.kind !== "class_feature" ||
    feature.value.mechanics.family !== "class_feature_acquisition_choice"
  ) {
    return undefined;
  }
  const featureChoiceKey = unitChoiceKey(feature.value.mechanics.choiceKey);
  return Either.isRight(featureChoiceKey) &&
    featureChoiceKey.right === selection.source.choiceKey
    ? feature.value.mechanics
    : undefined;
}

function classFeatureAcquisitionFixedProficiencySubjects(
  selection: UnitChoiceSelection,
  unitLibrary: UnitCatalog,
): readonly ParsedProficiencyGrantSubject[] {
  const mechanics = classFeatureAcquisitionChoiceMechanicsForSelection(
    selection,
    unitLibrary,
  );
  /* v8 ignore start -- The caller invokes this projection only after matching the selection to acquisition-choice mechanics. */
  if (mechanics === undefined) {
    return [];
  }
  /* v8 ignore stop */
  const optionIds = new Set(choiceSelectionOptionIds(selection));
  return mechanics.options
    .filter((option) => optionIds.has(creationChoiceOptionId(option.id)))
    .flatMap((option) =>
      option.mechanics.grants.flatMap((grant) =>
        grant.kind === "grant_proficiency"
          ? fixedProficiencySubjects(grant.proficiency)
          : [],
      ),
    )
    .flatMap((subject) => {
      const decoded = decodeProficiencyGrantSubjectOptionId(
        proficiencyGrantSubjectOptionId(subject),
      );
      /* v8 ignore start -- Supported fixed proficiency grants use subjects emitted by the shared proficiency codec. */
      return Either.isRight(decoded) ? [decoded.right] : [];
      /* v8 ignore stop */
    });
}

function isMulticlassProficiencyChoiceKey(choiceKey: UnitChoiceKey): boolean {
  return MULTICLASS_PROFICIENCY_CHOICE_KEYS.some(
    (multiclassChoiceKey) => multiclassChoiceKey === choiceKey,
  );
}

function characterBuildResourcesForUnit(
  unit: UnitRecord,
  supportProfile: CharacterCreationSupportProfile,
): readonly CharacterBuildResource[] {
  if (
    unit.kind === "class_feature" &&
    supportsCharacterBuildResourceUnitId(unit.id, supportProfile) &&
    (unit.mechanics.family === "activation" ||
      unit.mechanics.family === "resource_container" ||
      unit.mechanics.family === "resource_pool") &&
    unit.mechanics.resource !== undefined
  ) {
    return [{ unitId: unit.id, resource: unit.mechanics.resource }];
  }
  const zeroHitPointReplacement = zeroHitPointReplacementUnitProfile(unit);
  if (zeroHitPointReplacement !== null) {
    return [
      {
        unitId: unit.id,
        resource: zeroHitPointReplacement.resource,
      },
    ];
  }
  return [];
}

export function unitRefs(
  ...unitIds: readonly UnitRecord["id"][]
): readonly UnitRef[] {
  return uniqueValues(unitIds).map((unitId) => ({ unitId }));
}

function uniqueUnitRefs(refs: readonly UnitRef[]): readonly UnitRef[] {
  const byUnitId = new Map<UnitRecord["id"], UnitRef>();
  for (const ref of refs) {
    const existing = byUnitId.get(ref.unitId);
    byUnitId.set(
      ref.unitId,
      existing?.selectedOption !== undefined && ref.selectedOption === undefined
        ? existing
        : ref,
    );
  }
  return [...byUnitId.values()];
}

export function uniqueValues<T>(values: readonly T[]): readonly T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}
