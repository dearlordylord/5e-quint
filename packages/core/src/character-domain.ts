import {
  abilityModifiersFromScores,
  applyBackgroundAbilityScoreIncrease,
  type BackgroundAbilityScoreIncrease,
  type CharacterAbilityModifiers,
  type CharacterAbilityScoreGeneration,
  type CharacterAbilityScoreGenerationDraft,
  type CharacterAbilityScores,
  type CharacterBackground,
} from "#/character-ability-scores.ts";
import {
  validateFeatureChoices,
  validateFeatChoices,
  validateGrantedLanguages,
  validateMulticlassChoices,
  validateMulticlassPrerequisites,
  validatePrimaryClassChoices,
  validateSpeciesChoices,
  validateSubclassSelections,
  validateBackgroundToolChoice,
  validateDuplicateGrantedProficiencies,
} from "#/character-build-choice-validation.ts";
import {
  validateDraftFields,
  validateLanguages,
} from "#/character-finalization-helpers.ts";
import {
  type CharacterEquipmentChoices,
  type CharacterEquipmentChoicesDraft,
} from "#/character-equipment.ts";
import {
  CHARACTER_EQUIPMENT_ISSUE_CODES,
  validateCharacterEquipment,
} from "#/character-equipment-validation.ts";
import {
  CHARACTER_SPELLCASTING_ISSUE_CODES,
  validateCharacterSpellcastingChoices,
  type CharacterSpellcastingChoices,
} from "#/character-spellcasting.ts";
import type {
  CharacterBuildChoices,
  CharacterClassResourcePool,
  CharacterOriginFeatSelection,
  CharacterProficiencySummary,
} from "#/character-feature-types.ts";
import {
  BACKGROUND_FIXED_ORIGIN_FEATS,
  deriveCharacterProficiencies,
} from "#/character-proficiencies.ts";
import { deriveCharacterClassResources } from "#/character-resources.ts";
import { CLASS_NAMES, type ClassName } from "#/features/class-tables.ts";

export {
  abilityModifiersFromScores,
  applyBackgroundAbilityScoreIncrease,
  type BackgroundAbilityScoreIncrease,
  CHARACTER_BACKGROUNDS,
  POINT_BUY_BUDGET,
  STANDARD_ARRAY_SCORES,
  totalPointBuyCost,
} from "#/character-ability-scores.ts";
export type {
  CharacterAbilityModifiers,
  CharacterAbilityScoreGeneration,
  CharacterAbilityScoreGenerationDraft,
  CharacterAbilityScores,
  CharacterBackground,
  CharacterDraftAbilityScores,
} from "#/character-ability-scores.ts";
export {
  BACKGROUND_FIXED_ORIGIN_FEATS,
  BACKGROUND_SKILLS,
  ELF_KEEN_SENSES_SKILLS,
  PRIMARY_CLASS_PROFICIENCIES,
  MULTICLASS_PROFICIENCIES,
  SKILL_ABILITIES,
  SKILLS,
  type Skill,
  deriveCharacterProficiencies,
} from "#/character-proficiencies.ts";
export {
  CHARACTER_RARE_LANGUAGES,
  CHARACTER_TOOL_PROFICIENCIES,
  CHARACTER_WEAPON_PROFICIENCIES,
  CLERIC_DIVINE_ORDERS,
  DRUID_PRIMAL_ORDERS,
  SRD_SUBCLASSES,
  type ArtisanTool,
  type CharacterArmorTraining,
  type CharacterBuildChoices,
  type CharacterClassResourcePool,
  type CharacterGrantedLanguage,
  type CharacterOriginFeatId,
  type CharacterOriginFeatSelection,
  type CharacterProficiencySummary,
  type CharacterSubclassSelection,
  type CharacterToolProficiency,
  type CharacterWeaponProficiency,
  type ClericDivineOrder,
  type DruidPrimalOrder,
  type GamingSet,
  type MusicalInstrument,
} from "#/character-feature-types.ts";
export {
  deriveCharacterClassResources,
  deriveProficiencyBonus,
} from "#/character-resources.ts";
export {
  CHARACTER_ARMORS,
  CHARACTER_BACKGROUND_EQUIPMENT_OPTIONS,
  CHARACTER_CLASS_EQUIPMENT_OPTIONS,
  CHARACTER_COMBAT_EQUIPMENT_ITEMS,
  CHARACTER_WEAPONS,
  type CharacterArmor,
  type CharacterBackgroundEquipmentOption,
  type CharacterClassEquipmentOption,
  type CharacterCombatEquipmentItem,
  type CharacterWeapon,
} from "#/character-equipment-data.ts";
export {
  SHIELD_ARMOR_TRAINING,
  WEAPON_GRIPS,
  armorTrainingForArmor,
  characterBattleEquipmentProjection,
  ownedCombatEquipment,
  projectBattleWeaponProfile,
  startingGoldPieces,
  weaponProficiencyMatchesWeapon,
  type CharacterEquipmentChoices,
  type CharacterEquipmentChoicesDraft,
  type CharacterLoadout,
  type CharacterOwnedCombatEquipment,
  type CharacterWeaponGrip,
} from "#/character-equipment.ts";
export {
  CHARACTER_EQUIPMENT_ISSUE_CODES,
  validateCharacterEquipment,
  type CharacterEquipmentIssue,
  type CharacterEquipmentIssueCode,
} from "#/character-equipment-validation.ts";
/**
 * Character-domain ownership boundary.
 *
 * - `CharacterDraft` owns incomplete SRD character-creation choices.
 * - `CharacterSheet` owns validated canonical PC facts plus the explicit
 *   proficiency-, feature-, and spell-selection choices needed to derive
 *   sheet facts.
 * - Derived facts such as proficiency bonus, merged proficiencies, and class
 *   resources are computed from the sheet rather than stored twice.
 * - Runtime projections such as `CharConfig`, `DndMachineInput`, and
 *   `InitCreatureConfig` are execution-facing outputs and are not owned here.
 */

