// Cleric class features extracted from dnd.qnt (non-core)
// SRD 5.2.1 Cleric

import { paladinChannelDivinityMax } from "#/features/class-paladin.ts"

// --- Channel Divinity (Level 2) ---

/* eslint-disable no-magic-numbers */

/** Max Channel Divinity uses for a Cleric at given class level. */
export function clericChannelDivinityMax(clericLevel: number): number {
  if (clericLevel < 2) return 0
  if (clericLevel < 6) return 2
  if (clericLevel < 18) return 3
  return 4
}

/** Combined Channel Divinity max from Cleric + Paladin levels (additive, per ASSUMPTIONS.md A9). */
export function channelDivinityMax(classLevels: { readonly clericLevel: number; readonly paladinLevel: number }): number {
  return clericChannelDivinityMax(classLevels.clericLevel) + paladinChannelDivinityMax(classLevels.paladinLevel)
}

/* eslint-enable no-magic-numbers */
