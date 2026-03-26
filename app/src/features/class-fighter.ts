// Fighter class features: Second Wind, Tactical Mind, Tactical Shift, Action Surge
// SRD 5.2.1 Fighter

// --- Second Wind charges by level ---

/** Second Wind max uses from the Fighter Features table (SRD 5.2.1). */
export function secondWindMaxCharges(fighterLevel: number): number {
  if (fighterLevel <= 0) return 0
  if (fighterLevel <= 3) return 2
  if (fighterLevel <= 9) return 3
  return 4
}

// --- Second Wind (Level 1) ---

export interface SecondWindState {
  readonly hp: number
  readonly maxHp: number
  readonly secondWindCharges: number
  readonly bonusActionUsed: boolean
}

export interface SecondWindConfig {
  readonly fighterLevel: number
  readonly d10Roll: number // 1-10
}

export interface SecondWindResult {
  readonly hp: number
  readonly secondWindCharges: number
  readonly bonusActionUsed: true
  readonly healAmount: number
  readonly tacticalShiftDistance: number // 0 if level < 5
}

/** Precondition: can use Second Wind. */
export function canUseSecondWind(state: SecondWindState): boolean {
  return state.secondWindCharges > 0 && !state.bonusActionUsed
}

/**
 * Activate Second Wind: regain HP equal to 1d10 + fighter level as a Bonus Action.
 * At level 5+, Tactical Shift also triggers (move up to half speed without OAs).
 * Pure function — returns new state values.
 */
export function useSecondWind(
  state: SecondWindState,
  config: SecondWindConfig,
  effectiveSpeed: number
): SecondWindResult {
  const healAmount = config.d10Roll + config.fighterLevel
  const newHp = Math.min(state.hp + healAmount, state.maxHp)
  const tacticalShiftDistance = config.fighterLevel >= 5 ? Math.floor(effectiveSpeed / 2) : 0

  return {
    hp: newHp,
    secondWindCharges: state.secondWindCharges - 1,
    bonusActionUsed: true,
    healAmount,
    tacticalShiftDistance
  }
}

// --- Tactical Mind (Level 2) ---

export interface TacticalMindInput {
  readonly secondWindCharges: number
  readonly originalCheckTotal: number // the failed check result
  readonly dc: number // the DC that was failed against
  readonly d10Roll: number // 1-10, the Tactical Mind bonus roll
}

export interface TacticalMindResult {
  readonly newCheckTotal: number
  readonly success: boolean
  readonly secondWindCharges: number // only decremented if the boosted check succeeds
}

/** Precondition: can use Tactical Mind. Fighter level >= 2, charges > 0, check must have failed. */
export function canUseTacticalMind(secondWindCharges: number, fighterLevel: number, checkFailed: boolean): boolean {
  return fighterLevel >= 2 && secondWindCharges > 0 && checkFailed
}

/**
 * Tactical Mind: expend a Second Wind use on a failed ability check to add 1d10.
 * If the check still fails, the Second Wind use is NOT expended.
 */
export function useTacticalMind(input: TacticalMindInput): TacticalMindResult {
  const newCheckTotal = input.originalCheckTotal + input.d10Roll
  const success = newCheckTotal >= input.dc

  return {
    newCheckTotal,
    success,
    // Only expend the charge if the boosted total succeeds
    secondWindCharges: success ? input.secondWindCharges - 1 : input.secondWindCharges
  }
}

// --- Action Surge (Level 2) ---

export interface ActionSurgeState {
  readonly actionSurgeCharges: number
  readonly actionSurgeUsedThisTurn: boolean
  readonly actionUsed: boolean
}

/** Action Surge max charges from the Fighter Features table (SRD 5.2.1). */
export function actionSurgeMaxCharges(fighterLevel: number): number {
  if (fighterLevel < 2) return 0
  if (fighterLevel < 17) return 1
  return 2
}

/** Precondition: can use Action Surge. */
export function canUseActionSurge(state: ActionSurgeState): boolean {
  return state.actionSurgeCharges > 0 && !state.actionSurgeUsedThisTurn
}

export interface ActionSurgeResult {
  readonly actionUsed: false
  readonly actionSurgeCharges: number
  readonly actionSurgeUsedThisTurn: true
}

/**
 * Action Surge: take one additional action on your turn (except Magic action).
 * Can only use once per turn even with 2 charges.
 */
export function useActionSurge(state: ActionSurgeState): ActionSurgeResult {
  return {
    actionUsed: false, // reset action availability
    actionSurgeCharges: state.actionSurgeCharges - 1,
    actionSurgeUsedThisTurn: true
  }
}

// --- Rest recovery ---

export interface FighterRestState {
  readonly secondWindCharges: number
  readonly secondWindMax: number
  readonly actionSurgeCharges: number
  readonly actionSurgeMax: number
}

/** Short rest: regain one expended Second Wind use; regain all Action Surge uses. */
export function fighterShortRest(state: FighterRestState): {
  readonly secondWindCharges: number
  readonly actionSurgeCharges: number
} {
  return {
    secondWindCharges: Math.min(state.secondWindCharges + 1, state.secondWindMax),
    actionSurgeCharges: state.actionSurgeMax
  }
}

/** Long rest: regain all Second Wind uses; regain all Action Surge uses. */
export function fighterLongRest(state: FighterRestState): {
  readonly secondWindCharges: number
  readonly actionSurgeCharges: number
} {
  return {
    secondWindCharges: state.secondWindMax,
    actionSurgeCharges: state.actionSurgeMax
  }
}

// =============================================================================
// Champion Subclass Features (SRD 5.2.1)
// =============================================================================

// --- Constants ---

