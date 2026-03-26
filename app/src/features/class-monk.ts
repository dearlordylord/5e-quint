// --- Monk: Focus Pool (T40) & Martial Arts (T41) ---
// Pure functions for SRD 5.2.1 Monk class features.

import { featureSaveDC } from "#/srd-constants.ts"

// --- Types ---

export type MartialArtsDie = 6 | 8 | 10 | 12

export type WeaponCategory = "unarmed" | "monkWeapon" | "other"

export type AttackAbility = "str" | "dex"

export interface FocusPoolState {
  readonly focusPoints: number
  readonly focusMax: number
  readonly uncannyMetabolismUsed: boolean
}

export interface ExpendFocusResult {
  readonly focusPoints: number
  readonly success: boolean
}

export interface UncannyMetabolismResult {
  readonly focusPoints: number
  readonly hpHealed: number
  readonly uncannyMetabolismUsed: boolean
  readonly triggered: boolean
}

export interface PerfectFocusResult {
  readonly focusPoints: number
  readonly triggered: boolean
}

export interface InitiativeResult {
  readonly focusPoints: number
  readonly hpHealed: number
  readonly uncannyMetabolismUsed: boolean
}

// --- Constants ---

const MARTIAL_ARTS_D8_LEVEL = 5
const MARTIAL_ARTS_D10_LEVEL = 11
const MARTIAL_ARTS_D12_LEVEL = 17
const FOCUS_MIN_LEVEL = 2
const PERFECT_FOCUS_LEVEL = 15
const PERFECT_FOCUS_THRESHOLD = 4

// --- Focus Pool (T40) ---

/** Focus points max equals monk level (available from level 2+). */
export function pFocusMax(monkLevel: number): number {
  if (monkLevel < FOCUS_MIN_LEVEL) return 0
  return monkLevel
}

/** Create initial focus pool state for a given monk level. */
export function pInitFocusPool(monkLevel: number): FocusPoolState {
  const max = pFocusMax(monkLevel)
  return {
    focusPoints: max,
    focusMax: max,
    uncannyMetabolismUsed: false
  }
}

/** Expend focus points. Returns new point total and whether the expenditure succeeded. */
export function pExpendFocus(state: FocusPoolState, cost: number): ExpendFocusResult {
  if (cost <= 0 || state.focusPoints < cost) {
    return { focusPoints: state.focusPoints, success: false }
  }
  return { focusPoints: state.focusPoints - cost, success: true }
}

/** Restore focus points on short or long rest — regain all expended points. */
export function pRestoreFocus(state: FocusPoolState): FocusPoolState {
  return {
    focusPoints: state.focusMax,
    focusMax: state.focusMax,
    uncannyMetabolismUsed: state.uncannyMetabolismUsed
  }
}

/** Restore focus points on long rest — regain all expended points and reset Uncanny Metabolism. */
export function pRestoreFocusLongRest(state: FocusPoolState): FocusPoolState {
  return {
    focusPoints: state.focusMax,
    focusMax: state.focusMax,
    uncannyMetabolismUsed: false
  }
}

/**
 * Uncanny Metabolism (Level 2): When you roll Initiative, regain all expended Focus Points.
 * Roll Martial Arts die, regain HP equal to monk level + die roll. Once per Long Rest.
 */
export function pUncannyMetabolism(
  state: FocusPoolState,
  monkLevel: number,
  martialArtsDieRoll: number
): UncannyMetabolismResult {
  if (monkLevel < FOCUS_MIN_LEVEL || state.uncannyMetabolismUsed) {
    return {
      focusPoints: state.focusPoints,
      hpHealed: 0,
      uncannyMetabolismUsed: state.uncannyMetabolismUsed,
      triggered: false
    }
  }
  return {
    focusPoints: state.focusMax,
    hpHealed: monkLevel + martialArtsDieRoll,
    uncannyMetabolismUsed: true,
    triggered: true
  }
}

/**
 * Perfect Focus (Level 15): When you roll Initiative and don't use Uncanny Metabolism,
 * regain expended Focus Points until you have 4 if you have 3 or fewer.
 */
export function pPerfectFocus(state: FocusPoolState, monkLevel: number): PerfectFocusResult {
  if (monkLevel < PERFECT_FOCUS_LEVEL || state.focusPoints >= PERFECT_FOCUS_THRESHOLD) {
    return { focusPoints: state.focusPoints, triggered: false }
  }
  return { focusPoints: PERFECT_FOCUS_THRESHOLD, triggered: true }
}

/**
 * Combined Initiative roll handler: tries Uncanny Metabolism first,
 * falls back to Perfect Focus if UM was already used.
 */
