// Paladin class features: Lay on Hands, Paladin's Smite, Radiant Strikes
// SRD 5.2.1 Paladin

import type { Condition } from "#/types.ts"

// --- Lay on Hands (Level 1) ---

export function layOnHandsPoolMax(paladinLevel: number): number {
  if (paladinLevel <= 0) return 0
  return paladinLevel * 5
}

export interface LayOnHandsState {
  readonly hp: number
  readonly maxHp: number
  readonly layOnHandsPool: number
  readonly conditions: ReadonlyArray<Condition>
}

export interface LayOnHandsHealResult {
  readonly hp: number
  readonly layOnHandsPool: number
  readonly healedAmount: number
}

/**
 * Lay on Hands: heal a creature by drawing from the pool.
 * As a Bonus Action, restore up to `amount` HP (capped by pool and missing HP).
 */
export function pLayOnHands(state: LayOnHandsState, amount: number): LayOnHandsHealResult {
  const clamped = Math.max(0, Math.min(amount, state.layOnHandsPool))
  const missingHp = state.maxHp - state.hp
  const healedAmount = Math.min(clamped, missingHp)
  return {
    hp: state.hp + healedAmount,
    layOnHandsPool: state.layOnHandsPool - healedAmount,
    healedAmount
  }
}

export function canLayOnHandsHeal(state: LayOnHandsState): boolean {
  return state.layOnHandsPool > 0 && state.hp < state.maxHp
}

export interface LayOnHandsCureResult {
  readonly layOnHandsPool: number
  readonly conditionRemoved: Condition
}

const CURE_COST = 5

/**
 * Spend 5 HP from pool to remove a condition. At L14+ (Restoring Touch) the
 * set of removable conditions expands — see curableConditions().
 */
export function pLayOnHandsCure(state: LayOnHandsState, condition: Condition): LayOnHandsCureResult {
  return {
    layOnHandsPool: state.layOnHandsPool - CURE_COST,
    conditionRemoved: condition
  }
}

const POISONED_CONDITIONS: ReadonlyArray<Condition> = ["poisoned"]
const RESTORING_TOUCH_CONDITIONS: ReadonlyArray<Condition> = [
  "poisoned",
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "paralyzed",
  "stunned"
]

const RESTORING_TOUCH_LEVEL = 14

export function curableConditions(paladinLevel: number): ReadonlyArray<Condition> {
  if (paladinLevel >= RESTORING_TOUCH_LEVEL) return RESTORING_TOUCH_CONDITIONS
  return POISONED_CONDITIONS
}

export function canLayOnHandsCure(state: LayOnHandsState, condition: Condition, paladinLevel: number): boolean {
  return (
    state.layOnHandsPool >= CURE_COST &&
    curableConditions(paladinLevel).includes(condition) &&
    state.conditions.includes(condition)
  )
}

export const layOnHandsLongRest: (paladinLevel: number) => number = layOnHandsPoolMax

// --- Paladin's Smite (Level 2) + Divine Smite spell ---

const MAX_SMITE_DICE = 5

/**
 * Calculate Divine Smite damage dice (d8s).
 * Base: 2d8 at spell slot level 1, +1d8 per slot level above 1, max 5d8.
 * +1d8 extra vs Fiend or Undead.
 */
export function pDivineSmiteDamage(slotLevel: number, isUndeadOrFiend: boolean): number {
  const baseDice = 2
  const fromSlot = Math.min(baseDice + (slotLevel - 1), MAX_SMITE_DICE)
  return isUndeadOrFiend ? fromSlot + 1 : fromSlot
}

export interface PaladinSmiteState {
  readonly paladinSmiteFreeUseAvailable: boolean
}

export interface PaladinSmiteFreeResult {
  readonly paladinSmiteFreeUseAvailable: false
}

export function pPaladinSmiteFree(_state: PaladinSmiteState): PaladinSmiteFreeResult {
  return { paladinSmiteFreeUseAvailable: false }
}

export function canPaladinSmiteFree(state: PaladinSmiteState): boolean {
  return state.paladinSmiteFreeUseAvailable
}

export function paladinSmiteLongRest(): PaladinSmiteState {
  return { paladinSmiteFreeUseAvailable: true }
}

// --- Radiant Strikes (Level 11) ---

const RADIANT_STRIKES_LEVEL = 11
const RADIANT_STRIKES_DICE = 1

export interface RadiantStrikesConfig {
  readonly paladinLevel: number
  readonly isMeleeOrUnarmed: boolean
}

/**
 * Radiant Strikes (Level 11): +1d8 Radiant on every melee weapon or unarmed strike hit.
 * Returns the number of bonus d8 dice (0 or 1).
 */
export function pRadiantStrikes(config: RadiantStrikesConfig): number {
  if (config.paladinLevel >= RADIANT_STRIKES_LEVEL && config.isMeleeOrUnarmed) {
    return RADIANT_STRIKES_DICE
  }
  return 0
}

// --- Combined long rest ---

export interface PaladinLongRestResult {
  readonly layOnHandsPool: number
  readonly paladinSmiteFreeUseAvailable: true
}

export function paladinLongRest(paladinLevel: number): PaladinLongRestResult {
  return {
    layOnHandsPool: layOnHandsPoolMax(paladinLevel),
    paladinSmiteFreeUseAvailable: true
  }
}
