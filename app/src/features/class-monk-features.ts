// --- Monk: Passives (T44), Reactions (T45), Warrior of the Open Hand (T46) ---
// Extracted from class-monk.ts to stay under eslint max-lines (420).

import type { MartialArtsDie } from "#/features/class-monk.ts"
import { pMartialArtsDie } from "#/features/class-monk.ts"
import type { Condition, Size } from "#/types.ts"

// --- Monk Passives (T44) ---

// --- Types ---

export interface DisciplinedSurvivorRerollResult {
  readonly focusPoints: number
  readonly newSaveResult: number
}

export interface SuperiorDefenseResult {
  readonly focusPoints: number
  readonly resistancesGranted: true
  readonly durationMinutes: 1
}

// --- Constants ---

const UNARMORED_MOVEMENT_LEVEL = 2
const FOCUS_EMPOWERED_STRIKES_LEVEL = 6
const SELF_RESTORATION_LEVEL = 10
const DEFLECT_ENERGY_LEVEL = 13
const DISCIPLINED_SURVIVOR_LEVEL = 14
const SUPERIOR_DEFENSE_LEVEL = 18
const SUPERIOR_DEFENSE_COST = 3

// --- Unarmored Movement ---

/** SRD table: +10ft (L2), +15ft (L6), +20ft (L10), +25ft (L14), +30ft (L18). */
export function unarmoredMovementBonus(monkLevel: number): number {
  /* eslint-disable no-magic-numbers */
  if (monkLevel < UNARMORED_MOVEMENT_LEVEL) return 0
  if (monkLevel < 6) return 10
  if (monkLevel < 10) return 15
  if (monkLevel < 14) return 20
  if (monkLevel < 18) return 25
  return 30
  /* eslint-enable no-magic-numbers */
}

/** Only while not wearing armor or wielding a shield. */
export function canUseUnarmoredMovement(wearingArmor: boolean, wieldingShield: boolean): boolean {
  return !wearingArmor && !wieldingShield
}

// --- Focus-Empowered Strikes (L6) ---

/** Unarmed strikes count as magical for overcoming resistance/immunity at L6+. */
export function hasFocusEmpoweredStrikes(monkLevel: number): boolean {
  return monkLevel >= FOCUS_EMPOWERED_STRIKES_LEVEL
}

// --- Self-Restoration (L10) ---

const SELF_RESTORATION_CONDITIONS: ReadonlyArray<Condition> = ["charmed", "frightened", "poisoned"]

/** Returns the conditions that Self-Restoration can remove. */
export function selfRestorationConditions(): ReadonlyArray<Condition> {
  return SELF_RESTORATION_CONDITIONS
}

/** Self-Restoration available at L10+. */
export function canSelfRestore(monkLevel: number): boolean {
  return monkLevel >= SELF_RESTORATION_LEVEL
}

// --- Deflect Energy (L13) ---

/** At L13+, Deflect Attacks works on any damage type, not just BPS. */
export function hasDeflectEnergy(monkLevel: number): boolean {
  return monkLevel >= DEFLECT_ENERGY_LEVEL
}

// --- Disciplined Survivor (L14) ---

/** Proficiency in all saving throws at L14+. */
export function hasDisciplinedSurvivor(monkLevel: number): boolean {
  return monkLevel >= DISCIPLINED_SURVIVOR_LEVEL
}

/** Expend 1 FP to reroll a failed saving throw. Must use the new roll. */
export function disciplinedSurvivorReroll(focusPoints: number, newRoll: number): DisciplinedSurvivorRerollResult {
  return {
    focusPoints: focusPoints - 1,
    newSaveResult: newRoll
  }
}

// --- Superior Defense (L18) ---

/** Can use Superior Defense: L18+, 3 FP, action available. */
export function canUseSuperiorDefense(monkLevel: number, focusPoints: number, actionUsed: boolean): boolean {
  return monkLevel >= SUPERIOR_DEFENSE_LEVEL && focusPoints >= SUPERIOR_DEFENSE_COST && !actionUsed
}

/** Spend 3 FP to gain resistance to all damage except Force for 1 minute. */
export function useSuperiorDefense(focusPoints: number): SuperiorDefenseResult {
  return {
    focusPoints: focusPoints - SUPERIOR_DEFENSE_COST,
    resistancesGranted: true,
    durationMinutes: 1
  }
}

// --- Monk Reactions (T45) ---

// --- Types ---

export interface DeflectAttacksResult {
  readonly damageTaken: number
  readonly reducedToZero: boolean
}

export interface ThrowBackDamage {
  readonly dieSize: MartialArtsDie
  readonly modifier: number
}

// --- Deflect Attacks (L3) ---

const DEFLECT_ATTACKS_LEVEL = 3
const DEFLECT_THROW_BACK_COST = 1

/** Total damage reduction: 1d10 + DEX mod + monk level. */
export function deflectAttacksReduction(d10Roll: number, dexMod: number, monkLevel: number): number {
  return d10Roll + dexMod + monkLevel
}

/** Can use Deflect Attacks: L3+, reaction available, weapon attack OR has Deflect Energy. */
export function canDeflectAttacks(
  monkLevel: number,
  reactionAvailable: boolean,
  isWeaponAttack: boolean,
  hasDeflectEnergyFlag: boolean
): boolean {
  return monkLevel >= DEFLECT_ATTACKS_LEVEL && reactionAvailable && (isWeaponAttack || hasDeflectEnergyFlag)
}

/** Apply damage reduction — returns remaining damage and whether it was reduced to 0. */
export function deflectAttacksResult(incomingDamage: number, reductionAmount: number): DeflectAttacksResult {
  const damageTaken = Math.max(0, incomingDamage - reductionAmount)
  return {
    damageTaken,
    reducedToZero: damageTaken === 0
  }
}

