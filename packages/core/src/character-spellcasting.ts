import type { CharacterBuildChoices } from "#/character-feature-types.ts";
import {
  MODELED_PREPARED_SPELLS,
  type ModeledPreparedSpell,
} from "#/features/spell-available-actions.ts";
import {
  cantripChoiceCount,
  classRequiresOwnedSpellcasting,
  classSpellSlots,
  maxSpellLevelForClass,
  preparedSpellChoiceCount,
  SPELLCASTING_ABILITIES,
  wizardSpellbookCount,
} from "#/character-spellcasting-data.ts";
import type { ClassName } from "#/features/class-tables.ts";
import { SRD_SPELLS } from "#/features/spell-registry.ts";
import type {
  Ability,
  CasterClass,
  DifficultyClass,
  SpellName,
  SpellSlots,
} from "#/types.ts";
import { CASTER_CLASSES, difficultyClass } from "#/types.ts";

export const CHARACTER_SPELLCASTING_ISSUE_CODES = [
  "missingSpellcastingChoices",
  "missingCantripChoices",
  "wrongCantripChoiceCount",
  "duplicateCantripChoice",
  "invalidCantripChoice",
  "cantripNotAvailableForClass",
  "missingPreparedSpellChoices",
  "wrongPreparedSpellChoiceCount",
  "duplicatePreparedSpellChoice",
  "invalidPreparedSpellChoice",
  "preparedSpellNotAvailableForClass",
  "spellLevelNotCastableForClass",
  "missingWizardSpellbookChoices",
  "wrongWizardSpellbookChoiceCount",
  "duplicateWizardSpellbookChoice",
  "invalidWizardSpellbookChoice",
  "wizardSpellbookSpellNotAvailableForClass",
  "wizardSpellbookSpellLevelNotCastableForClass",
  "wizardPreparedSpellNotInSpellbook",
] as const;
export type CharacterSpellcastingIssueCode =
  (typeof CHARACTER_SPELLCASTING_ISSUE_CODES)[number];

export interface CharacterSpellcastingEntry {
  readonly cantrips?: ReadonlyArray<string>;
  readonly preparedSpells?: ReadonlyArray<string>;
  readonly spellbook?: ReadonlyArray<string>;
}

export type CharacterSpellcastingChoices = Partial<
  Readonly<Record<CasterClass, CharacterSpellcastingEntry>>
>;

export interface CharacterSpellcastingClassSummary {
  readonly className: CasterClass;
  readonly spellcastingAbility: Ability;
  readonly cantrips: ReadonlyArray<SpellName>;
  readonly preparedSpells: ReadonlyArray<SpellName>;
  readonly spellSaveDC: DifficultyClass;
  readonly spellAttackBonus: number;
}

export interface CharacterSpellcastingSummary {
  readonly classes: ReadonlyArray<CharacterSpellcastingClassSummary>;
  readonly preparedSpells: ReadonlySet<SpellName>;
  readonly preparedSpellSaveDCs: ReadonlyMap<SpellName, DifficultyClass>;
  readonly modeledPreparedSpells: ReadonlySet<ModeledPreparedSpell>;
  readonly slotsMax: SpellSlots;
  readonly slotsCurrent: SpellSlots;
  readonly pactSlotsMax: number;
  readonly pactSlotsCurrent: number;
  readonly pactSlotLevel: number;
}

interface SpellcastingValidationParams {
  readonly classLevels: Readonly<Record<ClassName, number>>;
  readonly choices?: CharacterBuildChoices;
  readonly spellcasting?: CharacterSpellcastingChoices;
}

type SpellcastingIssue = {
  readonly code: CharacterSpellcastingIssueCode;
  readonly message: string;
};

function normalizeSpellName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const SPELLS_BY_ID = new Map(
  SRD_SPELLS.map((spell) => [normalizeSpellName(spell.name), spell] as const),
);

