import type { DamageType } from "#/types.ts"

// --- Types ---

/** Brutal Strike effect options per SRD 5.2.1. */
export type BrutalStrikeEffect = "forcefulBlow" | "hamstringBlow" | "staggeringBlow" | "sunderingBlow"

/** Armor weight category for rage eligibility check. */
export type ArmorWeight = "none" | "light" | "medium" | "heavy"

/** Rage state tracked on a barbarian character. */
export interface RageState {
  readonly raging: boolean
  readonly rageCharges: number
  readonly rageMaxCharges: number
  readonly rageTurnsRemaining: number
  readonly attackedOrForcedSaveThisTurn: boolean
  readonly rageExtendedWithBA: boolean
  readonly concentrationSpellId: string
}

/** Reckless Attack / Brutal Strike state. */
export interface RecklessState {
  readonly recklessThisTurn: boolean
  readonly brutalStrikeEffects: ReadonlyArray<BrutalStrikeEffect>
}

/** Result of applying a Brutal Strike. */
export interface BrutalStrikeResult {
  readonly extraDamage: number
  readonly effects: ReadonlyArray<BrutalStrikeEffect>
  readonly foregoAdvantage: true
}

/** Result of a Forceful Blow effect. */
export interface ForcefulBlowResult {
  readonly pushDistanceFeet: number
  readonly canMoveTowardTarget: boolean
}

/** Result of a Hamstring Blow effect. */
export interface HamstringBlowResult {
  readonly speedReductionFeet: number
}

// --- Constants ---

const RAGE_DURATION_TURNS = 100 // 10 minutes = ~100 rounds (generous upper bound)
const PERSISTENT_RAGE_LEVEL = 15
const BRUTAL_STRIKE_LEVEL = 9
const IMPROVED_BRUTAL_STRIKE_L13 = 13
const IMPROVED_BRUTAL_STRIKE_L17 = 17
const FORCEFUL_BLOW_PUSH_FEET = 15
const HAMSTRING_BLOW_SPEED_REDUCTION = 15
const SUNDERING_BLOW_ATTACK_BONUS = 5

const RAGE_RESISTANCE_TYPES: ReadonlySet<DamageType> = new Set(["bludgeoning", "piercing", "slashing"])
const EMPTY_DAMAGE_SET: ReadonlySet<DamageType> = new Set()
const BRUTAL_STRIKE_BASE: ReadonlyArray<BrutalStrikeEffect> = ["forcefulBlow", "hamstringBlow"]
const BRUTAL_STRIKE_IMPROVED: ReadonlyArray<BrutalStrikeEffect> = [
  "forcefulBlow",
  "hamstringBlow",
  "staggeringBlow",
  "sunderingBlow"
]

// --- Rage damage bonus by level (SRD 5.2.1 table) ---

/** Returns the rage damage bonus for the given barbarian level. */
export function rageDamageBonus(barbarianLevel: number): number {
  if (barbarianLevel >= IMPROVED_BRUTAL_STRIKE_L17) return 4 // L16+
  if (barbarianLevel >= BRUTAL_STRIKE_LEVEL) return 3 // L9+
  return 2 // L1+
}

/** Returns the max rage charges for the given barbarian level. */
export function rageMaxCharges(barbarianLevel: number): number {
  if (barbarianLevel >= IMPROVED_BRUTAL_STRIKE_L17) return 6
  if (barbarianLevel >= 12) return 5
  if (barbarianLevel >= 6) return 4
  if (barbarianLevel >= 3) return 3
  return 2
}

// --- Rage functions ---

export function canEnterRage(rageCharges: number, armorWeight: ArmorWeight): boolean {
  return rageCharges > 0 && armorWeight !== "heavy"
}

export function pEnterRage(state: RageState): RageState {
  return {
    ...state,
    raging: true,
    rageCharges: state.rageCharges - 1,
    rageTurnsRemaining: RAGE_DURATION_TURNS,
    attackedOrForcedSaveThisTurn: false,
    rageExtendedWithBA: false,
    concentrationSpellId: "" // entering rage breaks concentration
  }
}

export function pEndRage(state: RageState): RageState {
  return {
    ...state,
    raging: false,
    rageTurnsRemaining: 0,
    attackedOrForcedSaveThisTurn: false,
    rageExtendedWithBA: false
  }
}

export function pExtendRageWithBA(state: RageState): RageState {
  return {
    ...state,
    rageExtendedWithBA: true
  }
}

export function pMarkAttackOrForcedSave(state: RageState): RageState {
  return {
    ...state,
    attackedOrForcedSaveThisTurn: true
  }
}

/**
 * End-of-turn rage maintenance. Persistent Rage (L15) skips maintenance.
 * Otherwise rage ends unless barbarian attacked/forced save OR extended with BA.
 */
export function pCheckRageMaintenance(state: RageState, barbarianLevel: number): RageState {
  if (!state.raging) return state
  // Persistent Rage (L15): no maintenance needed
  if (barbarianLevel >= PERSISTENT_RAGE_LEVEL) {
    return {
      ...state,
      attackedOrForcedSaveThisTurn: false,
      rageExtendedWithBA: false
    }
  }
  // Must have attacked/forced save OR extended with BA
  if (state.attackedOrForcedSaveThisTurn || state.rageExtendedWithBA) {
    return {
      ...state,
      attackedOrForcedSaveThisTurn: false,
      rageExtendedWithBA: false
    }
  }
  // Rage ends
  return pEndRage(state)
}

