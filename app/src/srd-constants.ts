// SRD-derived domain constants shared across core and feature modules.

import type { Size } from "#/types.ts"

/** Creature sizes in ascending order (SRD 5.2.1). */
export const SIZE_ORDER: ReadonlyArray<Size> = ["tiny", "small", "medium", "large", "huge", "gargantuan"]

/** Base value for SRD feature save DCs: 8 + ability modifier + proficiency bonus. */
export const SAVE_DC_BASE = 8

/** Standard SRD feature save DC: 8 + ability modifier + proficiency bonus. */
export function featureSaveDC(abilityMod: number, profBonus: number): number {
  return SAVE_DC_BASE + abilityMod + profBonus
}
