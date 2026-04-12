import type {
  BackgroundAbilityScoreIncrease,
  CharacterAbilityScoreGeneration,
  CharacterAbilityScoreGenerationDraft,
  CharacterAbilityScores,
  CharacterBackground,
} from "#/character-ability-scores.ts";
import type {
  CharacterEquipmentChoices,
  CharacterEquipmentChoicesDraft,
} from "#/character-equipment.ts";
import type {
  CharacterAdvancementEntry,
  CharacterBuildChoices,
} from "#/character-feature-types.ts";
import { CLASS_NAMES, type ClassName } from "#/features/class-tables.ts";
import type { CharacterSpellcastingChoices } from "#/character-spellcasting.ts";
import { CHARACTER_EQUIPMENT_ISSUE_CODES } from "#/character-equipment-validation.ts";
import { CHARACTER_SPELLCASTING_ISSUE_CODES } from "#/character-spellcasting.ts";

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
export type CharacterAdvancement = ReadonlyArray<CharacterAdvancementEntry>;

export const ZERO_CLASS_LEVELS = Object.fromEntries(
  CLASS_NAMES.map((className) => [className, 0]),
) as CharacterClassLevels;

export interface CharacterDraft {
  readonly primaryClass?: ClassName;
  readonly classLevels?: CharacterDraftClassLevels;
  readonly advancement?: CharacterAdvancement;
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
  readonly advancement: CharacterAdvancement;
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
  "missingAdvancement",
  "advancementRequiredForHigherLevelStart",
  "invalidAdvancement",
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
  "missingAdvancementChoice",
  "invalidAdvancementChoice",
  "prematureFeatChoice",
  "prematureEpicBoonChoice",
  "missingSubclassSelection",
  "invalidSubclassSelection",
  "prematureSubclassSelection",
  "missingGrantedLanguageChoice",
  "wrongGrantedLanguageChoiceCount",
  "invalidGrantedLanguageChoice",
  "duplicateGrantedLanguageChoice",
  "duplicateGrantedProficiency",
  "multiclassPrerequisiteNotMet",
  "abilityScoreIncreaseExceedsThirty",
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
