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
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
  FIGHTER_FIGHTING_STYLE_FEATURE_ID,
  FIGHTER_SKILL_CHOICE_KEY,
  FIGHTER_WEAPON_MASTERY_CHOICE_KEY,
  FIGHTER_WEAPON_MASTERY_FEATURE_ID,
  LOADOUT_ARMOR_CHOICE_KEY,
  LOADOUT_SHIELD_CHOICE_KEY,
  LOADOUT_WEAPON_CHOICE_KEY,
  PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
  PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_SELECTION,
  PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID,
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
  PHASE1_BACKGROUND_TOOL_OPTION_ID,
  PHASE1_CLASS_EQUIPMENT_OPTION_ID,
  PHASE1_CLASS_FIGHTER_UNIT_ID,
  PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID,
  PHASE1_LOADOUT_ARMOR_OPTION_ID,
  PHASE1_LOADOUT_SHIELD_OPTION_ID,
  PHASE1_LOADOUT_WEAPON_OPTION_ID,
  PHASE1_SHIELD_UNIT_ID,
  PHASE1_SPECIES_ORC_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_MASTERY_UNIT_IDS,
  SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
  SUPPORTED_FIGHTING_STYLE_FEAT_IDS,
  SURFACE_ABILITIES,
} from "./phase1-manifest.ts";
import {
  characterClassLevel,
  creationChoiceOptionId,
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
  type CharacterSelectedChoiceOption,
  type CreationChoiceOptionId,
  type CreationFinalizationIssue,
  type CreationFinalizationResult,
  type FinalizedCharacterSelections,
  type NonEmptyReadonlyArray,
  type UnitChoiceKey,
  type UnitLibrary,
  type UnitRef,
} from "./types.ts";

