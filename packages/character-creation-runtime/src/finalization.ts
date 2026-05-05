import { Either, Option } from "effect";
import { isValidAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import { hp } from "@dnd/shared/types";
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
  Skill,
  StartingEquipmentChoice,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { discoverCreationHoles } from "./discovery.ts";
import { type CharacterProgression } from "./character-progression-algebra.ts";
import {
  classLevelForUnit,
  hitPointsAfterLevelOneMultiplier,
  progressionClassUnitIds,
  startingClassUnitId,
} from "./character-progression-types.ts";
import {
  backgroundToolChoiceSpec,
  classFeatureGrantChoiceHoles,
  choiceSelectionOptionIds,
  choiceSelectionMatchesHole,
  sameCreationHoleSource,
  sameOptionIdMultiset,
  startingEquipmentChoiceHole,
} from "./discovery.ts";
import {
  choiceHole,
  loadoutSource,
  skillOption,
  unitSource,
} from "./hole-factories.ts";
import {
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  FIGHTER_SKILL_CHOICE_KEY,
  EXACTLY_ONE_CHOICE,
  WIZARD_CANTRIP_CHOICE_KEY,
  WIZARD_PREPARED_SPELL_CHOICE_KEY,
  WIZARD_SKILL_CHOICE_KEY,
  WIZARD_SPELLBOOK_CHOICE_KEY,
  SURFACE_ABILITIES,
} from "./phase1-manifest.ts";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  isSupportedProgression,
  supportedLoadoutChoiceForSource,
  supportedLoadoutChoices,
  unitRefsForSupportedClassChoice,
} from "./support-gates.ts";
import {
  characterEquipmentItemId,
  characterEquipmentItemSourceFromId,
  characterEquipmentItemUnitIdFromLoadoutEquipmentUnitId,
  creationChoiceOptionId,
  choiceCardinalityBounds,
  exactChoiceCardinality,
  hitDieSize,
  hitDieTotal,
  nonEmptyReadonlyArray,
  loadoutSourceKey,
  unitChoiceSourceKey,
  type AbilityScoreAssignment,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterBuild,
  type CharacterBuildEquipment,
  type CharacterEquipmentItemId,
  type CharacterBuildFeature,
  type CharacterBuildResource,
  type CharacterBuildSpellcasting,
  type CreationChoiceOption,
  type CharacterChoiceSelection,
  type ChoiceCreationHole,
  type CreationHole,
  type CharacterDraft,
  type CreationChoiceOptionId,
  type CreationFinalizationIssue,
  type CreationFinalizationResult,
  type FinalizedCharacterSelections,
  type NonEmptyReadonlyArray,
  type UnitCatalog,
  type LoadoutEquipmentUnitId,
  type LoadoutSourceKey,
  type UnitChoiceSourceKey,
  type UnitChoiceSource,
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

export function finalizeCharacterDraft(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): CreationFinalizationResult {
  const holes = discoverCreationHoles(input);
  const openHoles = nonEmptyReadonlyArray(holes);
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

  const supportedSelections = temporarySupportedSliceSelections(
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
      issues: [build.left],
    };
  }

  return {
    tag: "ready",
    build: build.right,
  };
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
    languages: selections.languages,
    alignment: selections.alignment,
    choices: selections.choices,
    equipment: selections.equipment,
  };
}

// Temporary executable-width gate. This is not the final rules-legality model:
// it rejects complete drafts that are legal for the active rules corpus but
// that the current runtime cannot yet project or execute. Remove this boundary
// as implemented creation coverage reaches the project's supported content set.
export function temporarySupportedSliceIssues(
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
      selections.species ===
        CHARACTER_CREATION_SUPPORT_PROFILE.manifest.speciesUnitId,
      "Finalized build must use the supported manifest species.",
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
      selectedPreparedSpellsAreInSelectedSpellbook(selections, unitLibrary),
      "Finalized Wizard prepared spells must be selected from the spellbook and match available Spell Slot levels.",
    ),
    ...expectedValueIssue(
      isSupportedEquipmentSelection(selections),
      "Finalized build must own supported purchased equipment.",
    ),
  ];
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

