// Sorcerer class features: Innate Sorcery, Font of Magic (Sorcery Points), Flexible Casting, Metamagic
// SRD 5.2.1 Sorcerer

import type { SpellSlots } from "#/types.ts"

// --- Constants ---

/** Sorcery Point cost to create a spell slot of a given level (1-5). */
const SLOT_CREATION_COST = [2, 3, 5, 6, 7] as const satisfies ReadonlyArray<number>

/** Minimum Sorcerer level required to create a slot of a given level (1-5). */
const SLOT_CREATION_MIN_LEVEL = [2, 3, 5, 7, 9] as const satisfies ReadonlyArray<number>

const MAX_CREATED_SLOT_LEVEL = 5
const INNATE_SORCERY_MAX_CHARGES = 2
const SORCERY_INCARNATE_LEVEL = 7
const SORCERY_INCARNATE_COST = 2
const FONT_OF_MAGIC_LEVEL = 2

// --- Sorcery Points ---

/** Sorcery Points max for a given Sorcerer level. Pool = sorcerer level, available from L2. */
export function sorceryPointsMax(sorcererLevel: number): number {
  if (sorcererLevel < FONT_OF_MAGIC_LEVEL) return 0
  return sorcererLevel
}

// --- Innate Sorcery ---

export interface InnateSorceryState {
  readonly innateSorceryActive: boolean
  readonly innateSorceryCharges: number
  readonly sorceryPoints: number
  readonly sorcererLevel: number
  readonly bonusActionUsed: boolean
}

export interface InnateSorceryResult {
  readonly innateSorceryActive: true
  readonly innateSorceryCharges: number
  readonly sorceryPoints: number
  readonly bonusActionUsed: true
  readonly spellSaveDCBonus: number
  readonly spellAttackAdvantage: boolean
}

/** Can the sorcerer activate Innate Sorcery? */
export function canUseInnateSorcery(state: InnateSorceryState): boolean {
  if (state.bonusActionUsed) return false
  if (state.innateSorceryCharges > 0) return true
  // Sorcery Incarnate (L7): spend 2 SP when no charges remain
  if (state.sorcererLevel >= SORCERY_INCARNATE_LEVEL && state.sorceryPoints >= SORCERY_INCARNATE_COST) return true
  return false
}

/**
 * Activate Innate Sorcery as a Bonus Action.
 * Lasts 1 minute: +1 spell save DC, Advantage on Sorcerer spell attack rolls.
 * 2 uses/LR. At L7+ (Sorcery Incarnate), can spend 2 SP if no charges left.
 */
export function useInnateSorcery(state: InnateSorceryState): InnateSorceryResult {
  let charges = state.innateSorceryCharges
  let points = state.sorceryPoints

  if (charges > 0) {
    charges = charges - 1
  } else {
    // Sorcery Incarnate: spend 2 SP
    points = points - SORCERY_INCARNATE_COST
  }

  return {
    innateSorceryActive: true,
    innateSorceryCharges: charges,
    sorceryPoints: points,
    bonusActionUsed: true,
    spellSaveDCBonus: 1,
    spellAttackAdvantage: true
  }
}

// --- Flexible Casting: Slot -> Points ---

export interface ConvertSlotToPointsState {
  readonly sorceryPoints: number
  readonly sorceryPointsMax: number
  readonly slotsCurrent: SpellSlots
}

export interface ConvertSlotToPointsResult {
  readonly sorceryPoints: number
  readonly slotsCurrent: SpellSlots
}

/** Can the sorcerer convert a spell slot to sorcery points? No action required. */
export function canConvertSlotToPoints(state: ConvertSlotToPointsState, slotLevel: number): boolean {
  if (slotLevel < 1 || slotLevel > state.slotsCurrent.length) return false
  if (state.slotsCurrent[slotLevel - 1] <= 0) return false
  // Can't exceed max SP
  if (state.sorceryPoints >= state.sorceryPointsMax) return false
  return true
}