export function pRollInitiative(
  state: FocusPoolState,
  monkLevel: number,
  martialArtsDieRoll: number
): InitiativeResult {
  // Try Uncanny Metabolism first
  const um = pUncannyMetabolism(state, monkLevel, martialArtsDieRoll)
  if (um.triggered) {
    return {
      focusPoints: um.focusPoints,
      hpHealed: um.hpHealed,
      uncannyMetabolismUsed: um.uncannyMetabolismUsed
    }
  }

  // If UM didn't trigger (already used), try Perfect Focus
  const pf = pPerfectFocus(state, monkLevel)
  return {
    focusPoints: pf.focusPoints,
    hpHealed: 0,
    uncannyMetabolismUsed: state.uncannyMetabolismUsed
  }
}

// --- Martial Arts (T41) ---

/** Martial Arts die by monk level: d6 at 1, d8 at 5, d10 at 11, d12 at 17. */
export function pMartialArtsDie(monkLevel: number): MartialArtsDie {
  if (monkLevel >= MARTIAL_ARTS_D12_LEVEL) return 12
  if (monkLevel >= MARTIAL_ARTS_D10_LEVEL) return 10
  if (monkLevel >= MARTIAL_ARTS_D8_LEVEL) return 8
  return 6
}

/**
 * Dexterous Attacks: for unarmed strikes and monk weapons, use the higher of STR or DEX.
 * Returns the ability modifier to use for attack and damage rolls.
 */
export function pDexterousAttacks(strMod: number, dexMod: number, weaponCategory: WeaponCategory): AttackAbility {
  if (weaponCategory === "other") return "str"
  // For unarmed/monk weapons, use whichever is higher
  return dexMod >= strMod ? "dex" : "str"
}

/**
 * Martial Arts damage: use Martial Arts die if it exceeds the weapon's normal damage die.
 * Returns the die size to use.
 */
export function pMartialArtsDamage(monkLevel: number, weaponDieSize: number): number {
  const maDie = pMartialArtsDie(monkLevel)
  return Math.max(maDie, weaponDieSize)
}

/**
 * Requires Attack action with unarmed/monk weapon, no armor, no shield.
 */
export function pBonusUnarmedStrikeEligible(
  tookAttackAction: boolean,
  attackWeaponCategory: WeaponCategory,
  wearingArmor: boolean,
  wieldingShield: boolean
): boolean {
  return tookAttackAction && attackWeaponCategory !== "other" && !wearingArmor && !wieldingShield
}

/** SRD: DC = 8 + Wisdom modifier + Proficiency Bonus. */
export const pFocusSaveDC: (wisMod: number, profBonus: number) => number = featureSaveDC

// --- Focus Actions (T42) ---

export const FOCUS_ACTION_COST = 1
export const FLURRY_THREE_STRIKES_LEVEL = 10
export const PATIENT_DEFENSE_TEMP_HP_LEVEL = 10
export const STEP_OF_THE_WIND_CARRY_LEVEL = 10

// --- Types ---

export interface FlurryOfBlowsResult {
  readonly focusPoints: number
  readonly bonusActionUsed: true
  readonly unarmedStrikes: number
}

export interface PatientDefenseResult {
  readonly focusPoints: number
  readonly bonusActionUsed: true
  readonly disengageGranted: true
  readonly dodgeGranted: boolean
  readonly tempHp: number
}

export interface StepOfTheWindResult {
  readonly focusPoints: number
  readonly bonusActionUsed: true
  readonly dashGranted: true
  readonly disengageGranted: boolean
  readonly jumpDistanceDoubled: boolean
  readonly canCarryAlly: boolean
}

// --- Flurry of Blows ---

/** Can use Flurry of Blows: requires 1 FP and bonus action not yet used. */
export function canFlurryOfBlows(focusPoints: number, bonusActionUsed: boolean): boolean {
  return focusPoints >= FOCUS_ACTION_COST && !bonusActionUsed
}

/** Number of unarmed strikes from Flurry of Blows: 2 (L2-9) or 3 (L10+). */
export function flurryOfBlowsStrikes(monkLevel: number): number {
  return monkLevel >= FLURRY_THREE_STRIKES_LEVEL ? 3 : 2
}

/** Use Flurry of Blows: expend 1 FP, make unarmed strikes as a Bonus Action. */
export function useFlurryOfBlows(focusPoints: number, monkLevel: number): FlurryOfBlowsResult {
  return {
    focusPoints: focusPoints - FOCUS_ACTION_COST,
    bonusActionUsed: true,
    unarmedStrikes: flurryOfBlowsStrikes(monkLevel)
  }
}

// --- Patient Defense ---

