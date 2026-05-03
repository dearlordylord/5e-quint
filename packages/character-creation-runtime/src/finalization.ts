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
import {
  backgroundToolChoiceSpec,
  classFeatureGrantChoiceHoles,
  choiceSelectionOptionIds,
  choiceSelectionMatchesHole,
  sameCreationHoleSource,
  sameOptionIdMultiset,
  startingEquipmentChoiceHole,
} from "./discovery.ts";
import { choiceHole, skillOption, unitSource } from "./hole-factories.ts";
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
  isSupportedAdvancement,
  supportedLoadoutChoiceForSource,
  supportedLoadoutChoices,
  unitRefsForSupportedClassChoice,
} from "./support-gates.ts";
import {
  creationChoiceOptionId,
  characterClassLevel,
  choiceCardinalityBounds,
  exactChoiceCardinality,
  hitDieSize,
  hitDieTotal,
  nonEmptyReadonlyArray,
  type AbilityScoreAssignment,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterBuild,
  type CharacterBuildEquipment,
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
  type UnitChoiceSource,
  type UnitRef,
} from "./types.ts";

type UnitChoiceCreationHole = ChoiceCreationHole & {
  readonly source: UnitChoiceSource;
};

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
  if (supportedSelections.tag === "rejected") {
    return {
      tag: "invalid",
      issues: supportedSelections.issues,
    };
  }

  return {
    tag: "ready",
    build: buildCharacterBuild({
      supportedSelections: supportedSelections.value,
      unitLibrary: input.unitLibrary,
    }),
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
    selections.primaryClass == null ||
    selections.advancement == null ||
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
    primaryClass: selections.primaryClass,
    advancement: selections.advancement,
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
      (
        CHARACTER_CREATION_SUPPORT_PROFILE.classUnitIds as readonly string[]
      ).includes(selections.primaryClass),
      "Finalized build must use a supported class.",
    ),
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
      isSupportedSingleClassAdvancement(selections),
      "Finalized build advancement must match a supported class level.",
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
      "Finalized build must carry exactly the supported choices for the selected class level.",
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
  const classFacts = readClassCreationFacts(
    unitLibrary.requireUnit(selections.primaryClass),
  );
  if (
    classFacts.tag !== "readable" ||
    !isWizardClassCreationFacts(classFacts.value)
  ) {
    return true;
  }

  const spellcasting = classFacts.value.spellcasting;
  const selectedSpellbook = new Set(
    selectedUnitRefsForChoice(selections, WIZARD_SPELLBOOK_CHOICE_KEY),
  );
  const selectedPrepared = selectedUnitRefsForChoice(
    selections,
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
  readonly [TemporarySupportedSliceSelections]: true;
};

type TemporarySupportedSliceSelectionsResult =
  | {
      readonly tag: "accepted";
      readonly value: TemporarySupportedSliceSelections;
    }
  | {
      readonly tag: "rejected";
      readonly issues: NonEmptyReadonlyArray<CreationFinalizationIssue>;
    };

