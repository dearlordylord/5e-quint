import { cloneAdvancement } from "#/character-advancement.ts";
import { finalizeCharacterDraft } from "#/character-draft-analysis.ts";
import type {
  CharacterDraft,
  CharacterFinalizationResult,
  CharacterSheet,
} from "#/character-domain-model.ts";
import type { CharacterEquipmentChoices } from "#/character-equipment.ts";
import type {
  CharacterAdvancementEntry,
  CharacterBuildChoices,
} from "#/character-feature-types.ts";
import type {
  CharacterSpellcastingChoices,
  CharacterSpellcastingEntry,
} from "#/character-spellcasting.ts";

export interface CharacterLevelUpTransition {
  readonly entry: CharacterAdvancementEntry;
  readonly choices?: Partial<CharacterBuildChoices>;
  readonly spellcasting?: CharacterSpellcastingChoices;
}

function cloneEquipmentChoices(
  equipment: CharacterEquipmentChoices,
): CharacterDraft["equipment"] {
  return {
    backgroundOption: equipment.backgroundOption,
    classOption: equipment.classOption,
    purchasedCombatEquipment: [...equipment.purchasedCombatEquipment],
    remainingGoldPieces: equipment.remainingGoldPieces,
    loadout: { ...equipment.loadout },
  };
}

function cloneSpellcastingEntry(
  entry: CharacterSpellcastingEntry | undefined,
): CharacterSpellcastingEntry | undefined {
  if (entry == null) return undefined;
  return {
    ...(entry.cantrips == null ? {} : { cantrips: [...entry.cantrips] }),
    ...(entry.preparedSpells == null
      ? {}
      : { preparedSpells: [...entry.preparedSpells] }),
    ...(entry.spellbook == null ? {} : { spellbook: [...entry.spellbook] }),
  };
}

function mergeSpellcastingChoices(
  base: CharacterSheet["spellcasting"],
  patch: CharacterSpellcastingChoices | undefined,
): CharacterSpellcastingChoices | undefined {
  if (base == null && patch == null) return undefined;

  const merged = new Map<string, CharacterSpellcastingEntry>();

  for (const [className, entry] of Object.entries(base ?? {})) {
    const cloned = cloneSpellcastingEntry(entry);
    if (cloned != null) merged.set(className, cloned);
  }

  for (const [className, entry] of Object.entries(patch ?? {})) {
    const cloned = cloneSpellcastingEntry(entry);
    if (cloned != null) merged.set(className, cloned);
  }

  return Object.fromEntries(merged) as CharacterSpellcastingChoices;
}

export function characterDraftFromSheet(
  sheet: CharacterSheet,
  transition?: CharacterLevelUpTransition,
): CharacterDraft {
  return {
    primaryClass: sheet.primaryClass,
    advancement: [
      ...cloneAdvancement(sheet.advancement),
      ...(transition == null ? [] : cloneAdvancement([transition.entry])),
    ],
    background: sheet.background,
    abilityScoreGeneration: {
      ...sheet.abilityScoreGeneration,
      assignedScores: { ...sheet.abilityScoreGeneration.assignedScores },
    },
    backgroundAbilityScoreIncrease: sheet.backgroundAbilityScoreIncrease,
    species: sheet.species,
    languages: [...sheet.languages],
    alignment: sheet.alignment,
    choices:
      transition?.choices == null
        ? sheet.choices
        : { ...sheet.choices, ...transition.choices },
    equipment: cloneEquipmentChoices(sheet.equipment),
    spellcasting: mergeSpellcastingChoices(
      sheet.spellcasting,
      transition?.spellcasting,
    ),
  };
}

export function advanceCharacterSheet(
  sheet: CharacterSheet,
  transition: CharacterLevelUpTransition,
): CharacterFinalizationResult {
  return finalizeCharacterDraft(characterDraftFromSheet(sheet, transition));
}