/** Can throw back: requires damage reduced to 0 and 1 FP. */
export function canThrowBack(reducedToZero: boolean, focusPoints: number): boolean {
  return reducedToZero && focusPoints >= DEFLECT_THROW_BACK_COST
}

/** Throw-back damage: Martial Arts die + DEX mod. */
export function throwBackDamage(monkLevel: number, dexMod: number): ThrowBackDamage {
  return {
    dieSize: pMartialArtsDie(monkLevel),
    modifier: dexMod
  }
}

// --- Slow Fall (L4) ---

const SLOW_FALL_LEVEL = 4

/** Reduce fall damage by 5 * monk level. */
export function slowFallReduction(monkLevel: number): number {
  /* eslint-disable no-magic-numbers */
  return 5 * monkLevel
  /* eslint-enable no-magic-numbers */
}

/** Can use Slow Fall: L4+, reaction available. */
export function canSlowFall(monkLevel: number, reactionAvailable: boolean): boolean {
  return monkLevel >= SLOW_FALL_LEVEL && reactionAvailable
}

/** Apply Slow Fall: reduce fall damage by 5 * monk level, minimum 0. */
export function applySlowFall(fallDamage: number, monkLevel: number): number {
  /* eslint-disable no-magic-numbers */
  return Math.max(0, fallDamage - 5 * monkLevel)
  /* eslint-enable no-magic-numbers */
}

// --- Warrior of the Open Hand (T46) ---

export type OpenHandTechniqueChoice = "addle" | "push" | "topple"

export interface OpenHandTechniqueResult {
  readonly effectApplied: boolean
  readonly cantTakeReactions: boolean
  readonly pushedFeet: number
  readonly prone: boolean
}

export interface WholenessOfBodyResult {
  readonly healAmount: number
  readonly wholenessCharges: number
  readonly bonusActionUsed: true
}

export interface UseQuiveringPalmResult {
  readonly focusPoints: number
  readonly quiveringPalmActive: true
}

export interface TriggerQuiveringPalmResult {
  readonly reducedToZeroHp: boolean
  readonly forceDamage: number
}

const FLEET_STEP_LEVEL = 11
const QUIVERING_PALM_LEVEL = 17
const QUIVERING_PALM_COST = 4

/**
 * Open Hand Technique: when you hit with Flurry of Blows, choose one effect.
 * Addle: no save, can't take Reactions. Push: Large or smaller, STR save. Topple: DEX save.
 */
export function openHandTechniqueResult(
  choice: OpenHandTechniqueChoice,
  targetSavePassed: boolean,
  targetSize: Size
): OpenHandTechniqueResult {
  switch (choice) {
    case "addle":
      return { effectApplied: true, cantTakeReactions: true, pushedFeet: 0, prone: false }
    case "push": {
      const tooLarge = targetSize === "huge" || targetSize === "gargantuan"
      if (tooLarge || targetSavePassed) {
        return { effectApplied: false, cantTakeReactions: false, pushedFeet: 0, prone: false }
      }

      return { effectApplied: true, cantTakeReactions: false, pushedFeet: 15, prone: false }
    }
    case "topple":
      if (targetSavePassed) {
        return { effectApplied: false, cantTakeReactions: false, pushedFeet: 0, prone: false }
      }
      return { effectApplied: true, cantTakeReactions: false, pushedFeet: 0, prone: true }
  }
}

/** Can use Wholeness of Body: requires charges and bonus action. */
export function canUseWholenessOfBody(wholenessCharges: number, bonusActionUsed: boolean): boolean {
  return wholenessCharges > 0 && !bonusActionUsed
}

/** Max charges = WIS modifier (minimum 1). */
export function wholenessOfBodyMaxCharges(wisMod: number): number {
  return Math.max(1, wisMod)
}

/** Use Wholeness of Body: roll Martial Arts die, heal die + WIS mod (min 1 HP). */
export function useWholenessOfBody(
  wholenessCharges: number,
  martialArtsDieRoll: number,
  wisMod: number
): WholenessOfBodyResult {
  return {
    healAmount: Math.max(1, martialArtsDieRoll + wisMod),
    wholenessCharges: wholenessCharges - 1,
    bonusActionUsed: true
  }
}

/** Fleet Step available at L11+. */
export function hasFleetStep(monkLevel: number): boolean {
  return monkLevel >= FLEET_STEP_LEVEL
}

/** Can use Quivering Palm: L17+, 4 FP. */
export function canUseQuiveringPalm(monkLevel: number, focusPoints: number): boolean {
  return monkLevel >= QUIVERING_PALM_LEVEL && focusPoints >= QUIVERING_PALM_COST
}

/** Expend 4 FP to start imperceptible vibrations. */
export function useQuiveringPalm(focusPoints: number): UseQuiveringPalmResult {
  return {
    focusPoints: focusPoints - QUIVERING_PALM_COST,
    quiveringPalmActive: true
  }
}

/**
 * Trigger Quivering Palm: target makes CON save.
 * Fail = 10d12 Force damage. Success = half damage (SRD 5.2.1).
 */
export function triggerQuiveringPalm(targetSavePassed: boolean, d12Total: number): TriggerQuiveringPalmResult {
  if (!targetSavePassed) {
    return { reducedToZeroHp: false, forceDamage: d12Total }
  }
  /* eslint-disable no-magic-numbers */
  return { reducedToZeroHp: false, forceDamage: Math.floor(d12Total / 2) }
  /* eslint-enable no-magic-numbers */
}