export const CHARACTER_SPECIES = [
  "dragonborn",
  "dwarf",
  "elf",
  "gnome",
  "goliath",
  "halfling",
  "human",
  "orc",
  "tiefling",
] as const;
export type CharacterSpecies = (typeof CHARACTER_SPECIES)[number];

export const ALIGNMENTS = [
  "LG",
  "NG",
  "CG",
  "LN",
  "N",
  "CN",
  "LE",
  "NE",
  "CE",
] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

export const CHARACTER_LANGUAGES = [
  "Common",
  "Common Sign Language",
  "Draconic",
  "Dwarvish",
  "Elvish",
  "Giant",
  "Gnomish",
  "Goblin",
  "Halfling",
  "Orc",
] as const;
export type CharacterLanguage = (typeof CHARACTER_LANGUAGES)[number];

export type CharacterClassLevels = Readonly<Record<ClassName, number>>;
export type CharacterDraftClassLevels = Partial<Record<ClassName, number>>;

export const ZERO_CLASS_LEVELS = Object.fromEntries(
  CLASS_NAMES.map((className) => [className, 0]),
) as CharacterClassLevels;

export interface CharacterDraft {
  readonly primaryClass?: ClassName;
  readonly classLevels?: CharacterDraftClassLevels;
  readonly background?: CharacterBackground;
  readonly abilityScoreGeneration?: CharacterAbilityScoreGenerationDraft;
  readonly backgroundAbilityScoreIncrease?: BackgroundAbilityScoreIncrease;
  readonly species?: CharacterSpecies;
  readonly languages?: ReadonlyArray<CharacterLanguage>;
  readonly alignment?: Alignment;
  readonly choices?: CharacterBuildChoices;
  readonly equipment?: CharacterEquipmentChoicesDraft;
  readonly spellcasting?: CharacterSpellcastingChoices;
}

