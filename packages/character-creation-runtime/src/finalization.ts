import { isValidAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import { hp } from "@dnd/shared/types";
import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
  readSpeciesCreationFacts,
  type UnitReaderResult,
} from "@dnd/surface/surface/character-creation-readers";
import { SKILLS } from "@dnd/surface/surface/types";
import type { Ability, Skill, UnitRecord } from "@dnd/surface/surface/types";
import { discoverCreationHoles } from "./discovery.ts";
import {
  choiceSelectionOptionIds,
  sameChoiceSelectionMultiset,
  sameCreationHoleSource,
  sameOptionIdMultiset,
} from "./discovery.ts";
import { unitSource } from "./hole-factories.ts";
import {
  BACKGROUND_TOOL_CHOICE_KEY,
  FIGHTER_SKILL_CHOICE_KEY,
  SURFACE_ABILITIES,
} from "./phase1-manifest.ts";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  supportedFinalizedChoiceSelections,
  supportedFinalizedEquipmentUnitIds,
  supportedLoadoutChoiceForSource,
  unitRefsForSupportedClassChoice,
} from "./support-gates.ts";
import {
  characterClassLevel,
  hitDieSize,
  hitDieTotal,
  nonEmptyReadonlyArray,
  type AbilityScoreAssignment,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterAdvancementSelection,
  type CharacterBuild,
  type CharacterBuildEquipment,
  type CharacterBuildFeature,
  type CharacterBuildResource,
  type CharacterChoiceSelection,
  type CharacterDraft,
  type CreationChoiceOptionId,
  type CreationFinalizationIssue,
  type CreationFinalizationResult,
  type FinalizedCharacterSelections,
  type NonEmptyReadonlyArray,
  type UnitCatalog,
  type UnitRef,
} from "./types.ts";

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

  const phaseOneSelections = phaseOneFinalizedCharacterSelections(
    selections,
    input.unitLibrary,
  );
  if (phaseOneSelections.tag === "rejected") {
    return {
      tag: "invalid",
      issues: phaseOneSelections.issues,
    };
  }

  return {
    tag: "ready",
    build: buildCharacterBuild({
      phaseOneSelections: phaseOneSelections.value,
      unitLibrary: input.unitLibrary,
    }),
  };
}

export function finalizedSelections(
  draft: CharacterDraft,
): FinalizedCharacterSelections | undefined {
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

export function finalizedSelectionIssues(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): readonly CreationFinalizationIssue[] {
  return [
    ...expectedValueIssue(
      selections.primaryClass ===
        CHARACTER_CREATION_SUPPORT_PROFILE.manifest.primaryClassUnitId,
      "Finalized build must use the supported manifest class.",
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
      isInitialFighterAdvancement(selections.advancement),
      "Finalized build advancement must match the supported manifest level.",
    ),
    ...expectedValueIssue(
      isValidAbilityScoreAssignment(
        selections.abilityScoreGeneration.method,
        selections.abilityScoreGeneration.assignedScores,
      ),
      "Finalized build must use a supported ability-score generation method.",
    ),
    ...expectedValueIssue(
      isPhaseOneManifestBackgroundAbilityScoreIncrease(
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
      sameChoiceSelectionMultiset(
        selections.choices,
        supportedFinalizedChoiceSelections(),
      ),
      "Finalized build must carry exactly the supported manifest choices.",
    ),
    ...expectedValueIssue(
      sameOptionIdMultiset(
        selections.equipment.selectedUnitIds,
        supportedFinalizedEquipmentUnitIds(),
      ),
      "Finalized build must own exactly the supported manifest purchased equipment.",
    ),
  ];
}

const PhaseOneFinalizedCharacterSelections = Symbol(
  "PhaseOneFinalizedCharacterSelections",
);

type PhaseOneFinalizedCharacterSelections = {
  readonly selections: FinalizedCharacterSelections;
  readonly [PhaseOneFinalizedCharacterSelections]: true;
};

type PhaseOneFinalizedCharacterSelectionsResult =
  | {
      readonly tag: "accepted";
      readonly value: PhaseOneFinalizedCharacterSelections;
    }
  | {
      readonly tag: "rejected";
      readonly issues: NonEmptyReadonlyArray<CreationFinalizationIssue>;
    };

function phaseOneFinalizedCharacterSelections(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): PhaseOneFinalizedCharacterSelectionsResult {
  const issues = nonEmptyReadonlyArray(
    finalizedSelectionIssues(selections, unitLibrary),
  );
  return issues == null
    ? {
        tag: "accepted",
        value: {
          selections,
          [PhaseOneFinalizedCharacterSelections]: true,
        },
      }
    : { tag: "rejected", issues };
}

export function expectedValueIssue(
  condition: boolean,
  message: string,
): readonly CreationFinalizationIssue[] {
  return condition ? [] : [illegalFinalizationIssue(message)];
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

export function isInitialFighterAdvancement(
  advancement: CharacterAdvancementSelection,
): boolean {
  return (
    advancement.entries.length === 1 &&
    advancement.entries[0]?.classUnitId ===
      CHARACTER_CREATION_SUPPORT_PROFILE.manifest.initialAdvancement
        .classUnitId &&
    advancement.entries[0]?.level ===
      CHARACTER_CREATION_SUPPORT_PROFILE.manifest.initialAdvancement.level
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

export function isPhaseOneManifestBackgroundAbilityScoreIncrease(
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
  readonly phaseOneSelections: PhaseOneFinalizedCharacterSelections;
  readonly unitLibrary: UnitCatalog;
}): CharacterBuild {
  const { selections } = input.phaseOneSelections;
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
  const classFeatureGrants = classFacts.featureGrants.filter(
    (grant) => grant.level === 1,
  );
  const classFeatureUnitIds = classFeatureGrants.map((grant) => grant.unitId);
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
      maximum: hp(classFacts.hitPointDie + abilityModifier(finalScores.con)),
      hitDice: [
        {
          classUnitId: selections.primaryClass,
          dieSize: hitDieSize(classFacts.hitPointDie),
          total: hitDieTotal(1),
        },
      ],
    },
    proficiencies: {
      savingThrows: classFacts.savingThrowProficiencies,
      skills: uniqueValues([
        ...finalizedBuildSkillProficiencies(selections),
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
    equipment: buildEquipment,
  };
}

export function characterBuildUnitRefs(
  build: Pick<
    CharacterBuild,
    "advancement" | "background" | "species" | "features" | "equipment"
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
          unitId: selectedUnitId,
          grip: loadoutChoice.grip,
        },
      };
    },
    {},
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
): readonly Skill[] {
  const skillSelection = selections.choices.find((selection) =>
    sameCreationHoleSource(
      selection.source,
      unitSource(selections.primaryClass, FIGHTER_SKILL_CHOICE_KEY),
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

  return unit.mechanics.family === "activation"
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