/**
 * Expend a spell slot to gain Sorcery Points equal to the slot's level.
 * No action required. Points gained = slot level. Capped at max.
 */
export function convertSlotToPoints(state: ConvertSlotToPointsState, slotLevel: number): ConvertSlotToPointsResult {
  const idx = slotLevel - 1
  const pointsGained = slotLevel
  const newPoints = Math.min(state.sorceryPoints + pointsGained, state.sorceryPointsMax)
  const newSlots = state.slotsCurrent.map((v, i) => (i === idx ? v - 1 : v))

  return {
    sorceryPoints: newPoints,
    slotsCurrent: newSlots
  }
}

// --- Flexible Casting: Points -> Slot ---

export interface ConvertPointsToSlotState {
  readonly sorceryPoints: number
  readonly slotsCurrent: SpellSlots
  readonly sorcererLevel: number
  readonly bonusActionUsed: boolean
}

export interface ConvertPointsToSlotResult {
  readonly sorceryPoints: number
  readonly slotsCurrent: SpellSlots
  readonly bonusActionUsed: true
}

/** Get the SP cost to create a spell slot of the given level (1-5). Returns 0 if invalid. */
export function slotCreationCost(slotLevel: number): number {
  if (slotLevel < 1 || slotLevel > MAX_CREATED_SLOT_LEVEL) return 0
  return SLOT_CREATION_COST[slotLevel - 1]
}

/** Can the sorcerer create a spell slot from Sorcery Points? Bonus Action required. */
export function canConvertPointsToSlot(state: ConvertPointsToSlotState, slotLevel: number): boolean {
  if (state.bonusActionUsed) return false
  if (slotLevel < 1 || slotLevel > MAX_CREATED_SLOT_LEVEL) return false
  // Check minimum sorcerer level
  if (state.sorcererLevel < SLOT_CREATION_MIN_LEVEL[slotLevel - 1]) return false
  const cost = SLOT_CREATION_COST[slotLevel - 1]
  if (state.sorceryPoints < cost) return false
  return true
}

/**
 * Spend Sorcery Points to create a spell slot (Bonus Action).
 * Max level 5. Created slots vanish on LR.
 * Costs: 1st=2, 2nd=3, 3rd=5, 4th=6, 5th=7
 */
export function convertPointsToSlot(state: ConvertPointsToSlotState, slotLevel: number): ConvertPointsToSlotResult {
  const idx = slotLevel - 1
  const cost = SLOT_CREATION_COST[idx]
  const newSlots = state.slotsCurrent.map((v, i) => (i === idx ? v + 1 : v))

  return {
    sorceryPoints: state.sorceryPoints - cost,
    slotsCurrent: newSlots,
    bonusActionUsed: true
  }
}

// --- Long Rest ---

export interface SorcererLongRestState {
  readonly sorcererLevel: number
}

export interface SorcererLongRestResult {
  readonly sorceryPoints: number
  readonly sorceryPointsMax: number
  readonly innateSorceryActive: boolean
  readonly innateSorceryCharges: number
}

/** Reset sorcerer resources on Long Rest. */
export function sorcererLongRest(state: SorcererLongRestState): SorcererLongRestResult {
  const max = sorceryPointsMax(state.sorcererLevel)
  return {
    sorceryPoints: max,
    sorceryPointsMax: max,
    innateSorceryActive: false,
    innateSorceryCharges: INNATE_SORCERY_MAX_CHARGES
  }
}

// --- Short Rest: Sorcerous Restoration (Level 5) ---

const SORCEROUS_RESTORATION_LEVEL = 5

export interface SorcerousRestorationState {
  readonly sorceryPoints: number
  readonly sorceryPointsMax: number
  readonly sorcererLevel: number
  readonly sorcerousRestorationUsed: boolean
}

