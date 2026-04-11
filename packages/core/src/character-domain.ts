import { CLASS_NAMES, type ClassName } from "#/features/class-tables.ts";

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

export const CHARACTER_BACKGROUNDS = [
  "acolyte",
  "criminal",
  "sage",
  "soldier",
] as const;
export type CharacterBackground = (typeof CHARACTER_BACKGROUNDS)[number];

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
  "Abyssal",
  "Celestial",
  "Deep Speech",
  "Druidic",
  "Infernal",
  "Primordial",
  "Sylvan",
  "Thieves' Cant",
  "Undercommon",
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
  readonly species?: CharacterSpecies;
  readonly languages?: ReadonlyArray<CharacterLanguage>;
  readonly alignment?: Alignment;
}

export interface CharacterSheet {
  readonly primaryClass: ClassName;
  readonly classLevels: CharacterClassLevels;
  readonly background: CharacterBackground;
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
  "missingSpecies",
  "missingLanguages",
  "duplicateLanguages",
  "missingCommonLanguage",
  "tooFewLanguages",
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

  const uniqueLanguages = new Set(draft.languages ?? []);
  if (draft.languages != null) {
    if (uniqueLanguages.size !== draft.languages.length) {
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
          "Character languages must include at least Common plus two more languages.",
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    sheet: {
      primaryClass: draft.primaryClass!,
      classLevels,
      background: draft.background!,
      species: draft.species!,
      languages: [...draft.languages!],
      alignment: draft.alignment!,
    },
  };
}
