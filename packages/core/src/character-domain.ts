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
  validateAbilityScoreGeneration,
  validateBackgroundAbilityScoreIncrease,
} from "#/character-finalization-helpers.ts";
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

/**
 * Character-domain ownership boundary.
 *
 * - `CharacterDraft` owns incomplete SRD character-creation choices.
 * - `CharacterSheet` owns validated canonical PC facts.
 * - Derived sheet results such as total level, proficiency bonus, and ability
 *   modifiers should be computed from the sheet rather than stored twice.
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

function isValidClassLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 0 && level <= 20;
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

export function finalizeCharacterDraft(
  draft: CharacterDraft,
): CharacterFinalizationResult {
  const issues: CharacterFinalizationIssue[] = [];

  if (draft.primaryClass == null) {
    issues.push({
      code: "missingPrimaryClass",
      message: "CharacterDraft requires a primary class before finalization.",
    });
  }

  if (draft.classLevels == null) {
    issues.push({
      code: "missingClassLevels",
      message: "CharacterDraft requires class levels before finalization.",
    });
  }

  const classLevels =
    draft.classLevels == null
      ? ZERO_CLASS_LEVELS
      : normalizeClassLevels(draft.classLevels);

  for (const className of CLASS_NAMES) {
    const classLevel = classLevels[className];
    if (!isValidClassLevel(classLevel)) {
      issues.push({
        code: "invalidClassLevel",
        message: `Class level for ${className} must be an integer between 0 and 20.`,
      });
    }
  }

  const totalLevel = totalClassLevels(classLevels);
  if (totalLevel < 1 || totalLevel > 20) {
    issues.push({
      code: "invalidTotalLevel",
      message: "Total character level must be between 1 and 20.",
    });
  }

  if (draft.primaryClass != null && classLevels[draft.primaryClass] < 1) {
    issues.push({
      code: "primaryClassLevelMissing",
      message: "Primary class must have at least one class level.",
    });
  }

  if (draft.background == null) {
    issues.push({
      code: "missingBackground",
      message: "CharacterDraft requires a background before finalization.",
    });
  }

  if (draft.abilityScoreGeneration == null) {
    issues.push({
      code: "missingAbilityScoreGeneration",
      message:
        "CharacterDraft requires an ability score generation choice before finalization.",
    });
  }

  if (draft.backgroundAbilityScoreIncrease == null) {
    issues.push({
      code: "missingBackgroundAbilityScoreIncrease",
      message:
        "CharacterDraft requires a background ability score increase choice before finalization.",
    });
  }

  if (draft.abilityScoreGeneration != null) {
    issues.push(
      ...validateAbilityScoreGeneration(draft.abilityScoreGeneration),
    );
  }

  if (
    draft.background != null &&
    draft.abilityScoreGeneration != null &&
    draft.backgroundAbilityScoreIncrease != null
  ) {
    issues.push(
      ...validateBackgroundAbilityScoreIncrease(
        draft.background,
        draft.abilityScoreGeneration,
        draft.backgroundAbilityScoreIncrease,
      ),
    );
  }

  if (draft.species == null) {
    issues.push({
      code: "missingSpecies",
      message: "CharacterDraft requires a species before finalization.",
    });
  }

  if (draft.alignment == null) {
    issues.push({
      code: "missingAlignment",
      message: "CharacterDraft requires an alignment before finalization.",
    });
  }

  if (draft.languages == null) {
    issues.push({
      code: "missingLanguages",
      message: "CharacterDraft requires languages before finalization.",
    });
  }

  if (draft.languages != null) {
    validateLanguages(draft.languages, issues);
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const abilityScoreGeneration = {
    ...draft.abilityScoreGeneration!,
    assignedScores: {
      ...draft.abilityScoreGeneration!.assignedScores,
    } as CharacterAbilityScores,
  } as CharacterAbilityScoreGeneration;
  const abilityScores = applyBackgroundAbilityScoreIncrease(
    abilityScoreGeneration.assignedScores,
    draft.background!,
    draft.backgroundAbilityScoreIncrease!,
  );

  return {
    ok: true,
    sheet: {
      primaryClass: draft.primaryClass!,
      classLevels,
      background: draft.background!,
      abilityScoreGeneration,
      backgroundAbilityScoreIncrease: draft.backgroundAbilityScoreIncrease!,
      abilityScores,
      species: draft.species!,
      languages: [...draft.languages!],
      alignment: draft.alignment!,
    },
  };
}

function validateLanguages(
  languages: ReadonlyArray<CharacterLanguage>,
  issues: CharacterFinalizationIssue[],
): void {
  const uniqueLanguages = new Set(languages);

  for (const language of uniqueLanguages) {
    if (!CHARACTER_LANGUAGES.includes(language)) {
      issues.push({
        code: "invalidLanguage",
        message: `Starting language "${language}" must come from the SRD Standard Languages table.`,
      });
    }
  }

  if (uniqueLanguages.size !== languages.length) {
    issues.push({
      code: "duplicateLanguages",
      message: "Character languages must be unique.",
    });
  }

  if (!uniqueLanguages.has("Common")) {
    issues.push({
      code: "missingCommonLanguage",
      message: "Character languages must include Common.",
    });
  }

  if (uniqueLanguages.size < 3) {
    issues.push({
      code: "tooFewLanguages",
      message:
        "Character languages must include Common plus two other Standard Languages.",
    });
  }

  if (languages.length > 3 || uniqueLanguages.size > 3) {
    issues.push({
      code: "tooManyLanguages",
      message:
        "This character-creation slice supports exactly three starting languages: Common plus two other Standard Languages.",
    });
  }
}
