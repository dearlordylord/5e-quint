import type {
  CharacterClassLevels,
  CharacterDraft,
} from "#/character-domain-model.ts";
import { ZERO_CLASS_LEVELS } from "#/character-domain-model.ts";
import type {
  CharacterSpellcastingChoices,
  CharacterSpellcastingEntry,
} from "#/character-spellcasting.ts";
import { validateCharacterSpellcastingChoices } from "#/character-spellcasting.ts";
import {
  cantripChoiceCount,
  classRequiresOwnedSpellcasting,
  preparedSpellChoiceCount,
  wizardSpellbookCount,
} from "#/character-spellcasting-data.ts";
import { CASTER_CLASSES } from "#/types.ts";

function unique<T>(values: ReadonlyArray<T>): ReadonlyArray<T> {
  return [...new Set(values)];
}

function trimSpellList(
  spells: ReadonlyArray<string> | undefined,
  allowedCount: number,
  predicate: (spellId: string) => boolean,
): ReadonlyArray<string> | undefined {
  if (spells == null) return undefined;
  const filtered = unique(spells.filter(predicate)).slice(0, allowedCount);
  return filtered.length === 0 ? undefined : filtered;
}

export function sanitizeSpellcastingChoices(
  draft: CharacterDraft,
  classLevels: CharacterClassLevels,
): CharacterSpellcastingChoices | undefined {
  if (draft.spellcasting == null) return undefined;

  const nextEntries = Object.fromEntries(
    Object.entries(draft.spellcasting).flatMap(([className, entry]) => {
      if (
        !CASTER_CLASSES.includes(className as (typeof CASTER_CLASSES)[number])
      ) {
        return [];
      }

      const casterClass = className as (typeof CASTER_CLASSES)[number];
      const level = classLevels[casterClass];
      if (
        level <= 0 ||
        !classRequiresOwnedSpellcasting(casterClass, level, draft.choices)
      ) {
        return [];
      }

      const cantrips = trimSpellList(
        entry?.cantrips,
        cantripChoiceCount(casterClass, level, draft.choices),
        (spellId) => {
          const issues = validateCharacterSpellcastingChoices({
            classLevels: {
              ...ZERO_CLASS_LEVELS,
              [casterClass]: level,
            } as CharacterClassLevels,
            choices: draft.choices,
            spellcasting: {
              [casterClass]: { cantrips: [spellId] },
            } as CharacterSpellcastingChoices,
          }).map((issue) => issue.code);
          return !issues.some(
            (code) =>
              code === "invalidCantripChoice" ||
              code === "cantripNotAvailableForClass",
          );
        },
      );
      const preparedSpells = trimSpellList(
        entry?.preparedSpells,
        preparedSpellChoiceCount(casterClass, level),
        (spellId) => {
          const issues = validateCharacterSpellcastingChoices({
            classLevels: {
              ...ZERO_CLASS_LEVELS,
              [casterClass]: level,
            } as CharacterClassLevels,
            choices: draft.choices,
            spellcasting: {
              [casterClass]: { preparedSpells: [spellId] },
            } as CharacterSpellcastingChoices,
          }).map((issue) => issue.code);
          return !issues.some(
            (code) =>
              code === "invalidPreparedSpellChoice" ||
              code === "preparedSpellNotAvailableForClass" ||
              code === "spellLevelNotCastableForClass",
          );
        },
      );
      const spellbook =
        casterClass !== "wizard"
          ? undefined
          : trimSpellList(
              entry?.spellbook,
              wizardSpellbookCount(level),
              (spellId) => {
                const issues = validateCharacterSpellcastingChoices({
                  classLevels: {
                    ...ZERO_CLASS_LEVELS,
                    wizard: level,
                  } as CharacterClassLevels,
                  choices: draft.choices,
                  spellcasting: {
                    wizard: { spellbook: [spellId] },
                  },
                }).map((issue) => issue.code);
                return !issues.some(
                  (code) =>
                    code === "invalidWizardSpellbookChoice" ||
                    code === "wizardSpellbookSpellNotAvailableForClass" ||
                    code === "wizardSpellbookSpellLevelNotCastableForClass",
                );
              },
            );

      const sanitizedPreparedSpells =
        casterClass === "wizard" && spellbook != null
          ? preparedSpells?.filter((spellId) => spellbook.includes(spellId))
          : preparedSpells;

      const sanitizedEntry = {
        ...(cantrips == null ? {} : { cantrips }),
        ...(sanitizedPreparedSpells == null ||
        sanitizedPreparedSpells.length === 0
          ? {}
          : { preparedSpells: sanitizedPreparedSpells }),
        ...(spellbook == null ? {} : { spellbook }),
      } satisfies CharacterSpellcastingEntry;

      return Object.keys(sanitizedEntry).length === 0
        ? []
        : [[casterClass, sanitizedEntry] as const];
    }),
  ) as CharacterSpellcastingChoices;

  return Object.keys(nextEntries).length === 0 ? undefined : nextEntries;
}