export interface SorcerousRestorationResult {
  readonly sorceryPoints: number
  readonly sorcerousRestorationUsed: true
}

/** Can use Sorcerous Restoration? Available at L5+, once per LR. */
export function canUseSorcerousRestoration(state: SorcerousRestorationState): boolean {
  if (state.sorcererLevel < SORCEROUS_RESTORATION_LEVEL) return false
  if (state.sorcerousRestorationUsed) return false
  if (state.sorceryPoints >= state.sorceryPointsMax) return false
  return true
}

/** Regain SP on short rest, up to half sorcerer level (round down). Once per LR. */
export function sorcerousRestoration(state: SorcerousRestorationState): SorcerousRestorationResult {
  const HALVE = 2
  const regain = Math.floor(state.sorcererLevel / HALVE)
  const newPoints = Math.min(state.sorceryPoints + regain, state.sorceryPointsMax)
  return {
    sorceryPoints: newPoints,
    sorcerousRestorationUsed: true
  }
}

// =============================================================================
// Metamagic (Level 2+)
//
// SRD: "You can use only one Metamagic option on a spell when you cast it,
// unless otherwise noted." Empowered Spell and Seeking Spell can stack
// with another option.
// =============================================================================

export const METAMAGIC_OPTIONS = [
  "careful",
  "distant",
  "empowered",
  "extended",
  "heightened",
  "quickened",
  "seeking",
  "subtle",
  "transmuted",
  "twinned"
] as const

export type MetamagicOption = (typeof METAMAGIC_OPTIONS)[number]

export const TRANSMUTABLE_DAMAGE_TYPES = ["acid", "cold", "fire", "lightning", "poison", "thunder"] as const

export type TransmutableDamageType = (typeof TRANSMUTABLE_DAMAGE_TYPES)[number]

/** Number of Metamagic options known at given level. */
export function metamagicOptionsKnown(sorcererLevel: number): number {
  if (sorcererLevel < 2) return 0
  if (sorcererLevel < 10) return 2
  if (sorcererLevel < 17) return 4
  return 6
}

/** Whether a Metamagic option can be stacked with another on the same spell. */
export function canStackMetamagic(option: MetamagicOption): boolean {
  return option === "empowered" || option === "seeking"
}

// --- Individual Metamagic Options ---

/** Careful Spell (1 SP): chosen creatures auto-succeed save, take no damage on success. */
export function carefulSpellMaxCreatures(chaMod: number): number {
  return Math.max(1, chaMod)
}

export function carefulSpellCost(): number {
  return 1
}

/** Distant Spell (1 SP): double range if 5ft+, or Touch → 30ft. */
export function distantSpellRange(baseRange: number): number {
  if (baseRange === 0) return 30 // Touch → 30ft
  return baseRange * 2
}

export function distantSpellCost(): number {
  return 1
}

/** Empowered Spell (1 SP): reroll up to CHA mod damage dice (min 1). Can stack. */
export function empoweredSpellMaxRerolls(chaMod: number): number {
  return Math.max(1, chaMod)
}

export function empoweredSpellCost(): number {
  return 1
}

/** Extended Spell (1 SP): double duration (max 24 hours). Advantage on conc saves. */
export function extendedSpellDurationMinutes(baseDurationMinutes: number): number {
  return Math.min(baseDurationMinutes * 2, 24 * 60)
}

export function extendedSpellCost(): number {
  return 1
}

/** Heightened Spell (2 SP): one target has Disadvantage on saves vs the spell. */
export function heightenedSpellCost(): number {
  return 2
}

/** Quickened Spell (2 SP): action → bonus action casting time. */
export function quickenedSpellCost(): number {
  return 2
}

/** Seeking Spell (1 SP): reroll missed spell attack roll. Can stack. */
export function seekingSpellCost(): number {
  return 1
}

/** Subtle Spell (1 SP): cast without V/S/non-costly-M components. */
export function subtleSpellCost(): number {
  return 1
}

