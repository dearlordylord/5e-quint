// Enchantment spells — SRD 5.2.1
// Mind-affecting spells that influence or control creatures.

import type { ConditionSpellInfo, ConditionSpellResult, DiceDamage } from "#/features/spell-patterns.ts"
import { cantripDamage, SAVE_PASSED, saveOrCondition, upcastTargets } from "#/features/spell-patterns.ts"
import type { Condition } from "#/types.ts"

/* eslint-disable no-magic-numbers */

// --- Types ---

/** Confusion behavior categories from d10 roll (SRD 5.2.1 table). */
export const CONFUSION_BEHAVIORS = ["moveRandom", "doNothing", "attackRandom", "actNormally"] as const

export type ConfusionBehavior = (typeof CONFUSION_BEHAVIORS)[number]

/** Target type restriction for Dominate spells. */
export const DOMINATE_TARGET_TYPES = ["beast", "humanoid", "any"] as const

export type DominateTargetType = (typeof DOMINATE_TARGET_TYPES)[number]

/** Irresistible Dance effects on failed save (SRD 5.2.1). */
export interface IrresistibleDanceResult {
  readonly charmed: boolean
  readonly mustDanceInPlace: boolean
  readonly disadvantageOnDexSaves: boolean
  readonly disadvantageOnAttackRolls: boolean
  readonly advantageOnAttacksAgainst: boolean
}

// --- Constants ---

/** Bless/Bane bonus/penalty die size. */
export const BLESS_BANE_DIE = 4

/** Power Word Kill HP threshold (SRD 5.2.1). */
export const POWER_WORD_KILL_THRESHOLD = 100

/** Power Word Kill overflow damage: 12d12 Psychic if target > 100 HP. */
export const POWER_WORD_KILL_OVERFLOW: DiceDamage = { dice: 12, dieSize: 12 }

/** Power Word Stun HP threshold (SRD 5.2.1). */
export const POWER_WORD_STUN_THRESHOLD = 150

/** Hex damage per hit: 1d6 Necrotic. */
export const HEX_DAMAGE: DiceDamage = { dice: 1, dieSize: 6 }

/** Conditions removed by Power Word Heal. */
export const POWER_WORD_HEAL_REMOVED_CONDITIONS = [
  "charmed",
  "frightened",
  "paralyzed",
  "poisoned",
  "stunned"
] as const satisfies ReadonlyArray<Condition>

const IRRESISTIBLE_DANCE_SAVED: IrresistibleDanceResult = {
  charmed: false,
  mustDanceInPlace: true, // dances until end of next turn even on success
  disadvantageOnDexSaves: false,
  disadvantageOnAttackRolls: false,
  advantageOnAttacksAgainst: false
}

const IRRESISTIBLE_DANCE_FAILED: IrresistibleDanceResult = {
  charmed: true,
  mustDanceInPlace: true,
  disadvantageOnDexSaves: true,
  disadvantageOnAttackRolls: true,
  advantageOnAttacksAgainst: true
}

// --- Spell Info Constants ---

export const HOLD_PERSON_INFO: ConditionSpellInfo = {
  name: "Hold Person",
  level: 2,
  concentration: true,
  saveAbility: "wis",
  conditionApplied: "paralyzed",
  durationDescription: "Concentration, up to 1 minute"
}

export const HOLD_MONSTER_INFO: ConditionSpellInfo = {
  name: "Hold Monster",
  level: 5,
  concentration: true,
  saveAbility: "wis",
  conditionApplied: "paralyzed",
  durationDescription: "Concentration, up to 1 minute"
}

export const SLEEP_INFO: ConditionSpellInfo = {
  name: "Sleep",
  level: 1,
  concentration: true,
  saveAbility: "wis",
  conditionApplied: "unconscious",
  durationDescription: "Concentration, up to 1 minute"
}

export const CONFUSION_INFO: ConditionSpellInfo = {
  name: "Confusion",
  level: 4,
  concentration: true,
  saveAbility: "wis",
  conditionApplied: "special",
  durationDescription: "Concentration, up to 1 minute"
}

// --- Internal constants ---

const SLEEP_BASE_TARGETS = 5
const CONFUSION_BASE_RADIUS = 10
const CONFUSION_RADIUS_PER_LEVEL = 5

// --- Hold Person / Hold Monster ---

/** Number of targets for Hold Person: 1 base, +1 per slot level above 2nd. */
export function holdPersonTargets(slotLevel: number): number {
  return upcastTargets(slotLevel, 2)
}

