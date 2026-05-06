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
  CharacterSheetBuildChoices,
} from "#/character-feature-types.ts";
import type { ClassName } from "#/features/class-tables.ts";
import type {
  CharacterSheetSpellcastingChoices,
  CharacterSpellcastingChoices,
} from "#/character-spellcasting.ts";
import { CHARACTER_EQUIPMENT_ISSUE_CODES } from "#/character-equipment-validation.ts";
import { CHARACTER_SPELLCASTING_ISSUE_CODES } from "#/character-spellcasting.ts";
import {
  ALIGNMENTS,
  STANDARD_LANGUAGES,
  alignmentFromAbbreviation,
  alignmentLabel,
  type AlignmentAbbreviation,
  type StandardLanguage,
} from "@dnd/shared/game-facts";
import { ZERO_CLASS_LEVELS as SHARED_ZERO_CLASS_LEVELS } from "@dnd/shared-algebras/character-advancement-algebra";

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

export { ALIGNMENTS };
export { alignmentFromAbbreviation, alignmentLabel };
export type Alignment = AlignmentAbbreviation;

export const CHARACTER_LANGUAGES = STANDARD_LANGUAGES;
export type CharacterLanguage = StandardLanguage;

export type CharacterClassLevels = Readonly<Record<ClassName, number>>;
export type CharacterDraftClassLevels = Partial<Record<ClassName, number>>;
export type CharacterAdvancement = ReadonlyArray<CharacterAdvancementEntry>;

export const ZERO_CLASS_LEVELS: CharacterClassLevels = SHARED_ZERO_CLASS_LEVELS;

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
  readonly background: CharacterBackground;
  readonly abilityScoreGeneration: CharacterAbilityScoreGeneration;
  readonly backgroundAbilityScoreIncrease: BackgroundAbilityScoreIncrease;
  readonly abilityScores: CharacterAbilityScores;
  readonly species: CharacterSpecies;
  readonly languages: ReadonlyArray<CharacterLanguage>;
  readonly alignment: Alignment;
  readonly choices: CharacterSheetBuildChoices;
  readonly equipment: CharacterEquipmentChoices;
  readonly spellcasting: CharacterSheetSpellcastingChoices;
}

export type NonEmptyReadonlyArray<T> = ReadonlyNonEmptyArray<T>;

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
  "invalidFeatureChoice",
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
  "contradictoryFinalizedSheet",
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
      readonly status: "incomplete";
      readonly openChoices: NonEmptyReadonlyArray<CharacterFinalizationIssue>;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly status: "invalid";
      readonly openChoices: ReadonlyArray<CharacterFinalizationIssue>;
      readonly issues: NonEmptyReadonlyArray<CharacterFinalizationIssue>;
    };
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