export interface CharacterSheet {
  readonly primaryClass: ClassName;
  readonly classLevels: CharacterClassLevels;
  readonly background: CharacterBackground;
  readonly abilityScoreGeneration: CharacterAbilityScoreGeneration;
  readonly backgroundAbilityScoreIncrease: BackgroundAbilityScoreIncrease;
  readonly abilityScores: CharacterAbilityScores;
  readonly species: CharacterSpecies;
  readonly languages: ReadonlyArray<CharacterLanguage>;
  readonly alignment: Alignment;
  readonly choices: CharacterBuildChoices;
  readonly equipment: CharacterEquipmentChoices;
  readonly spellcasting?: CharacterSpellcastingChoices;
}

export const CHARACTER_FINALIZATION_ISSUE_CODES = [
  "missingPrimaryClass",
  "missingClassLevels",
  "invalidClassLevel",
  "invalidTotalLevel",
  "primaryClassLevelMissing",
  "missingBackground",
  "missingAbilityScoreGeneration",
  "missingBackgroundAbilityScoreIncrease",
  "incompleteAbilityScores",
  "invalidAbilityScore",
  "invalidStandardArray",
  "invalidPointBuy",
  "invalidBackgroundAbilityScoreIncrease",
  "duplicateBackgroundAbilityScoreIncreaseAbility",
  "abilityScoreIncreaseExceedsTwenty",
  "missingSpecies",
  "missingLanguages",
  "invalidLanguage",
  "duplicateLanguages",
  "missingCommonLanguage",
  "tooFewLanguages",
  "tooManyLanguages",
  "missingAlignment",
  "missingPrimaryClassSkillChoices",
  "wrongPrimaryClassSkillChoiceCount",
  "invalidPrimaryClassSkillChoice",
  "duplicatePrimaryClassSkillChoice",
  "missingMulticlassSkillChoice",
  "wrongMulticlassSkillChoiceCount",
  "invalidMulticlassSkillChoice",
  "duplicateMulticlassSkillChoice",
  "missingToolChoice",
  "invalidToolChoiceCount",
  "duplicateToolChoice",
  "missingSpeciesSkillChoice",
  "invalidSpeciesSkillChoice",
  "missingOriginFeatChoice",
  "invalidOriginFeatChoice",
  "wrongSkilledChoiceCount",
  "duplicateSkilledChoice",
  "missingFeatureChoice",
  "missingSubclassSelection",
  "invalidSubclassSelection",
  "prematureSubclassSelection",
  "missingGrantedLanguageChoice",
  "wrongGrantedLanguageChoiceCount",
  "invalidGrantedLanguageChoice",
  "duplicateGrantedLanguageChoice",
  "duplicateGrantedProficiency",
  "multiclassPrerequisiteNotMet",
  ...CHARACTER_EQUIPMENT_ISSUE_CODES,
  ...CHARACTER_SPELLCASTING_ISSUE_CODES,
] as const;
export type CharacterFinalizationIssueCode =
  (typeof CHARACTER_FINALIZATION_ISSUE_CODES)[number];

export interface CharacterFinalizationIssue {
  readonly code: CharacterFinalizationIssueCode;
  readonly message: string;
}

export type CharacterFinalizationResult =
  | { readonly ok: true; readonly sheet: CharacterSheet }
  | {
      readonly ok: false;
      readonly issues: ReadonlyArray<CharacterFinalizationIssue>;
    };

function normalizeClassLevels(
  partial: CharacterDraftClassLevels,
): CharacterClassLevels {
  return {
    ...ZERO_CLASS_LEVELS,
    ...partial,
  };
}

export function finalAbilityModifiers(
  sheet: Pick<CharacterSheet, "abilityScores">,
): CharacterAbilityModifiers {
  return abilityModifiersFromScores(sheet.abilityScores);
}

export function totalClassLevels(
  classLevels: Readonly<Record<ClassName, number>>,
): number {
  return CLASS_NAMES.reduce(
    (total, className) => total + classLevels[className],
    0,
  );
}

export function singleClassLevels(
  primaryClass: ClassName,
  level: number,
): CharacterClassLevels {
  return {
    ...ZERO_CLASS_LEVELS,
    [primaryClass]: level,
  };
}