function duplicateSpells(values: ReadonlyArray<string>): ReadonlyArray<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function validateSpellList(params: {
  readonly className: CasterClass;
  readonly spells: ReadonlyArray<string>;
  readonly expectedCount: number;
  readonly level: number;
  readonly maxSpellLevel: number;
  readonly requireCantrip: boolean;
  readonly codes: {
    readonly missing: CharacterSpellcastingIssueCode;
    readonly wrongCount: CharacterSpellcastingIssueCode;
    readonly duplicate: CharacterSpellcastingIssueCode;
    readonly invalid: CharacterSpellcastingIssueCode;
    readonly unavailable: CharacterSpellcastingIssueCode;
    readonly notCastable: CharacterSpellcastingIssueCode;
  };
}): ReadonlyArray<SpellcastingIssue> {
  const issues: SpellcastingIssue[] = [];
  if (params.spells.length !== params.expectedCount) {
    issues.push({
      code: params.codes.wrongCount,
      message: `${params.className} requires exactly ${params.expectedCount} ${params.requireCantrip ? "cantrip" : "prepared spell"} choice(s) at level ${params.level}.`,
    });
  }
  for (const duplicate of duplicateSpells(params.spells)) {
    issues.push({
      code: params.codes.duplicate,
      message: `${params.className} spell choices cannot include duplicate spell ${duplicate}.`,
    });
  }
  for (const spellId of params.spells) {
    const spell = SPELLS_BY_ID.get(spellId);
    if (spell == null) {
      issues.push({
        code: params.codes.invalid,
        message: `Unknown SRD spell choice ${spellId}.`,
      });
      continue;
    }
    const isCantrip = spell.level === 0;
    if (isCantrip !== params.requireCantrip) {
      issues.push({
        code: params.codes.invalid,
        message: `${spellId} must ${params.requireCantrip ? "" : "not "}be a cantrip.`,
      });
    }
    if (!(spell.classes as ReadonlyArray<string>).includes(params.className)) {
      issues.push({
        code: params.codes.unavailable,
        message: `${spellId} is not on the ${params.className} spell list.`,
      });
    }
    if (!params.requireCantrip && spell.level > params.maxSpellLevel) {
      issues.push({
        code: params.codes.notCastable,
        message: `${spellId} is above the highest spell level available to ${params.className} at level ${params.level}.`,
      });
    }
  }
  return issues;
}

export function validateCharacterSpellcastingChoices(
  params: SpellcastingValidationParams,
): ReadonlyArray<SpellcastingIssue> {
  const issues: SpellcastingIssue[] = [];

  for (const className of CASTER_CLASSES) {
    const level = params.classLevels[className];
    if (level <= 0) continue;
    if (!classRequiresOwnedSpellcasting(className, level, params.choices)) {
      continue;
    }

    const entry = params.spellcasting?.[className];
    if (entry == null) {
      issues.push({
        code: "missingSpellcastingChoices",
        message: `${className} characters require owned spellcasting choices before finalization.`,
      });
      continue;
    }

    const expectedCantrips = cantripChoiceCount(
      className,
      level,
      params.choices,
    );
    if (expectedCantrips > 0) {
      if (entry.cantrips == null) {
        issues.push({
          code: "missingCantripChoices",
          message: `${className} requires cantrip choices before finalization.`,
        });
      } else {
        issues.push(
          ...validateSpellList({
            className,
            spells: entry.cantrips,
            expectedCount: expectedCantrips,
            level,
            maxSpellLevel: 0,
            requireCantrip: true,
            codes: {
              missing: "missingCantripChoices",
              wrongCount: "wrongCantripChoiceCount",
              duplicate: "duplicateCantripChoice",
              invalid: "invalidCantripChoice",
              unavailable: "cantripNotAvailableForClass",
              notCastable: "spellLevelNotCastableForClass",
            },
          }),
        );
      }
    }

    const expectedPreparedSpells = preparedSpellChoiceCount(className, level);
    if (expectedPreparedSpells > 0) {
      if (entry.preparedSpells == null) {
        issues.push({
          code: "missingPreparedSpellChoices",
          message: `${className} requires prepared spell choices before finalization.`,
        });
      } else {
        issues.push(
          ...validateSpellList({
            className,
            spells: entry.preparedSpells,
            expectedCount: expectedPreparedSpells,
            level,
            maxSpellLevel: maxSpellLevelForClass(className, level),
            requireCantrip: false,
            codes: {
              missing: "missingPreparedSpellChoices",
              wrongCount: "wrongPreparedSpellChoiceCount",
              duplicate: "duplicatePreparedSpellChoice",
              invalid: "invalidPreparedSpellChoice",
              unavailable: "preparedSpellNotAvailableForClass",
              notCastable: "spellLevelNotCastableForClass",
            },
          }),
        );
      }
    }

    if (className !== "wizard") continue;
    if (entry.spellbook == null) {
      issues.push({
        code: "missingWizardSpellbookChoices",
        message: "wizard requires an owned spellbook before finalization.",
      });
      continue;
    }

    issues.push(
      ...validateSpellList({
        className,
        spells: entry.spellbook,
        expectedCount: wizardSpellbookCount(level),
        level,
        maxSpellLevel: maxSpellLevelForClass("wizard", level),
        requireCantrip: false,
        codes: {
          missing: "missingWizardSpellbookChoices",
          wrongCount: "wrongWizardSpellbookChoiceCount",
          duplicate: "duplicateWizardSpellbookChoice",
          invalid: "invalidWizardSpellbookChoice",
          unavailable: "wizardSpellbookSpellNotAvailableForClass",
          notCastable: "wizardSpellbookSpellLevelNotCastableForClass",
        },
      }),
    );

    const spellbook = new Set(entry.spellbook);
    for (const preparedSpell of entry.preparedSpells ?? []) {
      if (!spellbook.has(preparedSpell)) {
        issues.push({
          code: "wizardPreparedSpellNotInSpellbook",
          message: `${preparedSpell} must be present in the wizard spellbook before it can be prepared.`,
        });
      }
    }
  }

  return issues;
}

