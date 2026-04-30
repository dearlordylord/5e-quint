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
  choiceSelectionOptionIds,
  choiceSelectionMatchesHole,
  sameCreationHoleSource,
  sameOptionIdMultiset,
  startingEquipmentChoiceHole,
} from "./discovery.ts";
import { unitSource } from "./hole-factories.ts";
import {
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  FIGHTER_FIGHTING_STYLE_FEATURE_ID,
  FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
  FIGHTER_SKILL_CHOICE_KEY,
  FIGHTER_WEAPON_MASTERY_FEATURE_ID,
  FIGHTER_WEAPON_MASTERY_CHOICE_KEY,
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
  type CharacterBuildSpellcasting,
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

  const supportedSelections = supportedFinalizedCharacterSelections(
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

const SupportedFinalizedCharacterSelections = Symbol(
  "SupportedFinalizedCharacterSelections",
);

type SupportedFinalizedCharacterSelections = {
  readonly selections: FinalizedCharacterSelections;
  readonly [SupportedFinalizedCharacterSelections]: true;
};

type SupportedFinalizedCharacterSelectionsResult =
  | {
      readonly tag: "accepted";
      readonly value: SupportedFinalizedCharacterSelections;
    }
  | {
      readonly tag: "rejected";
      readonly issues: NonEmptyReadonlyArray<CreationFinalizationIssue>;
    };

function supportedFinalizedCharacterSelections(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitCatalog,
): SupportedFinalizedCharacterSelectionsResult {
  const issues = nonEmptyReadonlyArray(
    finalizedSelectionIssues(selections, unitLibrary),
  );
  return issues == null
    ? {
        tag: "accepted",
        value: {
          selections,
          [SupportedFinalizedCharacterSelections]: true,
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
  readonly supportedSelections: SupportedFinalizedCharacterSelections;
  readonly unitLibrary: UnitCatalog;
}): CharacterBuild {
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
  const selectedEquipment = new Set(selections.equipment.selectedUnitIds);
  const choiceSourceKeys = selections.choices.map(
    (choice) => `${choice.source.unitId}:${choice.source.choiceKey}`,
  );
  return (
    new Set(choiceSourceKeys).size === choiceSourceKeys.length &&
    selections.choices.every((choice) => {
      const key = choice.source.choiceKey;
      return (
        choiceHasSource(
          choice,
          selections.primaryClass,
          classFacts.className === "wizard"
            ? WIZARD_SKILL_CHOICE_KEY
            : FIGHTER_SKILL_CHOICE_KEY,
        ) ||
        (classFacts.className === "fighter" &&
          classLevel >= 1 &&
          (choiceHasSource(
            choice,
            FIGHTER_FIGHTING_STYLE_FEATURE_ID,
            FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
          ) ||
            choiceHasSource(
              choice,
              FIGHTER_WEAPON_MASTERY_FEATURE_ID,
              FIGHTER_WEAPON_MASTERY_CHOICE_KEY,
            ))) ||
        (classFacts.className === "wizard" &&
          (choiceHasSource(
            choice,
            selections.primaryClass,
            WIZARD_CANTRIP_CHOICE_KEY,
          ) ||
            choiceHasSource(
              choice,
              selections.primaryClass,
              WIZARD_SPELLBOOK_CHOICE_KEY,
            ) ||
            choiceHasSource(
              choice,
              selections.primaryClass,
              WIZARD_PREPARED_SPELL_CHOICE_KEY,
            ))) ||
        choiceHasSource(
          choice,
          selections.background,
          BACKGROUND_TOOL_CHOICE_KEY,
        ) ||
        supportedStartingEquipmentCoinGrantChoice(
          choice,
          selections.primaryClass,
          CLASS_EQUIPMENT_CHOICE_KEY,
          classFacts.startingEquipment,
        ) ||
        supportedStartingEquipmentCoinGrantChoice(
          choice,
          selections.background,
          BACKGROUND_EQUIPMENT_CHOICE_KEY,
          backgroundFacts.startingEquipment,
        ) ||
        (key.startsWith("loadout_") &&
          selectedEquipment.has(choice.source.unitId))
      );
    })
  );
}

function choiceHasSource(
  selection: CharacterChoiceSelection,
  unitId: UnitRecord["id"],
  choiceKey: CharacterChoiceSelection["source"]["choiceKey"],
): boolean {
  return (
    selection.source.unitId === unitId &&
    selection.source.choiceKey === choiceKey
  );
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