/** Transmuted Spell (1 SP): change damage type to one of 6 types. */
export function transmutedSpellCost(): number {
  return 1
}

/** Twinned Spell (1 SP): increase effective spell level by 1 (for multi-target spells). */
export function twinnedSpellCost(): number {
  return 1
}

/** SP cost for a given Metamagic option. */
export function metamagicCost(option: MetamagicOption): number {
  switch (option) {
    case "heightened":
    case "quickened":
      return 2
    default:
      return 1
  }
}

// =============================================================================
// Draconic Sorcery Subclass (SRD 5.2.1)
//
// The only Sorcerer subclass in the SRD 5.2.1.
// TS-only: AC formula is caller-applied config, HP bonus is derived from level,
// resistance/damage bonus are query functions.
// =============================================================================

export const DRACONIC_ANCESTRY_TYPES = ["acid", "cold", "fire", "lightning", "poison"] as const
export type DraconicAncestryType = (typeof DRACONIC_ANCESTRY_TYPES)[number]

const DRACONIC_SUBCLASS_LEVEL = 3
const ELEMENTAL_AFFINITY_LEVEL = 6
const DRAGON_WINGS_LEVEL = 14
const DRAGON_WINGS_FLY_SPEED = 60
const DRAGON_WINGS_SP_COST = 3
const DRAGON_COMPANION_LEVEL = 18
const DRACONIC_AC_BASE = 10

// --- Draconic Resilience (L3) ---

/**
 * SRD: "While you aren't wearing armor, your base Armor Class equals
 * 10 plus your Dexterity and Charisma modifiers."
 */
export function draconicResilienceAC(dexMod: number, chaMod: number): number {
  return DRACONIC_AC_BASE + dexMod + chaMod
}

/**
 * SRD: "Your Hit Point maximum increases by 3, and it increases by 1
 * whenever you gain another Sorcerer level."
 * Total bonus = sorcerer level (3 at L3, then +1 per level after).
 */
export function draconicResilienceHpBonus(sorcererLevel: number): number {
  return sorcererLevel >= DRACONIC_SUBCLASS_LEVEL ? sorcererLevel : 0
}

// --- Elemental Affinity (L6) ---

/**
 * SRD: "You have Resistance to [chosen] damage type, and when you cast a spell
 * that deals damage of that type, you can add your Charisma modifier to one
 * damage roll of that spell."
 */
export function hasElementalAffinity(sorcererLevel: number): boolean {
  return sorcererLevel >= ELEMENTAL_AFFINITY_LEVEL
}

export function elementalAffinityDamageBonus(sorcererLevel: number, chaMod: number): number {
  return sorcererLevel >= ELEMENTAL_AFFINITY_LEVEL ? chaMod : 0
}

// --- Dragon Wings (L14) ---

/**
 * SRD: "As a Bonus Action, you can cause draconic wings to appear...
 * Fly Speed of 60 feet. 1/LR or spend 3 SP to restore."
 */
export function canUseDragonWings(sorcererLevel: number, dragonWingsUsed: boolean, sorceryPoints: number): boolean {
  if (sorcererLevel < DRAGON_WINGS_LEVEL) return false
  return !dragonWingsUsed || sorceryPoints >= DRAGON_WINGS_SP_COST
}

export function dragonWingsFlySpeed(): number {
  return DRAGON_WINGS_FLY_SPEED
}

export function dragonWingsSpCost(): number {
  return DRAGON_WINGS_SP_COST
}

// --- Dragon Companion (L18) ---

/**
 * SRD: "You can cast Summon Dragon without a Material component. You can also
 * cast it once without a spell slot... When you start casting, you can modify
 * it so that it doesn't require Concentration (duration becomes 1 minute)."
 */
export function hasDragonCompanion(sorcererLevel: number): boolean {
  return sorcererLevel >= DRAGON_COMPANION_LEVEL
}