export function deriveCharacterSpellcastingSummary(params: {
  readonly abilityScores: Readonly<Record<Ability, number>>;
  readonly classLevels: Readonly<Record<ClassName, number>>;
  readonly choices: CharacterBuildChoices;
  readonly spellcasting: CharacterSpellcastingChoices;
  readonly proficiencyBonus: number;
}): CharacterSpellcastingSummary {
  const slotState = classSpellSlots(params.classLevels);
  const classes: CharacterSpellcastingClassSummary[] = [];
  const preparedSpells = new Set<SpellName>();
  const preparedSpellSaveDCs = new Map<SpellName, DifficultyClass>();

  for (const className of CASTER_CLASSES) {
    const level = params.classLevels[className];
    if (level <= 0) continue;
    if (!classRequiresOwnedSpellcasting(className, level, params.choices)) {
      continue;
    }

    const entry = params.spellcasting[className];
    if (entry == null) continue;

    const spellcastingAbility = SPELLCASTING_ABILITIES[className];
    const abilityModifier = Math.floor(
      (params.abilityScores[spellcastingAbility] - 10) / 2,
    );
    const spellSaveDC = difficultyClass(
      8 + abilityModifier + params.proficiencyBonus,
    );
    const spellAttackBonus = abilityModifier + params.proficiencyBonus;
    const classPreparedSpells = [
      ...(entry.preparedSpells ?? []),
    ] as ReadonlyArray<SpellName>;

    for (const spellName of classPreparedSpells) {
      preparedSpells.add(spellName);
      const previous = preparedSpellSaveDCs.get(spellName);
      if (previous == null || spellSaveDC > previous) {
        preparedSpellSaveDCs.set(spellName, spellSaveDC);
      }
    }

    classes.push({
      className,
      spellcastingAbility,
      cantrips: [...(entry.cantrips ?? [])] as ReadonlyArray<SpellName>,
      preparedSpells: classPreparedSpells,
      spellSaveDC,
      spellAttackBonus,
    });
  }

  const modeledPreparedSpells = new Set<ModeledPreparedSpell>();
  for (const spellName of preparedSpells) {
    if (
      (MODELED_PREPARED_SPELLS as ReadonlyArray<string>).includes(spellName)
    ) {
      modeledPreparedSpells.add(spellName as ModeledPreparedSpell);
    }
  }

  return {
    classes,
    preparedSpells,
    preparedSpellSaveDCs,
    modeledPreparedSpells,
    slotsMax: slotState.slotsMax,
    slotsCurrent: slotState.slotsCurrent,
    pactSlotsMax: slotState.pactSlotsMax,
    pactSlotsCurrent: slotState.pactSlotsCurrent,
    pactSlotLevel: slotState.pactSlotLevel,
  };
}