const TemporarySupportedSliceSelections = Symbol(
  "TemporarySupportedSliceSelections",
);

type TemporarySupportedSliceSelections = {
  readonly selections: FinalizedCharacterSelections;
  readonly progression: CharacterProgression;
  readonly unitChoices: readonly UnitChoiceSelection[];
  readonly loadoutChoices: readonly LoadoutChoiceSelection[];
  readonly [TemporarySupportedSliceSelections]: true;
};

function temporarySupportedSliceSelections(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): Either.Either<
  TemporarySupportedSliceSelections,
  NonEmptyReadonlyArray<CreationFinalizationIssue>
> {
  const issues = nonEmptyReadonlyArray([
    ...temporarySupportedSliceIssues(selections, unitLibrary),
  ]);
  if (issues != null) {
    return Either.left(issues);
  }

  return Either.right({
    selections,
    progression: selections.progression,
    unitChoices: unitChoiceSelections(selections),
    loadoutChoices: loadoutChoiceSelections(selections),
    [TemporarySupportedSliceSelections]: true,
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

export function illegalFinalizationIssue(
  message: string,
): CreationFinalizationIssue {
  return {
    tag: "illegalFinalization",
    code: "illegalFinalization",
    message,
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
  return (
    isSupportedProgression(selections.progression) &&
    progressionClassUnitIds(selections.progression).length === 1
  );
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
  const finalScores = applyBackgroundAbilityScoreIncrease(
    baseScores,
    selection,
    eligible,
  );

  if (SURFACE_ABILITIES.some((ability) => finalScores[ability] > 20)) {
    return false;
  }

  if (selection.kind === "oneEach") {
    return true;
  }

  return (
    eligible.includes(selection.plusTwo) && eligible.includes(selection.plusOne)
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
  readonly supportedSelections: TemporarySupportedSliceSelections;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterBuild, CreationFinalizationIssue> {
  // Project the selected supported single-class progression, not only level 1.
  // The temporary finalization gate rejects multiclass progressions until this
  // projection derives features, HP, and Hit Dice from every class entry.
  const { selections } = input.supportedSelections;
  const progression = input.supportedSelections.progression;
  const selectedClassUnitId = startingClassUnitId(progression);
  const selectedClassLevel = classLevelForUnit(
    progression,
    selectedClassUnitId,
  );
  const classUnit = unitForFinalization(
    input.unitLibrary,
    selectedClassUnitId,
    "class",
  );
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  const classFacts = readableForFinalization(
    readClassCreationFacts(classUnit.right),
    "class",
  );
  if (Either.isLeft(classFacts)) return Either.left(classFacts.left);
  const backgroundUnit = unitForFinalization(
    input.unitLibrary,
    selections.background,
    "background",
  );
  if (Either.isLeft(backgroundUnit)) return Either.left(backgroundUnit.left);
  const backgroundFacts = readableForFinalization(
    readBackgroundCreationFacts(backgroundUnit.right),
    "background",
  );
  if (Either.isLeft(backgroundFacts)) return Either.left(backgroundFacts.left);
  const speciesUnit = unitForFinalization(
    input.unitLibrary,
    selections.species,
    "species",
  );
  if (Either.isLeft(speciesUnit)) return Either.left(speciesUnit.left);
  const speciesFacts = readableForFinalization(
    readSpeciesCreationFacts(speciesUnit.right),
    "species",
  );
  if (Either.isLeft(speciesFacts)) return Either.left(speciesFacts.left);
  const baseScores = selections.abilityScoreGeneration.assignedScores;
  const finalScores = applyBackgroundAbilityScoreIncrease(
    baseScores,
    selections.backgroundAbilityScoreIncrease,
    backgroundFacts.right.abilityScoreIncrease.abilities,
  );
  const classFeatureGrants = classFacts.right.featureGrants.filter(
    (grant) => grant.level <= selectedClassLevel,
  );
  const classFeatureUnitIds = classFeatureGrants.map((grant) => grant.unitId);
  const buildSpellcasting = finalizedBuildSpellcasting(
    classFacts.right,
    input.supportedSelections,
  );
  const buildFeatures: readonly CharacterBuildFeature[] = [
    ...classFeatureGrants.map((grant) => ({
      kind: "classFeature" as const,
      unitId: grant.unitId,
    })),
    {
      kind: "backgroundOriginFeat",
      unitId: backgroundFacts.right.originFeatId,
    },
    ...Object.values(speciesFacts.right.traits).map((unitId) => ({
      kind: "speciesTrait" as const,
      unitId,
    })),
    ...finalizedClassChoiceFeaturesForSupportedChoices(
      input.supportedSelections.unitChoices,
    ),
  ];
  const buildEquipment = finalizedBuildEquipmentForSupportedLoadoutChoices(
    input.supportedSelections.loadoutChoices,
  );
  const hitPointsAfterLevelOne =
    hitPointsAfterLevelOneMultiplier(progression) *
    fixedHitPointsAfterLevelOne(classFacts.right.hitPointDie, finalScores.con);

  return Either.right({
    progression,
    background: selections.background,
    species: selections.species,
    originLanguages: selections.languages,
    alignment: selections.alignment,
    abilityScores: finalScores,
    hitPoints: {
      maximum: hp(
        classFacts.right.hitPointDie +
          abilityModifier(finalScores.con) +
          hitPointsAfterLevelOne,
      ),
      hitDice: [
        {
          classUnitId: selectedClassUnitId,
          dieSize: hitDieSize(classFacts.right.hitPointDie),
          total: hitDieTotal(selectedClassLevel),
        },
      ],
    },
    proficiencies: {
      savingThrows: classFacts.right.savingThrowProficiencies,
      skills: uniqueValues([
        ...finalizedBuildSkillProficiencies(selections, classFacts.right),
        ...backgroundFacts.right.skillProficiencies,
      ]),
      weapon: classFacts.right.weaponProficiencies,
      tools: finalizedBuildToolProficiencies(selections),
    },
    armorTraining: classFacts.right.armorTraining,
    features: buildFeatures,
    resources: classFeatureUnitIds.flatMap((unitId) => {
      const unit = input.unitLibrary.getUnit(unitId);
      return Option.isSome(unit) ? resourceForFeature(unit.value) : [];
    }),
    ...(buildSpellcasting == null ? {} : { spellcasting: buildSpellcasting }),
    equipment: buildEquipment,
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

export function allFinalizedChoicesSupported(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): boolean {
  const selectedClassUnitId = startingClassUnitId(selections.progression);
  const classUnit = unitLibrary.getUnit(selectedClassUnitId);
  if (Option.isNone(classUnit)) return false;
  const classFacts = readClassCreationFacts(classUnit.value);
  if (classFacts.tag !== "readable") return false;
  const backgroundUnit = unitLibrary.getUnit(selections.background);
  if (Option.isNone(backgroundUnit)) return false;
  const backgroundFacts = readBackgroundCreationFacts(backgroundUnit.value);
  if (backgroundFacts.tag !== "readable") return false;
  const classLevel = classLevelForUnit(
    selections.progression,
    selectedClassUnitId,
  );
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
    classLevel,
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
  readonly classLevel: number;
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
        input.classFacts.className === "wizard"
          ? WIZARD_SKILL_CHOICE_KEY
          : FIGHTER_SKILL_CHOICE_KEY,
      ),
      cardinality: exactChoiceCardinality(
        input.classFacts.skillProficiencyChoice.choose,
      ),
      options: input.classFacts.skillProficiencyChoice.options.map(skillOption),
    }),
  );
  const classFeatureHoles = input.classFacts.featureGrants
    .filter((grant) => grant.level <= input.classLevel)
    .flatMap((grant) =>
      classFeatureGrantChoiceHoles(grant.unitId, input.unitLibrary),
    )
    .flatMap((hole) => {
      const unitHole = requireUnitChoiceCreationHole(hole);
      return unitHole === undefined ? [] : [unitHole];
    });
  const wizardSpellHoles =
    input.classFacts.className === "wizard"
      ? wizardSpellcastingChoiceHoles(
          startingClassUnitId(input.selections.progression),
          input.classFacts,
        )
      : [];
  const backgroundToolHole = backgroundToolChoiceSpec(
    input.backgroundFacts.toolProficiency,
  );
  const selectedEquipment = new Set(input.selections.equipment.selectedUnitIds);

  return [
    classSkillHole,
    ...classFeatureHoles,
    ...wizardSpellHoles,
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

function wizardSpellcastingChoiceHoles(
  classUnitId: UnitRecord["id"],
  classFacts: Extract<ClassCreationFacts, { readonly className: "wizard" }>,
): readonly UnitChoiceCreationHole[] {
  const spellcasting = classFacts.spellcasting;
  return compact([
    requireUnitChoiceCreationHole(
      choiceHole({
        source: unitSource(classUnitId, WIZARD_CANTRIP_CHOICE_KEY),
        cardinality: exactChoiceCardinality(spellcasting.cantripAccess.choose),
        options: spellcasting.cantripAccess.spellIds.map((spellId) => ({
          optionId: creationChoiceOptionId(spellId),
          label: spellId,
          unitRef: { unitId: spellId },
        })),
      }),
    ),
    requireUnitChoiceCreationHole(
      choiceHole({
        source: unitSource(classUnitId, WIZARD_SPELLBOOK_CHOICE_KEY),
        cardinality: exactChoiceCardinality(
          spellcasting.spellbookAccess.choose,
        ),
        options: spellcasting.spellbookAccess.spells.map((spell) => ({
          optionId: creationChoiceOptionId(spell.spellId),
          label: spell.spellId,
          unitRef: { unitId: spell.spellId },
        })),
      }),
    ),
    requireUnitChoiceCreationHole(
      choiceHole({
        source: unitSource(classUnitId, WIZARD_PREPARED_SPELL_CHOICE_KEY),
        cardinality: exactChoiceCardinality(spellcasting.preparedAccess.choose),
        options: spellcasting.preparedAccess.spellIds.map((spellId) => ({
          optionId: creationChoiceOptionId(spellId),
          label: spellId,
          unitRef: { unitId: spellId },
        })),
      }),
    ),
  ]);
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
  return selections.equipment.selectedUnitIds.every((unitId) =>
    (
      CHARACTER_CREATION_SUPPORT_PROFILE.purchasableEquipmentUnitIds as readonly string[]
    ).includes(unitId),
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
): readonly UnitRef[] {
  return unitRefs(
    ...progressionClassUnitIds(build.progression),
    build.background,
    build.species,
    ...build.features.map((feature) => feature.unitId),
    ...optionalUnitId(build.equipment.armor),
    ...optionalUnitId(build.equipment.shield),
    ...optionalEquipmentItemUnitId(build.equipment.weapon?.itemId),
    ...optionalEquipmentItemUnitId(build.equipment.offHandWeapon?.itemId),
    ...(build.spellcasting?.cantrips ?? []),
    ...(build.spellcasting?.spellbook.map((spell) => spell.spellId) ?? []),
    ...(build.spellcasting?.preparedSpells ?? []),
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
  return unitChoices.flatMap((selection) =>
    unitRefsForSupportedClassChoice(selection.source, selection.options).map(
      (unitId) => ({
        kind: "classChoice" as const,
        unitId,
        choiceKey: selection.source.choiceKey,
      }),
    ),
  );
}

export function finalizedBuildEquipment(
  selections: FinalizedCharacterSelections,
): CharacterBuildEquipment {
  return finalizedBuildEquipmentForSupportedLoadoutChoices(
    loadoutChoiceSelections(selections),
  );
}

function finalizedBuildEquipmentForSupportedLoadoutChoices(
  loadoutChoices: readonly LoadoutChoiceSelection[],
): CharacterBuildEquipment {
  return loadoutChoices.reduce<CharacterBuildEquipment>(
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
        return { ...equipment, armor: selectedUnitId };
      }

      if (loadoutChoice.buildSlot === "shield") {
        return { ...equipment, shield: selectedUnitId };
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
}

export function finalizedBuildSpellcasting(
  classFacts: ClassCreationFacts,
  supportedSelections: TemporarySupportedSliceSelections,
): CharacterBuildSpellcasting | undefined {
  if (!isWizardClassCreationFacts(classFacts)) {
    return undefined;
  }

  const spellcasting = classFacts.spellcasting;
  return {
    spellcastingAbility: spellcasting.spellcastingAbility,
    cantrips: selectedUnitRefsForChoice(
      supportedSelections.unitChoices,
      WIZARD_CANTRIP_CHOICE_KEY,
    ),
    spellbook: spellcasting.spellbookAccess.spells.filter((spell) =>
      selectedUnitRefsForChoice(
        supportedSelections.unitChoices,
        WIZARD_SPELLBOOK_CHOICE_KEY,
      ).includes(spell.spellId),
    ),
    preparedSpells: selectedUnitRefsForChoice(
      supportedSelections.unitChoices,
      WIZARD_PREPARED_SPELL_CHOICE_KEY,
    ),
    spellSlots: spellcasting.spellSlotProjection.slots,
    spellcastingFocuses: spellcasting.spellcastingFocuses,
  };
}

function isWizardClassCreationFacts(
  facts: ClassCreationFacts,
): facts is WizardClassCreationFacts {
  return facts.className === "wizard";
}

function selectedUnitRefsForChoice(
  unitChoices: readonly UnitChoiceSelection[],
  choiceKey:
    | typeof WIZARD_CANTRIP_CHOICE_KEY
    | typeof WIZARD_SPELLBOOK_CHOICE_KEY
    | typeof WIZARD_PREPARED_SPELL_CHOICE_KEY,
): readonly UnitRecord["id"][] {
  return unitChoices
    .filter((choice) => choice.source.choiceKey === choiceKey)
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

function optionalEquipmentItemUnitId(
  itemId: CharacterEquipmentItemId | undefined,
): readonly UnitRecord["id"][] {
  if (itemId == null) {
    return [];
  }

  return [characterEquipmentItemSourceFromId(itemId).unitId];
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
): AbilityScoreAssignment {
  if (selection.kind === "oneEach") {
    return eligibleAbilities.reduce(
      (scores, ability) => ({
        ...scores,
        [ability]: scores[ability] + 1,
      }),
      baseScores,
    );
  }

  return {
    ...baseScores,
    [selection.plusTwo]: baseScores[selection.plusTwo] + 2,
    [selection.plusOne]: baseScores[selection.plusOne] + 1,
  };
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function finalizedBuildSkillProficiencies(
  selections: FinalizedCharacterSelections,
  classFacts?: ClassCreationFacts,
): readonly Skill[] {
  const skillChoiceKey =
    classFacts?.className === "wizard"
      ? WIZARD_SKILL_CHOICE_KEY
      : FIGHTER_SKILL_CHOICE_KEY;
  const skillSelection = selections.choices.find(
    (selection) =>
      selection.kind === "unitChoice" &&
      sameCreationHoleSource(
        selection.source,
        unitSource(startingClassUnitId(selections.progression), skillChoiceKey),
      ),
  );

  return skillSelection == null
    ? []
    : choiceSelectionOptionIds(skillSelection).flatMap((optionId) => {
        const skill = SKILLS.find((candidate) => candidate === optionId);
        return skill == null ? [] : [skill];
      });
}

export function finalizedBuildToolProficiencies(
  selections: FinalizedCharacterSelections,
): readonly CreationChoiceOptionId[] {
  const toolSelection = selections.choices.find(
    (selection) =>
      selection.kind === "unitChoice" &&
      sameCreationHoleSource(
        selection.source,
        unitSource(selections.background, BACKGROUND_TOOL_CHOICE_KEY),
      ),
  );

  return toolSelection == null ? [] : choiceSelectionOptionIds(toolSelection);
}

export function resourceForFeature(
  unit: UnitRecord,
): readonly CharacterBuildResource[] {
  if (unit.kind !== "class_feature") {
    return [];
  }

  return unit.mechanics.family === "activation" &&
    unit.mechanics.resource !== undefined
    ? [{ unitId: unit.id, resource: unit.mechanics.resource }]
    : [];
}

export function unitRefs(
  ...unitIds: readonly UnitRecord["id"][]
): readonly UnitRef[] {
  return uniqueValues(unitIds).map((unitId) => ({ unitId }));
}

export function uniqueValues<T>(values: readonly T[]): readonly T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}
