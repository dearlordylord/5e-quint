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
