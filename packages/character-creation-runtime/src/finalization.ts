import { Either, Match, Option } from "effect";
import { isValidAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import { zeroHitPointReplacementUnitProfile } from "@dnd/shared-algebras/zero-hit-point-replacement-algebra";
import { abilityScore, hp } from "@dnd/shared/types";
import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
  readSpeciesCreationFacts,
  type ClassCreationFacts,
  type UnitReaderResult,
  type WizardClassCreationFacts,
} from "@dnd/surface/surface/character-creation-readers";
import { SKILLS } from "@dnd/surface/surface/types";
import type {
  Ability,
  ArmorTrainingCategory,
  ClassFeatureRecord,
  ProficiencyGrant,
  ProficiencyGrantSubject,
  Skill,
  StartingEquipmentChoice,
  EffectAtom,
  UnitRecord,
} from "@dnd/surface/surface/types";
import {
  discoverCreationHoles,
  selectedClassFeatureAcquisitionGrantChoiceHoles,
} from "./discovery.ts";
import { type CharacterProgression } from "./character-progression-algebra.ts";
import {
  classLevelForUnit,
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
  eligibleExpertiseSkills,
  grantExpertiseSkillSourceForSelection,
  sameCreationHoleSource,
  selectedFeatAbilityScoreIncreaseOptions,
  sameOptionIdMultiset,
  skillExpertiseFromChoiceSelections,
  skillProficienciesFromChoiceSelections,
  startingEquipmentChoiceHole,
} from "./discovery.ts";
import {
  decodeAbilityScoreIncreaseOptionId,
  decodeProficiencyGrantSubjectOptionId,
  parseToolProficiencyId,
  proficiencyGrantSubjectOptionId,
  proficiencyGrantSubjectOptions,
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
  WIZARD_CANTRIP_CHOICE_KEY,
  WIZARD_PREPARED_SPELL_CHOICE_KEY,
  WIZARD_SPELLBOOK_CHOICE_KEY,
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
} from "./phase1-manifest.ts";
import { selectedEldritchInvocationFeatures } from "./eldritch-invocations.ts";
import {
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
  supportedLoadoutChoiceForSource,
  supportedLoadoutChoices,
  supportedPurchasableEquipmentUnitIdsForClass,
  supportedSpeciesUnitIds,
  unitRefsForSupportedClassChoice,
} from "./support-gates.ts";
import {
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  characterEquipmentItemUnitIdFromLoadoutEquipmentUnitId,
  creationChoiceOptionId,
  choiceCardinalityBounds,
  exactChoiceCardinality,
  hitDieSize,
  hitDieTotal,
  nonEmptyReadonlyArray,
  loadoutSourceKey,
  isCharacterBuildToolProficiencyId,
  unitChoiceKey,
  unitChoiceSourceKey,
  type AbilityScoreAssignment,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterBuild,
  type CharacterBuildEquipment,
  type CharacterEquipmentItemSlot,
  type CharacterBuildClassFeatureLanguage,
  type CharacterBuildFeature,
  type CharacterBuildHitPoints,
  type CharacterBuildLoadout,
  type CharacterBuildProficiencies,
  type CharacterBuildProficiencyChoiceSubject,
  type CharacterBuildResource,
  type CharacterBuildPactMagicSlotPool,
  type CharacterBuildSpellcasting,
  type CharacterBuildSpellcastingSource,
  type CharacterBuildSpellcastingSlotPool,
  type CharacterBuildSpellSlotCapacity,
  type CreationChoiceOption,
  type CreationChoiceOptionId,
  type CharacterChoiceSelection,
  type ChoiceCreationHole,
  type CreationHole,
  type CharacterDraft,
  type CreationFinalizationIssue,
  type CreationFinalizationResult,
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

export function finalizeCharacterDraft(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): CreationFinalizationResult {
  const holes = discoverCreationHoles(input);
  const openHoles = nonEmptyReadonlyArray(
    unfilledFinalizationHoles(input.draft, holes),
  );
  if (openHoles != null) {
    return {
      tag: "incomplete",
      holes: openHoles,
    };
  }

  const selections = finalizedSelections(input.draft);
  if (selections == null) {
    return {
      tag: "invalid",
      issues: [illegalFinalizationIssue("Draft is incomplete.")],
    };
  }

  const supportedSelections = executableSupportSelections(
    selections,
    input.unitLibrary,
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
): readonly CreationFinalizationIssue[] {
  return [
    ...expectedValueIssue(
      selections.background ===
        CHARACTER_CREATION_SUPPORT_PROFILE.manifest.backgroundUnitId,
      "Finalized build must use the supported manifest background.",
    ),
    ...expectedValueIssue(
      supportedSpeciesUnitIds().includes(selections.species),
      "Finalized build must use a supported species.",
    ),
    ...expectedValueIssue(
      speciesSizeSelectionMatchesSurface(selections, unitLibrary),
      "Finalized build species size selection must match the selected species Surface facts.",
    ),
    ...expectedValueIssue(
      isSupportedFinalizableProgression(selections),
      "Finalized build progression must match a supported progression profile.",
    ),
    ...expectedValueIssue(
      isValidAbilityScoreAssignment(
        selections.abilityScoreGeneration.method,
        selections.abilityScoreGeneration.assignedScores,
      ),
      "Finalized build must use a supported ability-score generation method.",
    ),
    ...expectedValueIssue(
      isSupportedManifestBackgroundAbilityScoreIncrease(
        selections.backgroundAbilityScoreIncrease,
        unitLibrary,
        selections.background,
        selections.abilityScoreGeneration.assignedScores,
      ),
      "Finalized build must use the supported manifest background ability-score increase.",
    ),
    ...expectedValueIssue(
      sameOptionIdMultiset(selections.languages, [
        ...CHARACTER_CREATION_SUPPORT_PROFILE.manifest.languages,
      ]),
      "Finalized build must use the supported manifest languages.",
    ),
    ...expectedValueIssue(
      selections.alignment.morality ===
        CHARACTER_CREATION_SUPPORT_PROFILE.manifest.alignment.morality &&
        selections.alignment.order ===
          CHARACTER_CREATION_SUPPORT_PROFILE.manifest.alignment.order,
      "Finalized build must use the supported manifest alignment.",
    ),
    ...expectedValueIssue(
      allFinalizedChoicesSupported(selections, unitLibrary),
      "Finalized build must carry exactly the supported choices for the selected progression.",
    ),
    ...expectedValueIssue(
      spellcastingFactsAuthoredForSelectedClassLevels(selections, unitLibrary),
      "Finalized build must have authored spellcasting facts for the selected class levels.",
    ),
    ...expectedValueIssue(
      selectedPreparedSpellsAreInSelectedSpellbook(selections, unitLibrary),
      "Finalized Wizard prepared spells must be selected from the spellbook and match available Spell Slot levels.",
    ),
    ...expectedValueIssue(
      isSupportedEquipmentSelection(selections),
      "Finalized build must own supported purchased equipment.",
    ),
  ];
}

function spellcastingFactsAuthoredForSelectedClassLevels(
  selections: Pick<FinalizedCharacterSelections, "progression">,
  unitLibrary: UnitCatalog,
): boolean {
  const classFactsByUnitId = allClassFactsForFinalization(
    selections.progression,
    unitLibrary,
  );
  if (Either.isLeft(classFactsByUnitId)) {
    return false;
  }

  return [...classFactsByUnitId.right].every(([classUnitId, classFacts]) => {
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

  const spellcasting = classFacts.value.spellcasting;
  const unitChoices = unitChoiceSelections(selections);
  const selectedSpellbook = new Set(
    selectedUnitRefsForChoice(unitChoices, WIZARD_SPELLBOOK_CHOICE_KEY),
  );
  const selectedPrepared = selectedUnitRefsForChoice(
    unitChoices,
    WIZARD_PREPARED_SPELL_CHOICE_KEY,
  );
  const slotLevels = new Set(
    spellcasting.spellSlotProjection.slots.map((slot) => slot.spellLevel),
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
): Either.Either<
  ExecutableSupportSelections,
  NonEmptyReadonlyArray<CreationFinalizationIssue>
> {
  const issues = nonEmptyReadonlyArray([
    ...executableSupportIssues(selections, unitLibrary),
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
  message: string,
): readonly CreationFinalizationIssue[] {
  return condition ? [] : [unsupportedFinalizationIssue(message)];
}

function speciesSizeSelectionMatchesSurface(
  selections: Pick<FinalizedCharacterSelections, "species" | "speciesSize">,
  unitLibrary: UnitCatalog,
): boolean {
  const speciesUnit = unitLibrary.getUnit(selections.species);
  if (Option.isNone(speciesUnit)) return false;
  const facts = readSpeciesCreationFacts(speciesUnit.value);
  if (facts.tag !== "readable") return false;
  if (facts.value.size.kind === "fixed") {
    return selections.speciesSize === undefined;
  }

  return (
    selections.speciesSize !== undefined &&
    facts.value.size.options.some((size) => size === selections.speciesSize)
  );
}

export function illegalFinalizationIssue(
  message: string,
): CreationFinalizationIssue {
  return {
    tag: "illegalFinalization",
    code: "illegalFinalization",
    message,
  };
}

function choiceOptionCodecFinalizationIssue(
  issue: ChoiceOptionCodecIssue,
): CreationFinalizationIssue {
  return {
    tag: "invalidChoiceOption",
    code: "invalidChoiceOption",
    optionId: issue.optionId,
    reason: issue.message,
    message: `${issue.message} Selected option: ${issue.optionId}`,
  };
}

export function unsupportedFinalizationIssue(
  message: string,
): CreationFinalizationIssue {
  return {
    tag: "unsupportedFinalization",
    code: "unsupportedFinalization",
    message,
  };
}

export function isSupportedFinalizableProgression(
  selections: Pick<FinalizedCharacterSelections, "progression">,
): boolean {
  return isSupportedProgression(selections.progression);
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

export function isSupportedManifestBackgroundAbilityScoreIncrease(
  selection: BackgroundAbilityScoreIncreaseSelection,
  unitLibrary: UnitCatalog,
  backgroundUnitId: UnitRecord["id"],
  baseScores: AbilityScoreAssignment,
): boolean {
  return (
    sameBackgroundAbilityScoreIncreaseSelection(
      selection,
      CHARACTER_CREATION_SUPPORT_PROFILE.manifest
        .backgroundAbilityScoreIncrease,
    ) &&
    isSupportedBackgroundAbilityScoreIncrease(
      selection,
      unitLibrary,
      backgroundUnitId,
      baseScores,
    )
  );
}

function allClassFactsForFinalization(
  progression: CharacterProgression,
  unitLibrary: UnitCatalog,
): Either.Either<ClassFactsByUnitId, FinalizationIssues> {
  return Either.map(
    traverseValidation(progressionClassUnitIds(progression), (classUnitId) =>
      classFactsEntryForFinalization(unitLibrary, classUnitId),
    ),
    (entries) => new Map(entries),
  );
}

function classFactsEntryForFinalization(
  unitLibrary: UnitCatalog,
  classUnitId: UnitRecord["id"],
): Either.Either<
  readonly [UnitRecord["id"], ClassCreationFacts],
  CreationFinalizationIssue
> {
  const classUnit = unitForFinalization(unitLibrary, classUnitId, "class");
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  const facts = readableForFinalization(
    readClassCreationFacts(classUnit.right),
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

export function sameBackgroundAbilityScoreIncreaseSelection(
  left: BackgroundAbilityScoreIncreaseSelection,
  right: BackgroundAbilityScoreIncreaseSelection,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "oneEach") {
    return true;
  }

  if (right.kind === "oneEach") {
    return false;
  }

  return left.plusTwo === right.plusTwo && left.plusOne === right.plusOne;
}

export function buildCharacterBuild(input: {
  readonly supportedSelections: ExecutableSupportSelections;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterBuild, FinalizationIssues> {
  const { selections } = input.supportedSelections;
  const progression = input.supportedSelections.progression;
  const selectedClassUnitId = startingClassUnitId(progression);
  const classFactsByUnitId = allClassFactsForFinalization(
    progression,
    input.unitLibrary,
  );
  if (Either.isLeft(classFactsByUnitId)) {
    return Either.left(classFactsByUnitId.left);
  }
  const classFacts = classFactsByUnitId.right.get(selectedClassUnitId);
  if (classFacts == null) {
    return Either.left([
      illegalFinalizationIssue(
        `Cannot finalize class progression without starting class facts: ${selectedClassUnitId}`,
      ),
    ]);
  }
  const backgroundUnit = unitForFinalization(
    input.unitLibrary,
    selections.background,
    "background",
  );
  if (Either.isLeft(backgroundUnit)) return Either.left([backgroundUnit.left]);
  const backgroundFacts = readableForFinalization(
    readBackgroundCreationFacts(backgroundUnit.right),
    "background",
  );
  if (Either.isLeft(backgroundFacts))
    return Either.left([backgroundFacts.left]);
  const speciesUnit = unitForFinalization(
    input.unitLibrary,
    selections.species,
    "species",
  );
  if (Either.isLeft(speciesUnit)) return Either.left([speciesUnit.left]);
  const speciesFacts = readableForFinalization(
    readSpeciesCreationFacts(speciesUnit.right),
    "species",
  );
  if (Either.isLeft(speciesFacts)) return Either.left([speciesFacts.left]);
  const baseScores = selections.abilityScoreGeneration.assignedScores;
  const finalScores = applyBackgroundAbilityScoreIncrease(
    baseScores,
    selections.backgroundAbilityScoreIncrease,
    backgroundFacts.right.abilityScoreIncrease.abilities,
  );
  if (Either.isLeft(finalScores)) return Either.left([finalScores.left]);
  const featureScores = applyClassFeatureAbilityScoreIncreases(
    finalScores.right,
    selections,
  );
  if (Either.isLeft(featureScores)) return Either.left(featureScores.left);
  const finalAbilityScores = featureScores.right;
  const proficiencyChoices = selectedBuildProficiencyChoiceSubjects(
    selections,
    input.unitLibrary,
  );
  if (Either.isLeft(proficiencyChoices)) {
    return Either.left(proficiencyChoices.left);
  }
  const buildSpellcasting = finalizedBuildSpellcasting({
    classFactsByUnitId: classFactsByUnitId.right,
    selections,
    supportedSelections: input.supportedSelections,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(buildSpellcasting)) {
    return Either.left(buildSpellcasting.left);
  }
  const abilityCheckBonusFeatures =
    finalizedClassFeatureAcquisitionAbilityCheckBonusFeatures(
      input.supportedSelections.unitChoices,
      input.unitLibrary,
    );
  if (Either.isLeft(abilityCheckBonusFeatures)) {
    return Either.left(abilityCheckBonusFeatures.left);
  }
  const buildFeatures: readonly CharacterBuildFeature[] = [
    ...finalizedClassChoiceFeaturesForSupportedChoices(
      input.supportedSelections.unitChoices,
    ),
    ...abilityCheckBonusFeatures.right,
  ];
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
  );
  if (Either.isLeft(buildEquipment)) {
    return Either.left(buildEquipment.left);
  }

  return Either.right({
    progression,
    background: selections.background,
    species: selections.species,
    ...(selections.speciesSize === undefined
      ? {}
      : { speciesSize: selections.speciesSize }),
    originLanguages: selections.languages,
    classFeatureLanguages: classFeatureLanguages.right,
    alignment: selections.alignment,
    abilityScores: finalAbilityScores,
    proficiencyChoices: proficiencyChoices.right,
    features: buildFeatures,
    ...(buildSpellcasting.right == null
      ? {}
      : { spellcasting: buildSpellcasting.right }),
    equipment: buildEquipment.right,
  });
}

function fixedHitPointsAfterLevelOne(
  hitPointDie: number,
  constitutionScore: number,
): number {
  // Current support profile admits fixed HP gains after level 1. Rolled HP needs
  // an explicit creation choice before it can finalize.
  return Math.max(
    1,
    Math.floor(hitPointDie / 2) + 1 + abilityModifier(constitutionScore),
  );
}

export function characterBuildHitPoints(
  build: Pick<CharacterBuild, "progression" | "abilityScores">,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterBuildHitPoints, FinalizationIssues> {
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
  if (startingClassFacts == null) {
    return Either.left([
      illegalFinalizationIssue(
        `Cannot derive hit points without starting class facts: ${startingClassUnitId(build.progression)}`,
      ),
    ]);
  }

  const maximum =
    startingClassFacts.hitPointDie +
    abilityModifier(build.abilityScores.con) +
    build.progression.advancements.reduce((total, advancement) => {
      const facts = classFactsByUnitId.right.get(advancement.classUnitId);
      return facts == null
        ? total
        : total +
            fixedHitPointsAfterLevelOne(
              facts.hitPointDie,
              build.abilityScores.con,
            );
    }, 0);

  return Either.right({
    maximum: hp(maximum),
    hitDice: progressionClassLevels(build.progression).flatMap((entry) => {
      const facts = classFactsByUnitId.right.get(entry.classUnitId);
      return facts == null
        ? []
        : [
            {
              classUnitId: entry.classUnitId,
              dieSize: hitDieSize(facts.hitPointDie),
              total: hitDieTotal(entry.classLevel),
            },
          ];
    }),
  });
}

export function characterBuildProficiencies(
  build: Pick<
    CharacterBuild,
    "progression" | "background" | "proficiencyChoices"
  >,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterBuildProficiencies, FinalizationIssues> {
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
  if (startingClassFacts == null) {
    return Either.left([
      illegalFinalizationIssue(
        `Cannot derive proficiencies without starting class facts: ${startingClassUnitId(build.progression)}`,
      ),
    ]);
  }

  const backgroundUnit = unitForFinalization(
    unitLibrary,
    build.background,
    "background",
  );
  if (Either.isLeft(backgroundUnit)) return Either.left([backgroundUnit.left]);
  const backgroundFacts = readableForFinalization(
    readBackgroundCreationFacts(backgroundUnit.right),
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
  if (Either.isLeft(multiclassTools)) return Either.left(multiclassTools.left);
  const startingClassTools = finalizedBuildSurfaceToolProficiencyIds(
    fixedToolProficiencySubjects(startingClassFacts.toolProficiencies),
  );
  if (Either.isLeft(startingClassTools)) {
    return Either.left(startingClassTools.left);
  }

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
): Either.Either<readonly ArmorTrainingCategory[], FinalizationIssues> {
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
  if (startingClassFacts == null) {
    return Either.left([
      illegalFinalizationIssue(
        `Cannot derive armor training without starting class facts: ${startingClassUnitId(build.progression)}`,
      ),
    ]);
  }

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
    ...build.features.flatMap((feature) =>
      feature.kind === "selectedClassChoice" ? [feature.unitId] : [],
    ),
  ]);
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
  FinalizationIssues
> {
  const issues: CreationFinalizationIssue[] = [];
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
        if (Either.isLeft(language)) {
          issues.push(
            illegalFinalizationIssue(
              `Unsupported class-feature language id ${grant.languageId} on Unit ${unitId}.`,
            ),
          );
          continue;
        }

        if (knownLanguages.has(language.right)) {
          issues.push(
            illegalFinalizationIssue(
              `Duplicate Character Build language ${language.right} from class feature Unit ${unitId}.`,
            ),
          );
          continue;
        }

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
      if (selection === undefined) {
        issues.push(
          illegalFinalizationIssue(
            `Missing class-feature language choice for Unit ${unitId}.`,
          ),
        );
        continue;
      }

      if (selection.options.length !== grant.count) {
        issues.push(
          illegalFinalizationIssue(
            `Class-feature language choice on Unit ${unitId} expected ${grant.count} selection(s), received ${selection.options.length}.`,
          ),
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
            illegalFinalizationIssue(
              `Unsupported class-feature language choice option ${option.optionId} on Unit ${unitId}.`,
            ),
          );
          continue;
        }

        if (knownLanguages.has(language.right)) {
          issues.push(
            illegalFinalizationIssue(
              `Duplicate Character Build language ${language.right} from class feature choice Unit ${unitId}.`,
            ),
          );
          continue;
        }

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
): readonly CharacterBuildResource[] {
  return characterBuildFeatureUnitIds(build, unitLibrary).flatMap((unitId) => {
    const unit = unitLibrary.getUnit(unitId);
    return Option.isSome(unit) ? resourceForFeature(unit.value) : [];
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
  if (
    classEquipmentHole === undefined ||
    backgroundEquipmentHole === undefined
  ) {
    return false;
  }
  const supportedHoles = supportedFinalizationChoiceHoles({
    selections,
    classFacts: classFacts.value,
    classFactsByUnitId: classFactsByUnitId.right,
    backgroundFacts: backgroundFacts.value,
    unitLibrary,
    classEquipmentHole,
    backgroundEquipmentHole,
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
        !choiceSelectionMatchesHole(choice, supportedHole)
      ) {
        return false;
      }

      if (sameCreationHoleSource(choice.source, classEquipmentHole.source)) {
        return supportedStartingEquipmentCoinGrantChoice(
          choice,
          selectedClassUnitId,
          CLASS_EQUIPMENT_CHOICE_KEY,
          classFacts.value.startingEquipment,
        );
      }

      if (
        sameCreationHoleSource(choice.source, backgroundEquipmentHole.source)
      ) {
        return supportedStartingEquipmentCoinGrantChoice(
          choice,
          selections.background,
          BACKGROUND_EQUIPMENT_CHOICE_KEY,
          backgroundFacts.value.startingEquipment,
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
        choiceSelectionMatchesHole(choice, supportedHole)
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

function supportedFinalizationChoiceHoles(input: {
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
}): readonly ChoiceCreationHole[] {
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
        ),
      }),
    )
    .flatMap((hole) => {
      const unitHole = requireUnitChoiceCreationHole(hole);
      return unitHole === undefined ? [] : [unitHole];
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
                  return Option.isSome(unit)
                    ? [
                        {
                          optionId: creationChoiceOptionId(unit.value.id),
                          label: unit.value.name,
                          unitRef: { unitId: unit.value.id },
                        },
                      ]
                    : [];
                }),
              }),
            ),
          ]),
        ),
  );
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
  const selectedEquipment = new Set(input.selections.equipment.selectedUnitIds);

  return [
    classSkillHole,
    ...classToolProficiencyHoles,
    ...classFeatureHoles,
    ...subclassHoles,
    ...multiclassProficiencyHoles,
    ...selectedFeatAbilityScoreHoles,
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
    ...supportedLoadoutChoices().flatMap((loadoutChoice) =>
      selectedEquipment.has(loadoutChoice.unitId)
        ? compact([
            requireLoadoutCreationHole(
              choiceHole({
                source: loadoutSource(loadoutChoice.unitId, loadoutChoice.slot),
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
        : [],
    ),
  ].filter(isPresent);
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
  if (Either.isLeft(choiceKey)) {
    return [];
  }
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
      if (Option.isNone(unit)) return [];
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
  if (hole?.kind !== "choice") {
    return undefined;
  }

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
  if (choice === undefined || !isUnitChoiceCreationHole(choice)) {
    return undefined;
  }

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
  if (choice === undefined || !isLoadoutCreationHole(choice)) {
    return undefined;
  }

  return choice;
}

function compact<T>(values: readonly (T | undefined)[]): readonly T[] {
  return values.filter(isPresent);
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function supportedStartingEquipmentCoinGrantChoice(
  selection: Extract<CharacterChoiceSelection, { readonly kind: "unitChoice" }>,
  unitId: UnitRecord["id"],
  choiceKey:
    | typeof CLASS_EQUIPMENT_CHOICE_KEY
    | typeof BACKGROUND_EQUIPMENT_CHOICE_KEY,
  choices: readonly StartingEquipmentChoice[],
): boolean {
  if (
    selection.source.unitId !== unitId ||
    selection.source.choiceKey !== choiceKey
  ) {
    return false;
  }

  const hole = startingEquipmentChoiceHole(
    unitSource(unitId, choiceKey),
    choices,
  );
  if (hole === undefined) {
    return false;
  }
  if (!choiceSelectionMatchesHole(selection, hole)) {
    return false;
  }

  const selectedOptionId = selection.options[0]?.optionId;
  const selectedChoice = choices.find(
    (choice) => choice.id === selectedOptionId,
  );
  return selectedChoice?.kind === "coin_grant";
}

export function isSupportedEquipmentSelection(
  selections: FinalizedCharacterSelections,
): boolean {
  const supportedUnitIds = supportedPurchasableEquipmentUnitIdsForClass(
    startingClassUnitId(selections.progression),
  );
  return selections.equipment.selectedUnitIds.every((unitId) =>
    (supportedUnitIds as readonly string[]).includes(unitId),
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
  >,
  unitLibrary?: UnitCatalog,
): readonly UnitRef[] {
  const derivedFeatureUnitIds =
    unitLibrary === undefined
      ? []
      : characterBuildDerivedFeatureUnitIds(build, unitLibrary);
  return unitRefs(
    ...progressionClassUnitIds(build.progression),
    build.background,
    build.species,
    ...derivedFeatureUnitIds,
    ...build.features.flatMap((feature) =>
      feature.kind === "selectedClassChoice" ? [feature.unitId] : [],
    ),
    ...build.equipment.owned.map((item) => item.unitId),
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
  );
}

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
  return facts.tag === "readable" ? Object.values(facts.value.traits) : [];
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

    return unitRefsForSupportedClassChoice(
      selection.source,
      selection.options,
    ).map((unitId) => ({
      kind: "selectedClassChoice" as const,
      unitId,
      selectedFromUnitId: selection.source.unitId,
    }));
  });
}

function finalizedClassFeatureAcquisitionAbilityCheckBonusFeatures(
  unitChoices: readonly UnitChoiceSelection[],
  unitLibrary: UnitCatalog,
): Either.Either<readonly CharacterBuildFeature[], FinalizationIssues> {
  const features: CharacterBuildFeature[] = [];
  const issues: CreationFinalizationIssue[] = [];
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
        if (projected === undefined) {
          issues.push(
            illegalFinalizationIssue(
              `Cannot project supported class-feature acquisition ability-check bonus for ${selection.source.unitId}:${option.id}.`,
            ),
          );
          continue;
        }
        features.push(projected);
      }
    }
  }

  const collectedIssues = nonEmptyReadonlyArray(issues);
  return collectedIssues == null
    ? Either.right(features)
    : Either.left(collectedIssues);
}

function classFeatureAcquisitionAbilityCheckBonusFeature(
  selectedFromUnitId: UnitRecord["id"],
  grant: ModifyRollNumericGrant,
): CharacterBuildFeature | undefined {
  const abilityFilter = fixedModifyRollAbilityFilter(grant.abilityFilter);
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
  return abilityFilter === undefined || "kind" in abilityFilter
    ? undefined
    : abilityFilter;
}

export function finalizedBuildEquipment(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterBuildEquipment, FinalizationIssues> {
  return finalizedBuildEquipmentForSupportedLoadoutChoices(
    selections,
    loadoutChoiceSelections(selections),
    unitLibrary,
  );
}

function finalizedBuildEquipmentForSupportedLoadoutChoices(
  selections: FinalizedCharacterSelections,
  loadoutChoices: readonly LoadoutChoiceSelection[],
  unitLibrary: UnitCatalog,
): Either.Either<CharacterBuildEquipment, FinalizationIssues> {
  const loadout = loadoutChoices.reduce<CharacterBuildLoadout>(
    (equipment, selection) => {
      const loadoutChoice = supportedLoadoutChoiceForSource(selection.source);
      const selectedUnitId = selectedUnitIdForLoadoutChoice(
        selection,
        loadoutChoice,
      );
      if (loadoutChoice == null || selectedUnitId == null) {
        return equipment;
      }

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

      return {
        ...equipment,
        weapon: {
          itemId: characterEquipmentItemId({
            slot: "main",
            unitId:
              characterEquipmentItemUnitIdFromLoadoutEquipmentUnitId(
                selectedUnitId,
              ),
          }),
          grip: loadoutChoice.grip,
        },
      };
    },
    {},
  );
  const owned = traverseValidation(
    selections.equipment.selectedUnitIds,
    (unitId) => {
      const itemUnitId = characterEquipmentItemUnitId(unitId);
      return Either.isLeft(itemUnitId)
        ? Either.left(
            illegalFinalizationIssue(
              `Unsupported equipment Unit id for finalized Character Build: ${unitId}.`,
            ),
          )
        : Either.right({
            itemId: characterEquipmentItemId({
              slot: ownedEquipmentDefaultSlot(unitLibrary, unitId),
              unitId: itemUnitId.right,
            }),
            unitId,
          });
    },
  );
  if (Either.isLeft(owned)) {
    return Either.left(owned.left);
  }

  return Either.right({
    owned: owned.right,
    loadout,
  });
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
  if (Either.isLeft(spellcastingSlotPool)) {
    return Either.left([spellcastingSlotPool.left]);
  }
  const pactMagicSlotPool = singlePactMagicSlotPool(projections);
  if (Either.isLeft(pactMagicSlotPool)) {
    return Either.left([pactMagicSlotPool.left]);
  }

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
      spellbook,
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
  }

  return Either.left(
    illegalFinalizationIssue(
      "Cannot finalize multiclass Spell Slot pools without a supported multiclass slot projection.",
    ),
  );
}

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
  }

  return Either.left(
    illegalFinalizationIssue("Cannot finalize multiple Pact Magic slot pools."),
  );
}

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
      choice.options.flatMap((option) =>
        option.unitRef == null ? [] : [option.unitRef.unitId],
      ),
    );
}

function selectedUnitRefsForChoiceSource(
  unitChoices: readonly UnitChoiceSelection[],
  source: UnitChoiceSource,
): readonly UnitRecord["id"][] {
  return unitChoices
    .filter((choice) => sameCreationHoleSource(choice.source, source))
    .flatMap((choice) =>
      choice.options.flatMap((option) =>
        option.unitRef == null ? [] : [option.unitRef.unitId],
      ),
    );
}

function selectedUnitIdForLoadoutChoice(
  selection: LoadoutChoiceSelection,
  loadoutChoice: ReturnType<typeof supportedLoadoutChoiceForSource>,
): LoadoutEquipmentUnitId | undefined {
  if (loadoutChoice == null) {
    return undefined;
  }

  const option = selection.options[0];
  return option?.optionId === loadoutChoice.optionId
    ? selection.source.equipmentUnitId
    : undefined;
}

export function optionalUnitId(
  unitId: UnitRecord["id"] | undefined,
): readonly UnitRecord["id"][] {
  return unitId == null ? [] : [unitId];
}

function readableForFinalization<T>(
  result: UnitReaderResult<T>,
  label: string,
): Either.Either<T, CreationFinalizationIssue> {
  if (result.tag === "unreadable") {
    const issueText = result.issues.map((issue) => issue.message).join("; ");
    return Either.left(
      illegalFinalizationIssue(
        `Cannot finalize unreadable ${label} Unit: ${issueText}`,
      ),
    );
  }

  return Either.right(result.value);
}

function unitForFinalization(
  unitLibrary: UnitCatalog,
  unitId: UnitRecord["id"],
  label: string,
): Either.Either<UnitRecord, CreationFinalizationIssue> {
  const unit = unitLibrary.getUnit(unitId);
  return Option.isSome(unit)
    ? Either.right(unit.value)
    : Either.left(
        illegalFinalizationIssue(
          `Cannot finalize unknown ${label} Unit: ${unitId}`,
        ),
      );
}

export function applyBackgroundAbilityScoreIncrease(
  baseScores: AbilityScoreAssignment,
  selection: BackgroundAbilityScoreIncreaseSelection,
  eligibleAbilities: readonly Ability[],
): Either.Either<AbilityScoreAssignment, CreationFinalizationIssue> {
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
): Either.Either<AbilityScoreAssignment, FinalizationIssues> {
  const deltasWithCaps: AbilityScoreIncreaseDeltaWithCap[] = [];
  const decodingIssues: CreationFinalizationIssue[] = [];
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
      if (Either.isLeft(decoded)) {
        decodingIssues.push(choiceOptionCodecFinalizationIssue(decoded.left));
        continue;
      }
      deltasWithCaps.push(...decoded.right);
    }
  }
  const collectedDecodingIssues = nonEmptyReadonlyArray(decodingIssues);
  if (collectedDecodingIssues != null) {
    return Either.left(collectedDecodingIssues);
  }

  const capIssues: CreationFinalizationIssue[] = [];
  let scores = baseScores;
  for (const delta of deltasWithCaps) {
    const currentScore = scores[delta.ability];
    if (currentScore + delta.increase > delta.maxScore) {
      capIssues.push(
        illegalFinalizationIssue(
          `Cannot apply class-feature ability-score increase: ${delta.ability} ${
            currentScore
          } + ${delta.increase} would exceed ${delta.maxScore}.`,
        ),
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
): CreationFinalizationIssue | undefined {
  const overCapDelta = deltas.find(
    (delta) =>
      baseScores[delta.ability] + delta.increase >
      BACKGROUND_ABILITY_SCORE_INCREASE_MAX_SCORE,
  );
  if (overCapDelta == null) {
    return undefined;
  }

  return illegalFinalizationIssue(
    `Cannot apply background ability-score increase: ${overCapDelta.ability} ${
      baseScores[overCapDelta.ability]
    } + ${overCapDelta.increase} would exceed ${BACKGROUND_ABILITY_SCORE_INCREASE_MAX_SCORE}.`,
  );
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function skillsFromChoiceSelection(
  selection: UnitChoiceSelection | undefined,
): readonly Skill[] {
  return selection == null
    ? []
    : choiceSelectionOptionIds(selection).flatMap((optionId) => {
        const skill = SKILLS.find((candidate) => candidate === optionId);
        return skill == null ? [] : [skill];
      });
}

function selectedBuildProficiencyChoiceSubjects(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterBuildProficiencyChoiceSubject[],
  FinalizationIssues
> {
  const classFeatureSubjects = decodedClassFeatureProficiencySubjects(
    selections,
    unitLibrary,
  );
  if (Either.isLeft(classFeatureSubjects)) {
    return Either.left(classFeatureSubjects.left);
  }

  const toolProficiencies = finalizedBuildToolProficiencies(selections);
  if (Either.isLeft(toolProficiencies)) {
    return Either.left(toolProficiencies.left);
  }

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
    ...classFeatureSubjects.right,
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
): Either.Either<readonly ToolProficiencyId[], FinalizationIssues> {
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
      if (!isCharacterBuildToolProficiencyId(String(optionId))) {
        return Either.left([
          illegalFinalizationIssue(
            `Unsupported background tool proficiency for finalized Character Build: ${optionId}.`,
          ),
        ]);
      }
      const parsed = parseToolProficiencyId(String(optionId));
      if (Either.isLeft(parsed)) {
        return Either.left([choiceOptionCodecFinalizationIssue(parsed.left)]);
      }
      backgroundToolIds.push(parsed.right);
    }
  }

  return Either.right(uniqueValues(backgroundToolIds));
}

function finalizedBuildSurfaceToolProficiencyIds(
  subjects: readonly ProficiencyGrantSubject[],
): Either.Either<readonly ToolProficiencyId[], FinalizationIssues> {
  const toolIds: ToolProficiencyId[] = [];
  for (const subject of subjects) {
    if (subject.kind !== "tool") continue;
    if (!isCharacterBuildToolProficiencyId(subject.toolId)) {
      return Either.left([
        illegalFinalizationIssue(
          `Unsupported tool proficiency for finalized Character Build: ${subject.toolId}.`,
        ),
      ]);
    }
    const parsed = parseToolProficiencyId(subject.toolId);
    if (Either.isLeft(parsed)) {
      return Either.left([choiceOptionCodecFinalizationIssue(parsed.left)]);
    }
    toolIds.push(parsed.right);
  }
  return Either.right(toolIds);
}

function decodedClassFeatureProficiencySubjects(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterBuildProficiencyChoiceSubject[],
  FinalizationIssues
> {
  const subjects: CharacterBuildProficiencyChoiceSubject[] = [];
  const issues: CreationFinalizationIssue[] = [];
  for (const selection of selections.choices) {
    if (selection.kind !== "unitChoice") {
      continue;
    }

    if (selection.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY) {
      if (isGrantExpertiseSelection(selection, unitLibrary)) {
        subjects.push(
          ...expertiseSubjectsForSelection(selection, selections, unitLibrary),
        );
        continue;
      }

      for (const optionId of choiceSelectionOptionIds(selection)) {
        const decoded = decodeProficiencyGrantSubjectOptionId(optionId);
        if (Either.isLeft(decoded)) {
          issues.push(choiceOptionCodecFinalizationIssue(decoded.left));
          continue;
        }
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
      if (Either.isLeft(decoded)) {
        issues.push(choiceOptionCodecFinalizationIssue(decoded.left));
        continue;
      }
      subjects.push(decoded.right);
    }
  }

  const collectedIssues = nonEmptyReadonlyArray(issues);
  return collectedIssues == null
    ? Either.right(subjects)
    : Either.left(collectedIssues);
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
  if (skillSource === undefined) {
    return [];
  }
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
    return skill != null && eligibleSkills.includes(skill)
      ? [{ kind: "skill_expertise" as const, skill }]
      : [];
  });
}

function selectedSkillProficiencies(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): readonly Skill[] {
  const backgroundSkills = backgroundSkillProficiencies(
    selections.background,
    unitLibrary,
  );
  const selectedSkills = skillProficienciesFromChoiceSelections(
    selections.choices,
    (selection) =>
      selection.kind === "unitChoice" &&
      isGrantExpertiseSelection(selection, unitLibrary),
  );

  return uniqueValues([...backgroundSkills, ...selectedSkills]);
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
  if (Option.isNone(backgroundUnit)) {
    return [];
  }
  const facts = readBackgroundCreationFacts(backgroundUnit.value);
  return facts.tag === "readable" ? facts.value.skillProficiencies : [];
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
  if (mechanics === undefined) {
    return [];
  }
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
      return Either.isRight(decoded) ? [decoded.right] : [];
    });
}

function isMulticlassProficiencyChoiceKey(choiceKey: UnitChoiceKey): boolean {
  return MULTICLASS_PROFICIENCY_CHOICE_KEYS.some(
    (multiclassChoiceKey) => multiclassChoiceKey === choiceKey,
  );
}

export function resourceForFeature(
  unit: UnitRecord,
): readonly CharacterBuildResource[] {
  if (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "activation" &&
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

export function uniqueValues<T>(values: readonly T[]): readonly T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}