function temporarySupportedSliceSelections(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): TemporarySupportedSliceSelectionsResult {
  const issues = nonEmptyReadonlyArray(
    temporarySupportedSliceIssues(selections, unitLibrary),
  );
  return issues == null
    ? {
        tag: "accepted",
        value: {
          selections,
          [TemporarySupportedSliceSelections]: true,
        },
      }
    : { tag: "rejected", issues };
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

export function isSupportedSingleClassAdvancement(
  selections: Pick<
    FinalizedCharacterSelections,
    "primaryClass" | "advancement"
  >,
): boolean {
  return (
    selections.advancement.entries.length === 1 &&
    selections.advancement.entries[0]?.classUnitId ===
      selections.primaryClass &&
    isSupportedAdvancement(
      selections.advancement.entries[0].classUnitId,
      selections.advancement.entries[0].level,
    )
  );
}

export function isSupportedBackgroundAbilityScoreIncrease(
  selection: BackgroundAbilityScoreIncreaseSelection,
  unitLibrary: UnitCatalog,
  backgroundUnitId: UnitRecord["id"],
  baseScores: AbilityScoreAssignment,
): boolean {
  const background = unitLibrary.requireUnit(backgroundUnitId);
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
}): CharacterBuild {
  // Project the selected supported class level, not only level 1. The current
  // temporary gate is single-class, but Fighter 2 and Wizard 1 both flow through
  // this same build projection.
  const { selections } = input.supportedSelections;
  const classFacts = requireReadable(
    readClassCreationFacts(
      input.unitLibrary.requireUnit(selections.primaryClass),
    ),
    "class",
  );
  const backgroundFacts = requireReadable(
    readBackgroundCreationFacts(
      input.unitLibrary.requireUnit(selections.background),
    ),
    "background",
  );
  const speciesFacts = requireReadable(
    readSpeciesCreationFacts(input.unitLibrary.requireUnit(selections.species)),
    "species",
  );
  const baseScores = selections.abilityScoreGeneration.assignedScores;
  const finalScores = applyBackgroundAbilityScoreIncrease(
    baseScores,
    selections.backgroundAbilityScoreIncrease,
    backgroundFacts.abilityScoreIncrease.abilities,
  );
  const selectedClassLevel = selections.advancement.entries[0]?.level ?? 1;
  const classFeatureGrants = classFacts.featureGrants.filter(
    (grant) => grant.level <= selectedClassLevel,
  );
  const classFeatureUnitIds = classFeatureGrants.map((grant) => grant.unitId);
  const buildSpellcasting = finalizedBuildSpellcasting(classFacts, selections);
  const buildFeatures: readonly CharacterBuildFeature[] = [
    ...classFeatureGrants.map((grant) => ({
      kind: "classFeature" as const,
      unitId: grant.unitId,
      level: characterClassLevel(grant.level),
    })),
    {
      kind: "backgroundOriginFeat",
      unitId: backgroundFacts.originFeatId,
    },
    ...Object.values(speciesFacts.traits).map((unitId) => ({
      kind: "speciesTrait" as const,
      unitId,
    })),
    ...finalizedClassChoiceFeatures(selections),
  ];
  const buildEquipment = finalizedBuildEquipment(selections);

  return {
    advancement: selections.advancement,
    background: selections.background,
    species: selections.species,
    originLanguages: selections.languages,
    alignment: selections.alignment,
    abilityScores: finalScores,
    hitPoints: {
      maximum: hp(
        classFacts.hitPointDie +
          abilityModifier(finalScores.con) +
          (selectedClassLevel - 1) *
            fixedHitPointsAfterLevelOne(
              classFacts.hitPointDie,
              finalScores.con,
            ),
      ),
      hitDice: [
        {
          classUnitId: selections.primaryClass,
          dieSize: hitDieSize(classFacts.hitPointDie),
          total: hitDieTotal(selectedClassLevel),
        },
      ],
    },
    proficiencies: {
      savingThrows: classFacts.savingThrowProficiencies,
      skills: uniqueValues([
        ...finalizedBuildSkillProficiencies(selections, classFacts),
        ...backgroundFacts.skillProficiencies,
      ]),
      weapon: classFacts.weaponProficiencies,
      tools: finalizedBuildToolProficiencies(selections),
    },
    armorTraining: classFacts.armorTraining,
    features: buildFeatures,
    resources: classFeatureUnitIds.flatMap((unitId) =>
      resourceForFeature(input.unitLibrary.requireUnit(unitId)),
    ),
    ...(buildSpellcasting == null ? {} : { spellcasting: buildSpellcasting }),
    equipment: buildEquipment,
  };
}

function fixedHitPointsAfterLevelOne(
  hitPointDie: number,
  constitutionScore: number,
): number {
  return Math.max(
    1,
    Math.floor(hitPointDie / 2) + 1 + abilityModifier(constitutionScore),
  );
}