export const CHAMPION_IMPROVED_CRITICAL_LEVEL = 3
export const CHAMPION_ADDITIONAL_FIGHTING_STYLE_LEVEL = 7
export const CHAMPION_HEROIC_WARRIOR_LEVEL = 10
export const CHAMPION_SUPERIOR_CRITICAL_LEVEL = 15
export const CHAMPION_SURVIVOR_LEVEL = 18
export const SURVIVOR_HEAL_BASE = 5
export const SURVIVOR_DEFY_DEATH_THRESHOLD = 18

// --- Improved Critical (L3) / Superior Critical (L15) ---

/**
 * Returns the minimum d20 roll needed for a Critical Hit for a Champion Fighter.
 * Default: 20; L3+: 19; L15+: 18.
 */
export function championCritRange(fighterLevel: number): number {
  if (fighterLevel >= CHAMPION_SUPERIOR_CRITICAL_LEVEL) return 18
  if (fighterLevel >= CHAMPION_IMPROVED_CRITICAL_LEVEL) return 19
  return 20
}

// --- Remarkable Athlete (L3 Champion) ---

/** Whether Remarkable Athlete is active (Champion level 3+). Grants Advantage on Initiative and Athletics. */
export function hasRemarkableAthlete(championLevel: number): boolean {
  return championLevel >= CHAMPION_IMPROVED_CRITICAL_LEVEL
}

/**
 * After scoring a Critical Hit, move up to half your Speed without provoking Opportunity Attacks.
 * Returns the distance (floored) if Champion level 3+, else 0.
 */
export function remarkableAthleteCritMovement(championLevel: number, effectiveSpeed: number): number {
  if (championLevel < CHAMPION_IMPROVED_CRITICAL_LEVEL) return 0
  return Math.floor(effectiveSpeed / 2)
}

// --- Heroic Warrior (L10 Champion) ---

/**
 * At the start of your turn, gain Heroic Inspiration if you don't already have it.
 * Returns true if inspiration should be granted (L10+ and doesn't already have it).
 */
export function heroicWarriorInspiration(championLevel: number, hasHeroicInspiration: boolean): boolean {
  return championLevel >= CHAMPION_HEROIC_WARRIOR_LEVEL && !hasHeroicInspiration
}

// --- Survivor (L18 Champion) ---

/** Defy Death: Advantage on Death Saving Throws at Champion level 18+. */
export function survivorDefyDeathAdvantage(championLevel: number): boolean {
  return championLevel >= CHAMPION_SURVIVOR_LEVEL
}

/**
 * Defy Death: rolls of 18-20 on Death Saving Throws count as a 20.
 * Returns 18 if L18+ (the threshold at or above which a roll counts as 20),
 * else 21 (never triggers since max d20 roll is 20).
 */
export function survivorDefyDeathThreshold(championLevel: number): number {
  return championLevel >= CHAMPION_SURVIVOR_LEVEL ? SURVIVOR_DEFY_DEATH_THRESHOLD : 21
}

/**
 * Bloodied: at or below half max HP AND has at least 1 HP.
 */
export function isBloodied(currentHp: number, maxHp: number): boolean {
  return currentHp > 0 && currentHp <= Math.floor(maxHp / 2)
}

/**
 * Heroic Rally: at the start of each turn, regain 5 + CON modifier HP
 * if Bloodied (0 < hp <= floor(maxHp/2)) and Champion level 18+.
 * Returns the amount of HP to heal, or 0 if conditions not met.
 */
export function survivorHeroicRally(championLevel: number, currentHp: number, maxHp: number, conMod: number): number {
  if (championLevel < CHAMPION_SURVIVOR_LEVEL) return 0
  if (!isBloodied(currentHp, maxHp)) return 0
  return SURVIVOR_HEAL_BASE + conMod
}

// =============================================================================
// Indomitable (Level 9 Fighter) — SRD 5.2.1
// =============================================================================

// --- Constants ---

export const INDOMITABLE_LEVEL = 9
export const INDOMITABLE_TWO_CHARGES_LEVEL = 13
export const INDOMITABLE_THREE_CHARGES_LEVEL = 17

// --- Indomitable max charges by level ---

/**
 * Returns the maximum number of Indomitable uses for a given fighter level.
 * 0 below L9, 1 at L9, 2 at L13, 3 at L17.
 */
export function indomitableMaxCharges(fighterLevel: number): number {
  if (fighterLevel < INDOMITABLE_LEVEL) return 0
  if (fighterLevel < INDOMITABLE_TWO_CHARGES_LEVEL) return 1
  if (fighterLevel < INDOMITABLE_THREE_CHARGES_LEVEL) return 2
  return 3
}

// --- Indomitable usage ---

/**
 * Precondition: can use Indomitable. Fighter level >= 9 and charges > 0.
 */
export function canUseIndomitable(fighterLevel: number, indomitableCharges: number): boolean {
  return fighterLevel >= INDOMITABLE_LEVEL && indomitableCharges > 0
}

/**
 * Indomitable: reroll a failed saving throw with a bonus equal to your Fighter level.
 * You must use the new roll. Decrements charges.
 * The caller provides the new roll result (already including the reroll + fighter level bonus).
 */
export function useIndomitable(
  indomitableCharges: number,
  newRoll: number
): {
  readonly indomitableCharges: number
  readonly newSaveResult: number
} {
  return {
    indomitableCharges: indomitableCharges - 1,
    newSaveResult: newRoll
  }
}

// --- Indomitable long rest recovery ---

/** Long rest: regain all Indomitable uses for the given fighter level. */
export const indomitableLongRest: (fighterLevel: number) => number = indomitableMaxCharges