export function finalizeCharacterDraft(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
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
  unitLibrary: UnitLibrary,
): readonly CreationFinalizationIssue[] {
  return [
    ...expectedValueIssue(
      selections.primaryClass === PHASE1_CLASS_FIGHTER_UNIT_ID,
      "Finalized build must use the supported Fighter class.",
    ),
    ...expectedValueIssue(
      selections.background === PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      "Finalized build must use the supported Soldier background.",
    ),
    ...expectedValueIssue(
      selections.species === PHASE1_SPECIES_ORC_UNIT_ID,
      "Finalized build must use the supported Orc species.",
    ),
    ...expectedValueIssue(
      isInitialFighterAdvancement(selections.advancement),
      "Finalized build advancement must be exactly one Fighter level.",
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
      "Finalized build must use the phase-1 Soldier ability-score increase.",
    ),
    ...expectedValueIssue(
      sameOptionIdMultiset(selections.languages, [
        "Common",
        "Dwarvish",
        "Goblin",
      ]),
      "Finalized build must use Common, Dwarvish, and Goblin.",
    ),
    ...expectedValueIssue(
      selections.alignment.order === "lawful" &&
        selections.alignment.morality === "good",
      "Finalized build must use Lawful Good alignment for the phase-1 manifest.",
    ),
    ...expectedValueIssue(
      sameChoiceSelectionMultiset(
        selections.choices,
        phaseOneManifestChoiceSelections(),
      ),
      "Finalized build must carry exactly the phase-1 manifest choices.",
    ),
    ...expectedValueIssue(
      sameOptionIdMultiset(selections.equipment.selectedUnitIds, [
        PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
        PHASE1_WEAPON_LONGSWORD_UNIT_ID,
        PHASE1_SHIELD_UNIT_ID,
      ]),
      "Finalized build must own exactly the phase-1 purchased equipment.",
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
  unitLibrary: UnitLibrary,
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

export function phaseOneManifestChoiceSelections(): readonly CharacterChoiceSelection[] {
  return [
    choiceSelection(PHASE1_CLASS_FIGHTER_UNIT_ID, FIGHTER_SKILL_CHOICE_KEY, [
      ...SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
    ]),
    unitChoiceSelection(
      FIGHTER_FIGHTING_STYLE_FEATURE_ID,
      FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
      [...SUPPORTED_FIGHTING_STYLE_FEAT_IDS],
    ),
    unitChoiceSelection(
      FIGHTER_WEAPON_MASTERY_FEATURE_ID,
      FIGHTER_WEAPON_MASTERY_CHOICE_KEY,
      PHASE1_WEAPON_MASTERY_UNIT_IDS,
    ),
    choiceSelection(
      PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      BACKGROUND_TOOL_CHOICE_KEY,
      [PHASE1_BACKGROUND_TOOL_OPTION_ID],
    ),
    choiceSelection(PHASE1_CLASS_FIGHTER_UNIT_ID, CLASS_EQUIPMENT_CHOICE_KEY, [
      PHASE1_CLASS_EQUIPMENT_OPTION_ID,
    ]),
    choiceSelection(
      PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      BACKGROUND_EQUIPMENT_CHOICE_KEY,
      [PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID],
    ),
    choiceSelectionWithOptions(
      PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
      LOADOUT_ARMOR_CHOICE_KEY,
      [
        selectedChoiceOptionRecord(
          PHASE1_LOADOUT_ARMOR_OPTION_ID,
          PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
        ),
      ],
    ),
    choiceSelectionWithOptions(
      PHASE1_SHIELD_UNIT_ID,
      LOADOUT_SHIELD_CHOICE_KEY,
      [
        selectedChoiceOptionRecord(
          PHASE1_LOADOUT_SHIELD_OPTION_ID,
          PHASE1_SHIELD_UNIT_ID,
        ),
      ],
    ),
    choiceSelectionWithOptions(
      PHASE1_WEAPON_LONGSWORD_UNIT_ID,
      LOADOUT_WEAPON_CHOICE_KEY,
      [
        selectedChoiceOptionRecord(
          PHASE1_LOADOUT_WEAPON_OPTION_ID,
          PHASE1_WEAPON_LONGSWORD_UNIT_ID,
        ),
      ],
    ),
  ];
}

export function choiceSelection(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
  optionIds: readonly CreationChoiceOptionId[],
): CharacterChoiceSelection {
  return choiceSelectionWithOptions(
    unitId,
    choiceKey,
    optionIds.map((optionId) => ({ optionId })),
  );
}

export function unitChoiceSelection(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
  selectedUnitIds: readonly UnitRecord["id"][],
): CharacterChoiceSelection {
  return choiceSelectionWithOptions(
    unitId,
    choiceKey,
    selectedUnitIds.map((selectedUnitId) =>
      selectedChoiceOptionRecord(
        creationChoiceOptionId(selectedUnitId),
        selectedUnitId,
      ),
    ),
  );
}

export function choiceSelectionWithOptions(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
  options: readonly CharacterSelectedChoiceOption[],
): CharacterChoiceSelection {
  return {
    source: unitSource(unitId, choiceKey),
    options,
  };
}

export function selectedChoiceOptionRecord(
  optionId: CreationChoiceOptionId,
  unitId: UnitRecord["id"],
): CharacterSelectedChoiceOption {
  return { optionId, unitRef: { unitId } };
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
    advancement.entries[0]?.classUnitId === PHASE1_CLASS_FIGHTER_UNIT_ID &&
    advancement.entries[0]?.level === 1
  );
}

export function isSupportedBackgroundAbilityScoreIncrease(
  selection: BackgroundAbilityScoreIncreaseSelection,
  unitLibrary: UnitLibrary,
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
  unitLibrary: UnitLibrary,
  backgroundUnitId: UnitRecord["id"],
  baseScores: AbilityScoreAssignment,
): boolean {
  return (
    sameBackgroundAbilityScoreIncreaseSelection(
      selection,
      PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_SELECTION,
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
  readonly unitLibrary: UnitLibrary;
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
    {
      kind: "classChoice",
      unitId: PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID,
      choiceKey: FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
    },
  ];
  const buildEquipment: CharacterBuildEquipment = {
    armor: PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
    shield: PHASE1_SHIELD_UNIT_ID,
    weapon: {
      unitId: PHASE1_WEAPON_LONGSWORD_UNIT_ID,
      grip: "one_handed",
    },
  };

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
      unitSource(PHASE1_CLASS_FIGHTER_UNIT_ID, FIGHTER_SKILL_CHOICE_KEY),
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
      unitSource(PHASE1_BACKGROUND_SOLDIER_UNIT_ID, BACKGROUND_TOOL_CHOICE_KEY),
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