export function allFinalizedChoicesSupported(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): boolean {
  const classFacts = requireReadable(
    readClassCreationFacts(unitLibrary.requireUnit(selections.primaryClass)),
    "class",
  );
  const backgroundFacts = requireReadable(
    readBackgroundCreationFacts(unitLibrary.requireUnit(selections.background)),
    "background",
  );
  const classLevel = selections.advancement.entries[0]?.level ?? 1;
  const classEquipmentHole = requireUnitChoiceCreationHole(
    startingEquipmentChoiceHole(
      unitSource(selections.primaryClass, CLASS_EQUIPMENT_CHOICE_KEY),
      classFacts.startingEquipment,
    ),
  );
  const backgroundEquipmentHole = requireUnitChoiceCreationHole(
    startingEquipmentChoiceHole(
      unitSource(selections.background, BACKGROUND_EQUIPMENT_CHOICE_KEY),
      backgroundFacts.startingEquipment,
    ),
  );
  const supportedHolesBySource = supportedChoiceHolesBySource(
    supportedFinalizationChoiceHoles({
      selections,
      classFacts,
      classLevel,
      backgroundFacts,
      unitLibrary,
      classEquipmentHole,
      backgroundEquipmentHole,
    }),
  );
  const choiceSourceKeys = selections.choices.map((choice) =>
    unitChoiceSourceKey(choice.source),
  );

  return (
    new Set(choiceSourceKeys).size === choiceSourceKeys.length &&
    selections.choices.every((choice) => {
      const supportedHole = supportedHolesBySource.get(
        unitChoiceSourceKey(choice.source),
      );
      if (supportedHole == null || !choiceSelectionMatchesHole(choice, supportedHole)) {
        return false;
      }

      if (sameCreationHoleSource(choice.source, classEquipmentHole.source)) {
        return supportedStartingEquipmentCoinGrantChoice(
          choice,
          selections.primaryClass,
          CLASS_EQUIPMENT_CHOICE_KEY,
          classFacts.startingEquipment,
        );
      }

      if (sameCreationHoleSource(choice.source, backgroundEquipmentHole.source)) {
        return supportedStartingEquipmentCoinGrantChoice(
          choice,
          selections.background,
          BACKGROUND_EQUIPMENT_CHOICE_KEY,
          backgroundFacts.startingEquipment,
        );
      }

      return (
        !sameCreationHoleSource(choice.source, classEquipmentHole.source) &&
        !sameCreationHoleSource(choice.source, backgroundEquipmentHole.source)
      );
    })
  );
}

function unitChoiceSourceKey(
  source: UnitChoiceSource,
): string {
  return (
    `${source.unitId}:${source.choiceKey}`
  );
}

export function supportedChoiceHolesBySource(
  holes: readonly UnitChoiceCreationHole[],
): ReadonlyMap<string, UnitChoiceCreationHole> {
  const bySource = new Map<string, UnitChoiceCreationHole>();
  for (const hole of holes) {
    const sourceKey = unitChoiceSourceKey(hole.source);
    const existing = bySource.get(sourceKey);
    if (existing == null) {
      bySource.set(sourceKey, hole);
      continue;
    }

    bySource.set(sourceKey, mergeChoiceHoles(existing, hole));
  }

  return bySource;
}