/** Check if rage should end due to donning heavy armor or incapacitated condition. */
export function pCheckRageEndConditions(
  state: RageState,
  armorWeight: ArmorWeight,
  incapacitated: boolean,
  unconscious: boolean,
  barbarianLevel: number
): RageState {
  if (!state.raging) return state
  if (armorWeight === "heavy") return pEndRage(state)
  // Persistent Rage (L15): only ends on Unconscious, not Incapacitated
  if (barbarianLevel >= PERSISTENT_RAGE_LEVEL) {
    if (unconscious) return pEndRage(state)
    return state
  }
  // Before L15: ends on Incapacitated
  if (incapacitated) return pEndRage(state)
  return state
}

/**
 * Persistent Rage (L15): regain all rage uses when rolling Initiative if at 0.
 * Can only be used once per Long Rest (tracked externally).
 */
export function pPersistentRageOnInitiative(
  rageCharges: number,
  rageMaxCharges: number,
  persistentRageUsed: boolean
): { readonly newCharges: number; readonly persistentRageUsed: boolean } {
  if (rageCharges === 0 && !persistentRageUsed) {
    return { newCharges: rageMaxCharges, persistentRageUsed: true }
  }
  return { newCharges: rageCharges, persistentRageUsed }
}

/** Check if the barbarian can cast spells (cannot while raging). */
export function canCastWhileRaging(raging: boolean): boolean {
  return !raging
}

export function rageResistances(raging: boolean): ReadonlySet<DamageType> {
  if (!raging) return EMPTY_DAMAGE_SET
  return RAGE_RESISTANCE_TYPES
}

export function applyRageDamageBonus(
  baseDamage: number,
  raging: boolean,
  isStrengthBased: boolean,
  barbarianLevel: number
): number {
  if (!raging || !isStrengthBased) return baseDamage
  return baseDamage + rageDamageBonus(barbarianLevel)
}

export function rageStrengthAdvantage(raging: boolean, isStrengthBased: boolean): boolean {
  return raging && isStrengthBased
}

// --- Reckless Attack functions ---

export function pDeclareReckless(): RecklessState {
  return {
    recklessThisTurn: true,
    brutalStrikeEffects: []
  }
}

/** Only applies to Strength-based melee attacks (not ranged, not DEX). */
export function recklessAttackAdvantage(
  recklessThisTurn: boolean,
  isStrengthBased: boolean,
  isMelee: boolean
): boolean {
  return recklessThisTurn && isStrengthBased && isMelee
}

export function recklessDefenseDisadvantage(recklessThisTurn: boolean): boolean {
  return recklessThisTurn
}

export function pResetReckless(): RecklessState {
  return {
    recklessThisTurn: false,
    brutalStrikeEffects: []
  }
}

// --- Brutal Strike functions ---

export function availableBrutalStrikeEffects(barbarianLevel: number): ReadonlyArray<BrutalStrikeEffect> {
  if (barbarianLevel < BRUTAL_STRIKE_LEVEL) return []
  if (barbarianLevel >= IMPROVED_BRUTAL_STRIKE_L13) return BRUTAL_STRIKE_IMPROVED
  return BRUTAL_STRIKE_BASE
}

/** Number of Brutal Strike effects that can be chosen. */
export function brutalStrikeEffectCount(barbarianLevel: number): number {
  if (barbarianLevel < BRUTAL_STRIKE_LEVEL) return 0
  if (barbarianLevel >= IMPROVED_BRUTAL_STRIKE_L17) return 2
  return 1
}

/** Number of extra damage dice (d10) from Brutal Strike. */
export function brutalStrikeDamageDice(barbarianLevel: number): number {
  if (barbarianLevel < BRUTAL_STRIKE_LEVEL) return 0
  if (barbarianLevel >= IMPROVED_BRUTAL_STRIKE_L17) return 2
  return 1
}

/**
 * Can use Brutal Strike: must be using Reckless Attack, L9+, STR-based melee.
 * Foregoes advantage on one attack roll to deal extra damage + effect.
 */
export function canUseBrutalStrike(
  recklessThisTurn: boolean,
  barbarianLevel: number,
  isStrengthBased: boolean,
  isMelee: boolean
): boolean {
  return recklessThisTurn && barbarianLevel >= BRUTAL_STRIKE_LEVEL && isStrengthBased && isMelee
}

/**
 * Apply Brutal Strike: forgo advantage for extra damage + effects.
 * @param d10Roll - the sum of d10 rolls (1d10 at L9, 2d10 at L17)
 * @param effects - chosen effects (1 at L9, 2 at L17). Must be different.
 */
export function pBrutalStrike(d10Roll: number, effects: ReadonlyArray<BrutalStrikeEffect>): BrutalStrikeResult {
  return {
    extraDamage: d10Roll,
    effects,
    foregoAdvantage: true
  }
}

/** Forceful Blow: push target 15ft, can move half speed toward target. */
export function applyForcefulBlow(): ForcefulBlowResult {
  return {
    pushDistanceFeet: FORCEFUL_BLOW_PUSH_FEET,
    canMoveTowardTarget: true
  }
}

/** Hamstring Blow: reduce target speed by 15ft until start of next turn. */
export function applyHamstringBlow(): HamstringBlowResult {
  return {
    speedReductionFeet: HAMSTRING_BLOW_SPEED_REDUCTION
  }
}

/** Staggering Blow: target has disadvantage on next save, can't make opportunity attacks. */
export function applyStaggeringBlow(): {
  readonly disadvantageOnNextSave: boolean
  readonly noOpportunityAttacks: boolean
} {
  return {
    disadvantageOnNextSave: true,
    noOpportunityAttacks: true
  }
}

/** Sundering Blow: next attack by another creature against target gets +5. */
export function applySunderingBlow(): { readonly nextAttackBonus: number } {
  return {
    nextAttackBonus: SUNDERING_BLOW_ATTACK_BONUS
  }
}
