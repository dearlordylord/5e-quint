// Warlock class features — SRD 5.2.1
// TS-only: resource tracking is caller-managed, invocations are config/capability
// flags, patron effects are target-relative or multi-creature.

import type { DamageType } from "#/types.ts"

// --- Constants ---

/* eslint-disable no-magic-numbers */

const MAGICAL_CUNNING_LEVEL = 2
const CONTACT_PATRON_LEVEL = 9
const ELDRITCH_MASTER_LEVEL = 20

// Invocation prerequisites
const AGONIZING_BLAST_LEVEL = 2
const DEVILS_SIGHT_LEVEL = 2
const ELDRITCH_MIND_LEVEL = 1
const ELDRITCH_SMITE_LEVEL = 5
const ELDRITCH_SPEAR_LEVEL = 2
const THIRSTING_BLADE_LEVEL = 5
const DEVOURING_BLADE_LEVEL = 12
const LIFEDRINKER_LEVEL = 9

// Fiend patron
const DARK_ONES_BLESSING_LEVEL = 3
const DARK_ONES_OWN_LUCK_LEVEL = 6
const FIENDISH_RESILIENCE_LEVEL = 10
const HURL_THROUGH_HELL_LEVEL = 14

// =============================================================================
// Pact Magic — slot count and level progression
// =============================================================================

/** Number of Pact Magic spell slots at given Warlock level. */
export function pactSlotCount(warlockLevel: number): number {
  if (warlockLevel <= 0) return 0
  if (warlockLevel < 2) return 1
  if (warlockLevel < 11) return 2
  if (warlockLevel < 17) return 3
  return 4
}

/** Pact Magic spell slot level at given Warlock level. */
export function pactSlotLevel(warlockLevel: number): number {
  if (warlockLevel <= 0) return 0
  if (warlockLevel < 3) return 1
  if (warlockLevel < 5) return 2
  if (warlockLevel < 7) return 3
  if (warlockLevel < 9) return 4
  return 5
}

// =============================================================================
// Magical Cunning (Level 2)
//
// SRD: "you regain expended Pact Magic spell slots but no more than a number
// equal to half your maximum (round up). Once you use this feature, you can't
// do so again until you finish a Long Rest."
// =============================================================================

export function canUseMagicalCunning(warlockLevel: number, magicalCunningUsed: boolean): boolean {
  return warlockLevel >= MAGICAL_CUNNING_LEVEL && !magicalCunningUsed
}

/** Number of slots regained by Magical Cunning (half max, round up). */
export function magicalCunningRecovery(maxSlots: number): number {
  return Math.ceil(maxSlots / 2)
}

// =============================================================================
// Contact Patron (Level 9) — cast Contact Other Plane 1/LR without slot
// =============================================================================

export function hasContactPatron(warlockLevel: number): boolean {
  return warlockLevel >= CONTACT_PATRON_LEVEL
}

// =============================================================================
// Mystic Arcanum (Level 11-17)
//
// SRD: One spell each of L6 (at 11), L7 (at 13), L8 (at 15), L9 (at 17).
// Each castable 1/LR without a slot.
// =============================================================================

/** Returns the spell levels available as Mystic Arcanum at given Warlock level. */
export function mysticArcanumLevels(warlockLevel: number): ReadonlyArray<number> {
  if (warlockLevel < 11) return []
  if (warlockLevel < 13) return [6]
  if (warlockLevel < 15) return [6, 7]
  if (warlockLevel < 17) return [6, 7, 8]
  return [6, 7, 8, 9]
}

export function canUseMysticArcanum(level: number, usedLevels: ReadonlySet<number>): boolean {
  return !usedLevels.has(level)
}

// =============================================================================
// Eldritch Master (Level 20)
//
// SRD: "When you use your Magical Cunning feature, you regain all your
// expended Pact Magic spell slots." (passive upgrade to Magical Cunning)
// =============================================================================

export function hasEldritchMaster(warlockLevel: number): boolean {
  return warlockLevel >= ELDRITCH_MASTER_LEVEL
}

// =============================================================================
// Invocation Count
// =============================================================================

/** Number of Eldritch Invocations known at given Warlock level. */
export function invocationsKnown(warlockLevel: number): number {
  if (warlockLevel <= 0) return 0
  if (warlockLevel < 2) return 1
  if (warlockLevel < 5) return 3
  if (warlockLevel < 7) return 5
  if (warlockLevel < 9) return 6
  if (warlockLevel < 12) return 7
  if (warlockLevel < 15) return 8
  if (warlockLevel < 18) return 9
  return 10
}

// =============================================================================
// Eldritch Invocations — Combat-Relevant
// =============================================================================

/** Agonizing Blast (L2+): +CHA mod to cantrip damage. */
export function agonizingBlastBonus(warlockLevel: number, chaMod: number): number {
  return warlockLevel >= AGONIZING_BLAST_LEVEL ? chaMod : 0
}

