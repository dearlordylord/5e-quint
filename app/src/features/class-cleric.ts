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
export function channelDivinityMax(classLevels: {
  readonly clericLevel: number
  readonly paladinLevel: number
}): number {
  return clericChannelDivinityMax(classLevels.clericLevel) + paladinChannelDivinityMax(classLevels.paladinLevel)
}

// =============================================================================
// Divine Order (Level 1)
//
// SRD: Choose Protector or Thaumaturge.
// =============================================================================

export type DivineOrderChoice = "protector" | "thaumaturge"

/** Thaumaturge: bonus to Arcana/Religion checks = WIS mod (min +1). */
export function thaumaturgeBonus(wisMod: number): number {
  return Math.max(1, wisMod)
}

// =============================================================================
// Divine Spark (Level 2 Channel Divinity)
//
// SRD: "Roll 1d8 and add your Wisdom modifier. You either restore Hit Points
// to the creature equal to that total or force the creature to make a
// Constitution saving throw." Scales: 2d8(L7), 3d8(L13), 4d8(L18).
// =============================================================================

export function divineSparkDice(clericLevel: number): number {
  if (clericLevel < 2) return 0
  if (clericLevel < 7) return 1
  if (clericLevel < 13) return 2
  if (clericLevel < 18) return 3
  return 4
}

export function divineSparkAmount(diceTotal: number, wisMod: number): number {
  return diceTotal + wisMod
}

// =============================================================================
// Turn Undead (Level 2 Channel Divinity)
// =============================================================================

export function hasTurnUndead(clericLevel: number): boolean {
  return clericLevel >= 2
}

// =============================================================================
// Sear Undead (Level 5)
//
// SRD: "roll a number of d8s equal to your Wisdom modifier (minimum of 1d8)"
// =============================================================================

export function searUndeadDice(wisMod: number): number {
  return Math.max(1, wisMod)
}

// =============================================================================
// Blessed Strikes (Level 7, choose one)
// =============================================================================

export type BlessedStrikesChoice = "divineStrike" | "potentSpellcasting"

/** Divine Strike: +1d8 at L7, +2d8 at L14 (Improved Blessed Strikes). */
export function divineStrikeDice(clericLevel: number): number {
  if (clericLevel < 7) return 0
  if (clericLevel < 14) return 1
  return 2
}

/** Potent Spellcasting: +WIS mod to cantrip damage. */
export function potentSpellcastingBonus(wisMod: number): number {
  return wisMod
}

/**
 * Improved Potent Spellcasting (L14): when cantrip deals damage,
 * grant temp HP = 2 × WIS mod to creature within 60ft.
 */
export function improvedPotentSpellcastingTempHp(clericLevel: number, wisMod: number): number {
  if (clericLevel < 14) return 0
  return 2 * wisMod
}

// =============================================================================
// Divine Intervention (Level 10)
//
// SRD: "cast any Cleric spell of level 5 or lower... without expending a spell
// slot or needing Material components. 1/LR."
// =============================================================================

export function canUseDivineIntervention(clericLevel: number, divineInterventionUsed: boolean): boolean {
  return clericLevel >= 10 && !divineInterventionUsed
}

// =============================================================================
// Greater Divine Intervention (Level 20)
//
// SRD: "you can choose Wish... can't use Divine Intervention again until you
// finish 2d4 Long Rests."
// =============================================================================

export function hasGreaterDivineIntervention(clericLevel: number): boolean {
  return clericLevel >= 20
}

// =============================================================================
// Life Domain Subclass (SRD 5.2.1)
//
// The only Cleric subclass in the SRD 5.2.1.
// =============================================================================

/** Disciple of Life (L3): bonus healing = 2 + spell slot level. */
export function discipleOfLifeBonus(slotLevel: number): number {
  return 2 + slotLevel
}

/** Preserve Life (L3 CD): healing pool = 5 × cleric level. */
export function preserveLifePool(clericLevel: number): number {
  return 5 * clericLevel
}

/** Blessed Healer (L6): self-heal = 2 + spell slot level (when healing others). */
export function blessedHealerSelfHeal(slotLevel: number): number {
  return 2 + slotLevel
}

/** Supreme Healing (L17): max all healing dice. */
export function supremeHealing(diceCount: number, dieSize: number): number {
  return diceCount * dieSize
}

/* eslint-enable no-magic-numbers */