/** Result of Hold Person on a single target. */
export function holdPersonResult(savePassed: boolean): ConditionSpellResult {
  return saveOrCondition(savePassed, "paralyzed")
}

/** Number of targets for Hold Monster: 1 base, +1 per slot level above 5th. */
export function holdMonsterTargets(slotLevel: number): number {
  return upcastTargets(slotLevel, 5)
}

/** Result of Hold Monster on a single target (same mechanic as Hold Person). */
export const holdMonsterResult: (savePassed: boolean) => ConditionSpellResult = holdPersonResult

// --- Sleep ---

export function sleepMaxTargets(slotLevel: number): number {
  return SLEEP_BASE_TARGETS + Math.max(0, slotLevel - 1)
}

const SLEEP_FIRST_FAILED: ConditionSpellResult = {
  conditionApplied: null,
  specialEffect: "incapacitatedUntilEndOfNextTurn",
  savePassed: false
}

/** Sleep first save: fail = Incapacitated until end of next turn. */
export function sleepResult(savePassed: boolean): ConditionSpellResult {
  return savePassed ? SAVE_PASSED : SLEEP_FIRST_FAILED
}

/** Sleep second save: fail = Unconscious for duration. */
export const sleepSecondSaveResult: (savePassed: boolean) => ConditionSpellResult = (savePassed) =>
  saveOrCondition(savePassed, "unconscious")

// --- Confusion ---

/** Radius for Confusion: 10ft base, +5ft per slot level above 4th. */
export function confusionRadius(slotLevel: number): number {
  return CONFUSION_BASE_RADIUS + CONFUSION_RADIUS_PER_LEVEL * Math.max(0, slotLevel - 4)
}

/**
 * Confusion behavior from d10 roll (SRD 5.2.1 table):
 * 1 = moveRandom, 2-6 = doNothing, 7-8 = attackRandom, 9-10 = actNormally
 */
export function confusionBehavior(d10Roll: number): ConfusionBehavior {
  if (d10Roll <= 1) return "moveRandom"
  if (d10Roll <= 6) return "doNothing"
  if (d10Roll <= 8) return "attackRandom"
  return "actNormally"
}

// --- Bless / Bane ---

/** Bless/Bane target count: 3 base, +1 per slot level above 1. */
export function blessTargets(slotLevel: number): number {
  return 3 + (slotLevel - 1)
}

/** Bane uses the same target scaling as Bless. */
export const baneTargets: (slotLevel: number) => number = blessTargets

// --- Heroism ---

/** Heroism temp HP = spellcasting mod at start of each turn. Immune to Frightened. */
export function heroismTempHp(spellcastingMod: number): number {
  return Math.max(0, spellcastingMod)
}

/** Heroism targets: 1 base, +1 per slot level above 1. */
export function heroismTargets(slotLevel: number): number {
  return upcastTargets(slotLevel, 1)
}

// --- Hex ---

/** Hex concentration duration in hours based on slot level. */
export function hexDuration(slotLevel: number): number {
  if (slotLevel <= 1) return 1
  if (slotLevel <= 2) return 4
  if (slotLevel <= 4) return 8
  return 24
}

// --- Dominate spells ---

/** Dominate spell base duration in minutes based on spell and slot level. */
export function dominateDuration(baseSpellLevel: number, slotLevel: number): { minutes: number } {
  const levelsAbove = slotLevel - baseSpellLevel
  if (levelsAbove <= 0) return { minutes: baseSpellLevel === 8 ? 60 : 1 }
  if (levelsAbove === 1) return { minutes: baseSpellLevel === 8 ? 480 : 10 }
  if (levelsAbove === 2) return { minutes: baseSpellLevel === 8 ? 480 : 60 }
  return { minutes: 480 }
}

// --- Irresistible Dance ---

export function irresistibleDanceResult(savePassed: boolean): IrresistibleDanceResult {
  return savePassed ? IRRESISTIBLE_DANCE_SAVED : IRRESISTIBLE_DANCE_FAILED
}

// --- Vicious Mockery (Cantrip, scaling d6 Psychic, disadvantage on next attack roll) ---

export function viciousMockeryDamage(characterLevel: number): DiceDamage {
  return cantripDamage(characterLevel, 6)
}

// --- Befuddlement (L8, Action, 150 ft, INT save, instantaneous but effect persists) ---

/** Befuddlement (SRD 5.2.1): 10d12 Psychic on failed save, half on success. */
export const BEFUDDLEMENT_DAMAGE: DiceDamage = { dice: 10, dieSize: 12 }

/* eslint-enable no-magic-numbers */
