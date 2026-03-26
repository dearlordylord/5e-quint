import { featureSaveDC } from "#/srd-constants.ts"
import type { Condition, DamageType } from "#/types.ts"

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
const RAGE_DAMAGE_PLUS_3_LEVEL = 9
const RAGE_DAMAGE_PLUS_4_LEVEL = 16
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

/** Returns the rage damage bonus for the given barbarian level (SRD 5.2.1 table). */
export function rageDamageBonus(barbarianLevel: number): number {
  if (barbarianLevel >= RAGE_DAMAGE_PLUS_4_LEVEL) return 4
  if (barbarianLevel >= RAGE_DAMAGE_PLUS_3_LEVEL) return 3
  return 2
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
  if (!persistentRageUsed) {
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

/** SRD 5.2.1: Advantage on attack rolls using Strength (melee or ranged). */
export function recklessAttackAdvantage(recklessThisTurn: boolean, isStrengthBased: boolean): boolean {
  return recklessThisTurn && isStrengthBased
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
 * Can use Brutal Strike: must be using Reckless Attack, L9+, STR-based attack.
 * Foregoes advantage on one attack roll to deal extra damage + effect.
 */
export function canUseBrutalStrike(
  recklessThisTurn: boolean,
  barbarianLevel: number,
  isStrengthBased: boolean
): boolean {
  return recklessThisTurn && barbarianLevel >= BRUTAL_STRIKE_LEVEL && isStrengthBased
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
  readonly cantMakeOpportunityAttacks: boolean
} {
  return {
    disadvantageOnNextSave: true,
    cantMakeOpportunityAttacks: true
  }
}

/** Sundering Blow: next attack by another creature against target gets +5. */
export function applySunderingBlow(): { readonly nextAttackBonus: number } {
  return {
    nextAttackBonus: SUNDERING_BLOW_ATTACK_BONUS
  }
}

// --- Berserker Subclass Constants ---

export const BERSERKER_FRENZY_LEVEL = 3
export const BERSERKER_MINDLESS_RAGE_LEVEL = 6
export const BERSERKER_RETALIATION_LEVEL = 10
export const BERSERKER_INTIMIDATING_PRESENCE_LEVEL = 14
export const INTIMIDATING_PRESENCE_RANGE_FEET = 30

const MINDLESS_RAGE_IMMUNITIES: ReadonlySet<Condition> = new Set(["charmed", "frightened"])
const EMPTY_CONDITION_SET: ReadonlySet<Condition> = new Set()

// --- Frenzy (L3 Berserker) ---

/**
 * Can apply Frenzy extra damage: must be raging, used Reckless Attack this turn,
 * STR-based attack, and not already used Frenzy this turn.
 */
export function canApplyFrenzy(
  raging: boolean,
  recklessThisTurn: boolean,
  isStrengthBased: boolean,
  frenzyUsedThisTurn: boolean
): boolean {
  return raging && recklessThisTurn && isStrengthBased && !frenzyUsedThisTurn
}

/** Returns number of d6s for Frenzy extra damage (equals rage damage bonus). */
export function frenzyDamageDice(rageDmgBonus: number): number {
  return rageDmgBonus
}

/** Apply Frenzy extra damage from rolled d6s. */
export function applyFrenzy(d6Total: number): {
  readonly extraDamage: number
  readonly frenzyUsedThisTurn: true
} {
  return {
    extraDamage: d6Total,
    frenzyUsedThisTurn: true
  }
}

// --- Mindless Rage (L6 Berserker) ---

/**
 * Returns condition immunities granted by Mindless Rage.
 * Charmed and Frightened immunity while raging at L6+.
 */
export function mindlessRageImmunities(raging: boolean, berserkerLevel: number): ReadonlySet<Condition> {
  if (raging && berserkerLevel >= BERSERKER_MINDLESS_RAGE_LEVEL) return MINDLESS_RAGE_IMMUNITIES
  return EMPTY_CONDITION_SET
}

/**
 * Returns conditions to remove when entering rage (Mindless Rage at L6+).
 * Charmed and Frightened end when entering rage.
 */
export function mindlessRageOnEnterRage(
  currentConditions: ReadonlyArray<Condition>,
  berserkerLevel: number
): ReadonlyArray<Condition> {
  if (berserkerLevel < BERSERKER_MINDLESS_RAGE_LEVEL) return []
  return currentConditions.filter((c) => c === "charmed" || c === "frightened")
}

// --- Retaliation (L10 Berserker) ---

/** Check eligibility for Retaliation reaction attack. */
export function canRetaliate(
  berserkerLevel: number,
  reactionAvailable: boolean,
  damagedByCreatureWithin5ft: boolean
): boolean {
  return berserkerLevel >= BERSERKER_RETALIATION_LEVEL && reactionAvailable && damagedByCreatureWithin5ft
}

// --- Intimidating Presence (L14 Berserker) ---

/** Returns the DC for Intimidating Presence: 8 + STR mod + proficiency bonus. */
export const intimidatingPresenceDC: (strMod: number, profBonus: number) => number = featureSaveDC

/** Check if Intimidating Presence can be used. */
export function canUseIntimidatingPresence(
  berserkerLevel: number,
  bonusActionUsed: boolean,
  intimidatingPresenceUsed: boolean
): boolean {
  return berserkerLevel >= BERSERKER_INTIMIDATING_PRESENCE_LEVEL && !bonusActionUsed && !intimidatingPresenceUsed
}

/** Use Intimidating Presence as a Bonus Action. */
export function useIntimidatingPresence(): {
  readonly intimidatingPresenceUsed: true
  readonly bonusActionUsed: true
} {
  return {
    intimidatingPresenceUsed: true,
    bonusActionUsed: true
  }
}

/**
 * Restore Intimidating Presence by expending a rage charge.
 * Returns null if cannot restore (no charges or not yet used).
 */
export function restoreIntimidatingPresenceWithRage(
  rageCharges: number,
  intimidatingPresenceUsed: boolean
): { readonly rageCharges: number; readonly intimidatingPresenceUsed: false } | null {
  if (!intimidatingPresenceUsed || rageCharges <= 0) return null
  return {
    rageCharges: rageCharges - 1,
    intimidatingPresenceUsed: false
  }
}

// --- Barbarian Passive Features Constants ---

export const DANGER_SENSE_LEVEL = 2
export const FAST_MOVEMENT_LEVEL = 5
export const FERAL_INSTINCT_LEVEL = 7
export const INSTINCTIVE_POUNCE_LEVEL = 7
export const RELENTLESS_RAGE_LEVEL = 11
export const RELENTLESS_RAGE_BASE_DC = 10
export const RELENTLESS_RAGE_DC_INCREMENT = 5
export const INDOMITABLE_MIGHT_LEVEL = 18
export const PRIMAL_CHAMPION_LEVEL = 20
export const PRIMAL_CHAMPION_BONUS = 4
export const PRIMAL_CHAMPION_MAX_SCORE = 25
export const FAST_MOVEMENT_BONUS = 10

// --- Danger Sense (L2) ---

/** SRD 5.2.1: Advantage on DEX saves unless Incapacitated. */
export function canUseDangerSense(barbarianLevel: number, isIncapacitated: boolean): boolean {
  return barbarianLevel >= DANGER_SENSE_LEVEL && !isIncapacitated
}

/** Returns true (advantage on DEX saves) when Danger Sense is active. */
export function dangerSenseAdvantage(canUse: boolean): boolean {
  return canUse
}

// --- Fast Movement (L5) ---

/** Returns +10ft speed bonus if L5+ and not wearing heavy armor, else 0. */
export function fastMovementBonus(barbarianLevel: number, armorWeight: ArmorWeight): number {
  if (barbarianLevel >= FAST_MOVEMENT_LEVEL && armorWeight !== "heavy") return FAST_MOVEMENT_BONUS
  return 0
}

// --- Feral Instinct (L7) ---

/** Whether the barbarian has Feral Instinct (L7+): grants Initiative advantage. */
export function hasFeralInstinct(barbarianLevel: number): boolean {
  return barbarianLevel >= FERAL_INSTINCT_LEVEL
}

// --- Instinctive Pounce (L7) ---

/** Distance you can move when entering rage: floor(speed/2) at L7+, else 0. */
export function instinctivePounceDistance(barbarianLevel: number, effectiveSpeed: number): number {
  if (barbarianLevel < INSTINCTIVE_POUNCE_LEVEL) return 0
  return Math.floor(effectiveSpeed / 2)
}

// --- Relentless Rage (L11) ---

/** Returns the DC for Relentless Rage: 10 + (timesUsed * 5). */
export function relentlessRageDC(timesUsed: number): number {
  return RELENTLESS_RAGE_BASE_DC + timesUsed * RELENTLESS_RAGE_DC_INCREMENT
}

/** Whether Relentless Rage can be used: L11+, must be raging. */
export function canUseRelentlessRage(barbarianLevel: number, raging: boolean): boolean {
  return barbarianLevel >= RELENTLESS_RAGE_LEVEL && raging
}

/** SRD 5.2.1: On success, HP changes to 2x barbarian level. */
export function relentlessRageResult(
  conSaveSucceeded: boolean,
  barbarianLevel: number
): { readonly survived: boolean; readonly newHp: number } {
  if (conSaveSucceeded) {
    return { survived: true, newHp: 2 * barbarianLevel }
  }
  return { survived: false, newHp: 0 }
}

// --- Indomitable Might (L18) ---

/** SRD 5.2.1: If total for a STR check/save is less than STR score, use STR score. */
export function indomitableMight(barbarianLevel: number, checkTotal: number, strScore: number): number {
  if (barbarianLevel >= INDOMITABLE_MIGHT_LEVEL) return Math.max(checkTotal, strScore)
  return checkTotal
}

// --- Primal Champion (L20) ---

/** STR/CON bonuses and max score at L20+. */
export function primalChampionBonus(barbarianLevel: number): {
  readonly strBonus: number
  readonly conBonus: number
  readonly maxScore: number
} {
  if (barbarianLevel >= PRIMAL_CHAMPION_LEVEL) {
    return { strBonus: PRIMAL_CHAMPION_BONUS, conBonus: PRIMAL_CHAMPION_BONUS, maxScore: PRIMAL_CHAMPION_MAX_SCORE }
  }
  return { strBonus: 0, conBonus: 0, maxScore: 20 }
}