function mergeChoiceHoles(
  left: UnitChoiceCreationHole,
  right: UnitChoiceCreationHole,
): UnitChoiceCreationHole {
  if (!sameChoiceCardinality(left, right)) {
    throw new Error(
      `Conflicting choice cardinality for source ${unitChoiceSourceKey(left.source)}.`,
    );
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
  return leftBounds.min === rightBounds.min && leftBounds.max === rightBounds.max;
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
}): readonly UnitChoiceCreationHole[] {
  const classSkillHole = requireUnitChoiceCreationHole(
    choiceHole({
      source: unitSource(
        input.selections.primaryClass,
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
    .map((hole) => requireUnitChoiceCreationHole(hole));
  const wizardSpellHoles =
    input.classFacts.className === "wizard"
      ? wizardSpellcastingChoiceHoles(input.selections.primaryClass, input.classFacts)
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
      : [
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
        ]),
    input.classEquipmentHole,
    input.backgroundEquipmentHole,
    ...supportedLoadoutChoices().flatMap((loadoutChoice) =>
      selectedEquipment.has(loadoutChoice.unitId)
        ? [
            requireUnitChoiceCreationHole(
              choiceHole({
                source: unitSource(loadoutChoice.unitId, loadoutChoice.choiceKey),
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
          ]
        : [],
    ),
  ];
}

function wizardSpellcastingChoiceHoles(
  classUnitId: UnitRecord["id"],
  classFacts: Extract<ClassCreationFacts, { readonly className: "wizard" }>,
): readonly UnitChoiceCreationHole[] {
  const spellcasting = classFacts.spellcasting;
  return [
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
        cardinality: exactChoiceCardinality(spellcasting.spellbookAccess.choose),
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
  ];
}

function requireChoiceCreationHole(hole: CreationHole): ChoiceCreationHole {
  if (hole.kind !== "choice") {
    throw new Error("Expected a choice creation hole.");
  }

  return hole;
}

function isUnitChoiceCreationHole(
  hole: ChoiceCreationHole,
): hole is UnitChoiceCreationHole {
  return hole.source.tag === "unit";
}

function requireUnitChoiceCreationHole(hole: CreationHole): UnitChoiceCreationHole {
  const choice = requireChoiceCreationHole(hole);
  if (!isUnitChoiceCreationHole(choice)) {
    throw new Error("Expected a unit-sourced choice creation hole.");
  }

  return choice;
}

function supportedStartingEquipmentCoinGrantChoice(
  selection: CharacterChoiceSelection,
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
    | "advancement"
    | "background"
    | "species"
    | "features"
    | "equipment"
    | "spellcasting"
  >,
): readonly UnitRef[] {
  return unitRefs(
    ...build.advancement.entries.map((entry) => entry.classUnitId),
    build.background,
    build.species,
    ...build.features.map((feature) => feature.unitId),
    ...optionalUnitId(build.equipment.armor),
    ...optionalUnitId(build.equipment.shield),
    ...optionalUnitId(build.equipment.weapon?.unitId),
    ...optionalUnitId(build.equipment.offHandWeapon?.unitId),
    ...(build.spellcasting?.cantrips ?? []),
    ...(build.spellcasting?.spellbook.map((spell) => spell.spellId) ?? []),
    ...(build.spellcasting?.preparedSpells ?? []),
  );
}

export function finalizedClassChoiceFeatures(
  selections: FinalizedCharacterSelections,
): readonly CharacterBuildFeature[] {
  return selections.choices.flatMap((selection) =>
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
  return selections.choices.reduce<CharacterBuildEquipment>(
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
          itemId: `main:${selectedUnitId}`,
          unitId: selectedUnitId,
          grip: loadoutChoice.grip,
        },
      };
    },
    {},
  );
}

export function finalizedBuildSpellcasting(
  classFacts: ClassCreationFacts,
  selections: FinalizedCharacterSelections,
): CharacterBuildSpellcasting | undefined {
  if (!isWizardClassCreationFacts(classFacts)) {
    return undefined;
  }

  const spellcasting = classFacts.spellcasting;
  return {
    spellcastingAbility: spellcasting.spellcastingAbility,
    cantrips: selectedUnitRefsForChoice(selections, WIZARD_CANTRIP_CHOICE_KEY),
    spellbook: spellcasting.spellbookAccess.spells.filter((spell) =>
      selectedUnitRefsForChoice(
        selections,
        WIZARD_SPELLBOOK_CHOICE_KEY,
      ).includes(spell.spellId),
    ),
    preparedSpells: selectedUnitRefsForChoice(
      selections,
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
  selections: FinalizedCharacterSelections,
  choiceKey:
    | typeof WIZARD_CANTRIP_CHOICE_KEY
    | typeof WIZARD_SPELLBOOK_CHOICE_KEY
    | typeof WIZARD_PREPARED_SPELL_CHOICE_KEY,
): readonly UnitRecord["id"][] {
  return selections.choices
    .filter((choice) => choice.source.choiceKey === choiceKey)
    .flatMap((choice) =>
      choice.options.flatMap((option) =>
        option.unitRef == null ? [] : [option.unitRef.unitId],
      ),
    );
}

function selectedUnitIdForLoadoutChoice(
  selection: CharacterChoiceSelection,
  loadoutChoice: ReturnType<typeof supportedLoadoutChoiceForSource>,
): UnitRecord["id"] | undefined {
  if (loadoutChoice == null || selection.options.length !== 1) {
    return undefined;
  }

  const option = selection.options[0];
  return option?.optionId === loadoutChoice.optionId
    ? option.unitRef?.unitId
    : undefined;
}

export function optionalUnitId(
  unitId: UnitRecord["id"] | undefined,
): readonly UnitRecord["id"][] {
  return unitId == null ? [] : [unitId];
}

export function requireReadable<T>(
  result: UnitReaderResult<T>,
  label: string,
): T {
  if (result.tag === "unreadable") {
    const issueText = result.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Cannot finalize unreadable ${label} Unit: ${issueText}`);
  }

  return result.value;
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
  const skillSelection = selections.choices.find((selection) =>
    sameCreationHoleSource(
      selection.source,
      unitSource(selections.primaryClass, skillChoiceKey),
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
  const toolSelection = selections.choices.find((selection) =>
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
