import { abilityModifiersFromScores } from "#/character-ability-scores.ts";
import type {
  CharacterAbilityModifiers,
  CharacterOriginFeatSelection,
  CharacterProficiencySummary,
  CharacterSheet,
} from "#/character-domain.ts";
import { BACKGROUND_FIXED_ORIGIN_FEATS } from "#/character-proficiencies.ts";
import { deriveCharacterProficiencies } from "#/character-proficiencies.ts";
import { deriveCharacterClassResources } from "#/character-resources.ts";
import type { CharacterClassResourcePool } from "#/character-feature-types.ts";
import type { ClassName } from "#/features/class-tables.ts";
import {
  ZERO_CLASS_LEVELS,
  totalClassLevels as sharedTotalClassLevels,
} from "@dnd/shared-algebras/character-advancement-algebra";

export function finalAbilityModifiers(
  sheet: Pick<CharacterSheet, "abilityScores">,
): CharacterAbilityModifiers {
  return abilityModifiersFromScores(sheet.abilityScores);
}

export function totalClassLevels(
  classLevels: Readonly<Record<ClassName, number>>,
): number {
  return sharedTotalClassLevels(classLevels);
}

export function singleClassLevels(
  primaryClass: ClassName,
  level: number,
): Readonly<Record<ClassName, number>> {
  return { ...ZERO_CLASS_LEVELS, [primaryClass]: level };
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