/** Can use free Patient Defense (Disengage only): just needs bonus action available. */
export function canPatientDefenseFree(bonusActionUsed: boolean): boolean {
  return !bonusActionUsed
}

/** Can use focus Patient Defense (Disengage + Dodge): requires 1 FP and bonus action. */
export function canPatientDefenseFocus(focusPoints: number, bonusActionUsed: boolean): boolean {
  return focusPoints >= FOCUS_ACTION_COST && !bonusActionUsed
}

/** Use free Patient Defense: Disengage as Bonus Action, no FP cost. */
export function usePatientDefenseFree(focusPoints: number): PatientDefenseResult {
  return {
    focusPoints,
    bonusActionUsed: true,
    disengageGranted: true,
    dodgeGranted: false,
    tempHp: 0
  }
}

/**
 * Use focus Patient Defense: Disengage + Dodge as Bonus Action, costs 1 FP.
 * At L10+ (Heightened Focus), also grants temp HP equal to two rolls of Martial Arts die.
 */
export function usePatientDefenseFocus(
  focusPoints: number,
  monkLevel: number,
  twoMartialArtsDieRollsTotal: number
): PatientDefenseResult {
  return {
    focusPoints: focusPoints - FOCUS_ACTION_COST,
    bonusActionUsed: true,
    disengageGranted: true,
    dodgeGranted: true,
    tempHp: monkLevel >= PATIENT_DEFENSE_TEMP_HP_LEVEL ? twoMartialArtsDieRollsTotal : 0
  }
}

// --- Step of the Wind ---

/** Can use free Step of the Wind (Dash only): just needs bonus action available. */
export function canStepOfTheWindFree(bonusActionUsed: boolean): boolean {
  return !bonusActionUsed
}

/** Can use focus Step of the Wind (Dash + Disengage + double jump): requires 1 FP and bonus action. */
export function canStepOfTheWindFocus(focusPoints: number, bonusActionUsed: boolean): boolean {
  return focusPoints >= FOCUS_ACTION_COST && !bonusActionUsed
}

/** Use free Step of the Wind: Dash as Bonus Action, no FP cost. */
export function useStepOfTheWindFree(focusPoints: number): StepOfTheWindResult {
  return {
    focusPoints,
    bonusActionUsed: true,
    dashGranted: true,
    disengageGranted: false,
    jumpDistanceDoubled: false,
    canCarryAlly: false
  }
}

/**
 * Use focus Step of the Wind: Dash + Disengage as Bonus Action, costs 1 FP.
 * Jump distance doubled for the turn. At L10+, can carry a willing creature.
 */
export function useStepOfTheWindFocus(focusPoints: number, monkLevel: number): StepOfTheWindResult {
  return {
    focusPoints: focusPoints - FOCUS_ACTION_COST,
    bonusActionUsed: true,
    dashGranted: true,
    disengageGranted: true,
    jumpDistanceDoubled: true,
    canCarryAlly: monkLevel >= STEP_OF_THE_WIND_CARRY_LEVEL
  }
}

// --- Stunning Strike (T43) ---

export const STUNNING_STRIKE_LEVEL = 5
export const STUNNING_STRIKE_COST = 1

// --- Types ---

export interface StunningStrikeResult {
  readonly focusPoints: number
  readonly stunningStrikeUsedThisTurn: true
  readonly targetStunned: boolean
  readonly targetSpeedHalved: boolean
  readonly advantageOnNextAttackVsTarget: boolean
}

/**
 * Can use Stunning Strike: requires L5+, 1 FP, once per turn, must be unarmed or monk weapon.
 */
export function canStunningStrike(
  monkLevel: number,
  focusPoints: number,
  stunningStrikeUsedThisTurn: boolean,
  weaponCategory: WeaponCategory
): boolean {
  return (
    monkLevel >= STUNNING_STRIKE_LEVEL &&
    focusPoints >= STUNNING_STRIKE_COST &&
    !stunningStrikeUsedThisTurn &&
    weaponCategory !== "other"
  )
}

/**
 * Use Stunning Strike: expend 1 FP. On failed save, target is Stunned.
 * On successful save, target's Speed is halved and next attack vs target has Advantage.
 */
export function useStunningStrike(focusPoints: number, targetSavePassed: boolean): StunningStrikeResult {
  return {
    focusPoints: focusPoints - STUNNING_STRIKE_COST,
    stunningStrikeUsedThisTurn: true,
    targetStunned: !targetSavePassed,
    targetSpeedHalved: targetSavePassed,
    advantageOnNextAttackVsTarget: targetSavePassed
  }
}

// T44/T45/T46 extracted to class-monk-features.ts to stay under eslint max-lines.
