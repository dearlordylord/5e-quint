// SRD-derived domain constants shared across core and feature modules.

import type { AbilityModifier, DifficultyClass, Size } from "#/types.ts";
import { difficultyClass } from "#/types.ts";

/** Creature sizes in ascending order (SRD 5.2.1). */
export const SIZE_ORDER: ReadonlyArray<Size> = [
  "tiny",
  "small",
  "medium",
  "large",
  "huge",
  "gargantuan",
];

/** Base value for SRD feature save DCs: 8 + ability modifier + proficiency bonus. */
export const SAVE_DC_BASE = 8;

/** Standard SRD feature save DC: 8 + ability modifier + proficiency bonus. */
export function featureSaveDC(
  abilityMod: AbilityModifier,
  profBonus: number,
): DifficultyClass {
  return difficultyClass(SAVE_DC_BASE + abilityMod + profBonus);
}

/** Draconic ancestry damage types — shared by Dragonborn species and Draconic Sorcery subclass. */
export const DRACONIC_ANCESTRY_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
] as const;
export type DraconicAncestryType = (typeof DRACONIC_ANCESTRY_TYPES)[number];