export function characterOriginFeats(
  sheet: CharacterSheet,
): ReadonlyArray<CharacterOriginFeatSelection> {
  const feats: CharacterOriginFeatSelection[] = [
    BACKGROUND_FIXED_ORIGIN_FEATS[sheet.background],
  ];
  if (sheet.species === "human" && sheet.choices.humanOriginFeat != null) {
    feats.push(sheet.choices.humanOriginFeat);
  }
  return feats;
}

export function characterProficiencySummary(
  sheet: CharacterSheet,
): CharacterProficiencySummary {
  return deriveCharacterProficiencies(sheet);
}

export function characterClassResources(
  sheet: CharacterSheet,
): ReadonlyArray<CharacterClassResourcePool> {
  return deriveCharacterClassResources(sheet);
}

export function finalizeCharacterDraft(
  draft: CharacterDraft,
): CharacterFinalizationResult {
  const classLevels =
    draft.classLevels == null
      ? ZERO_CLASS_LEVELS
      : normalizeClassLevels(draft.classLevels);

  const issues: CharacterFinalizationIssue[] = [
    ...validateDraftFields(draft, classLevels),
    ...validatePrimaryClassChoices(draft),
    ...validateMulticlassChoices(draft, classLevels),
    ...validateBackgroundToolChoice(draft),
    ...validateSpeciesChoices(draft),
    ...validateFeatChoices(draft),
    ...validateFeatureChoices(draft, classLevels),
    ...validateSubclassSelections(draft, classLevels),
    ...validateGrantedLanguages(draft, classLevels),
    ...(draft.languages == null ? [] : validateLanguages(draft.languages)),
    ...validateDuplicateGrantedProficiencies(draft),
    ...validateCharacterEquipment(draft),
    ...validateCharacterSpellcastingChoices({
      classLevels,
      choices: draft.choices,
      spellcasting: draft.spellcasting,
    }),
  ];

  let abilityScores: CharacterAbilityScores | undefined;
  if (
    draft.abilityScoreGeneration != null &&
    draft.background != null &&
    draft.backgroundAbilityScoreIncrease != null
  ) {
    abilityScores = applyBackgroundAbilityScoreIncrease(
      draft.abilityScoreGeneration.assignedScores as CharacterAbilityScores,
      draft.background,
      draft.backgroundAbilityScoreIncrease,
    );
    issues.push(...validateMulticlassPrerequisites(classLevels, abilityScores));
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const abilityScoreGeneration: CharacterAbilityScoreGeneration = {
    ...draft.abilityScoreGeneration!,
    assignedScores: {
      ...draft.abilityScoreGeneration!.assignedScores,
    } as CharacterAbilityScores,
  };

  const sheet: CharacterSheet = {
    primaryClass: draft.primaryClass!,
    classLevels,
    background: draft.background!,
    abilityScoreGeneration,
    backgroundAbilityScoreIncrease: draft.backgroundAbilityScoreIncrease!,
    abilityScores: abilityScores!,
    species: draft.species!,
    languages: [...draft.languages!],
    alignment: draft.alignment!,
    choices: draft.choices ?? {},
    equipment: {
      backgroundOption: draft.equipment!.backgroundOption!,
      classOption: draft.equipment!.classOption!,
      purchasedCombatEquipment: [
        ...(draft.equipment!.purchasedCombatEquipment ?? []),
      ],
      remainingGoldPieces: draft.equipment!.remainingGoldPieces!,
      loadout: { ...draft.equipment!.loadout! },
    },
    ...(draft.spellcasting == null
      ? {}
      : {
          spellcasting: Object.fromEntries(
            Object.entries(draft.spellcasting).map(([className, entry]) => [
              className,
              {
                ...(entry?.cantrips == null
                  ? {}
                  : { cantrips: [...entry.cantrips] }),
                ...(entry?.preparedSpells == null
                  ? {}
                  : { preparedSpells: [...entry.preparedSpells] }),
                ...(entry?.spellbook == null
                  ? {}
                  : { spellbook: [...entry.spellbook] }),
              },
            ]),
          ) as CharacterSpellcastingChoices,
        }),
  };

  return { ok: true, sheet };
}
