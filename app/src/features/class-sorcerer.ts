// Sorcerer class features: Innate Sorcery, Font of Magic (Sorcery Points), Flexible Casting
// SRD 5.2.1 Sorcerer

import type { SpellSlots } from "#/types.ts"

// --- Constants ---

/** Sorcery Point cost to create a spell slot of a given level (1-5). */
const SLOT_CREATION_COST: ReadonlyArray<number> = [2, 3, 5, 6, 7]

/** Minimum Sorcerer level required to create a slot of a given level (1-5). */
const SLOT_CREATION_MIN_LEVEL: ReadonlyArray<number> = [2, 3, 5, 7, 9]

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