/** Thirsting Blade (L5+, Pact of the Blade): Extra Attack with pact weapon. */
export function hasThirstingBlade(warlockLevel: number): boolean {
  return warlockLevel >= THIRSTING_BLADE_LEVEL
}

/** Devouring Blade (L12+, requires Thirsting Blade): two extra attacks (3 total). */
export function hasDevouringBlade(warlockLevel: number): boolean {
  return warlockLevel >= DEVOURING_BLADE_LEVEL
}

/** Eldritch Smite (L5+, Pact of the Blade): Force damage d8s = 1 + slotLevel. */
export function eldritchSmiteDice(slotLevel: number): number {
  return 1 + slotLevel
}

export function canEldritchSmite(warlockLevel: number): boolean {
  return warlockLevel >= ELDRITCH_SMITE_LEVEL
}

/** Repelling Blast (L2+): push 10ft per hit. */
export function repellingBlastDistance(): number {
  return 10
}

/** Eldritch Spear (L2+): +30ft per Warlock level to cantrip range. */
export function eldritchSpearBonusRange(warlockLevel: number): number {
  return warlockLevel >= ELDRITCH_SPEAR_LEVEL ? 30 * warlockLevel : 0
}

/** Eldritch Mind: Advantage on concentration saves. */
export function hasEldritchMind(warlockLevel: number): boolean {
  return warlockLevel >= ELDRITCH_MIND_LEVEL
}

/** Devil's Sight (L2+): see in darkness (magical and nonmagical) 120ft. */
export function hasDevilsSight(warlockLevel: number): boolean {
  return warlockLevel >= DEVILS_SIGHT_LEVEL
}

/** Fiendish Vigor (L2+): False Life at will, max roll on temp HP die. */
export function fiendishVigorTempHp(dieSize: number): number {
  return dieSize
}

/** Lifedrinker (L9+, Pact of the Blade): +1d6 Necrotic/Psychic/Radiant per turn. */
export function hasLifedrinker(warlockLevel: number): boolean {
  return warlockLevel >= LIFEDRINKER_LEVEL
}

/** Gift of the Protectors (L9+, Pact of the Tome): max names = CHA mod. */
export function giftOfProtectorsMaxNames(chaMod: number): number {
  return Math.max(1, chaMod)
}

// =============================================================================
// Fiend Patron Subclass (SRD 5.2.1)
//
// The only Warlock subclass in the SRD 5.2.1.
// =============================================================================

// --- Dark One's Blessing (L3) ---

/**
 * SRD: "When you reduce an enemy to 0 Hit Points, you gain Temporary Hit Points
 * equal to your Charisma modifier plus your Warlock level (minimum of 1)."
 * No CR threshold (SRD 5.2.1 correction from plan).
 */
export function darkOnesBlessingTempHp(warlockLevel: number, chaMod: number): number {
  if (warlockLevel < DARK_ONES_BLESSING_LEVEL) return 0
  return Math.max(1, chaMod + warlockLevel)
}

// --- Dark One's Own Luck (L6) ---

/**
 * SRD: "you can use this feature to add 1d10 to your roll... a number of
 * times equal to your Charisma modifier (minimum of once)... You regain all
 * expended uses when you finish a Long Rest."
 */
export function darkOnesOwnLuckMaxUses(chaMod: number): number {
  return Math.max(1, chaMod)
}

export function canUseDarkOnesOwnLuck(warlockLevel: number, usesRemaining: number): boolean {
  return warlockLevel >= DARK_ONES_OWN_LUCK_LEVEL && usesRemaining > 0
}

// --- Fiendish Resilience (L10) ---

/**
 * SRD: "Choose one damage type, other than Force, whenever you finish a Short
 * or Long Rest. You have Resistance to that damage type until you choose a
 * different one."
 */
export function hasFiendishResilience(warlockLevel: number): boolean {
  return warlockLevel >= FIENDISH_RESILIENCE_LEVEL
}

const FIENDISH_RESILIENCE_EXCLUDED = ["force"] as const satisfies ReadonlyArray<DamageType>

export function isValidFiendishResistanceType(damageType: DamageType): boolean {
  return !FIENDISH_RESILIENCE_EXCLUDED.includes(damageType as (typeof FIENDISH_RESILIENCE_EXCLUDED)[number])
}

// --- Hurl Through Hell (L14) ---

/**
 * SRD: "The target takes 8d10 Psychic damage if it isn't a Fiend, and it has
 * the Incapacitated condition until the end of your next turn."
 * 1/LR or expend a Pact Magic spell slot to restore.
 */
export function canUseHurlThroughHell(warlockLevel: number, hurlUsed: boolean): boolean {
  return warlockLevel >= HURL_THROUGH_HELL_LEVEL && !hurlUsed
}

export function hurlThroughHellDice(): { readonly count: number; readonly size: number } {
  return { count: 8, size: 10 }
}

/* eslint-enable no-magic-numbers */
