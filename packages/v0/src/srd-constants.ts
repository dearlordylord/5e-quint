// SRD-derived domain constants shared across core and feature modules.

import type { Size } from "@dnd/shared/types";
export { SAVE_DC_BASE, featureSaveDC } from "@dnd/shared/game-facts";

/** Creature sizes in ascending order (SRD 5.2.1). */
export const SIZE_ORDER: ReadonlyArray<Size> = [
  "tiny",
  "small",
  "medium",
  "large",
  "huge",
  "gargantuan",
];

/**
 * Draconic damage types currently shared by Dragonborn species and Draconic
 * Sorcery. This is slated to become a Surface-authored enum/fact; Dragonborn
 * ancestry itself is the dragon-kind choice, with damage type derived from it.
 */
export const DRACONIC_ANCESTRY_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
] as const;
export type DraconicAncestryType = (typeof DRACONIC_ANCESTRY_TYPES)[number];
