import type { Ability, Condition } from "#/types.ts"

// --- Common Types ---

/** Pattern categories for condition debuff spells. */
export type ConditionSpellPattern = "saveOrCondition" | "hpThreshold" | "areaCondition"

/** Static info about a condition debuff spell. */
export interface ConditionSpellInfo {
  readonly name: string
  readonly level: number
  readonly concentration: boolean
  readonly saveAbility: Ability
  readonly conditionApplied: Condition | "special"
  readonly durationDescription: string
}

/** Result of applying a condition debuff spell to a single target. */
export interface ConditionSpellResult {
  readonly conditionApplied: Condition | null
  readonly specialEffect: string | null
  readonly savePassed: boolean
}

/** Slow-specific result with individual effect fields per SRD 5.2.1. */
export interface SlowResult {
  readonly affected: boolean
  readonly savePassed: boolean
  readonly speedHalved: boolean
  readonly acPenalty: number
  readonly dexSavePenalty: number
  readonly noReactions: boolean
  readonly oneAttackOnly: boolean
  readonly spellFailChance: number
}

/** Confusion behavior categories from d10 roll (SRD 5.2.1 table). */
export type ConfusionBehavior = "moveRandom" | "doNothing" | "attackRandom" | "actNormally"

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

export const BLINDNESS_DEAFNESS_INFO: ConditionSpellInfo = {
  name: "Blindness/Deafness",
  level: 2,
  concentration: false,
  saveAbility: "con",
  conditionApplied: "blinded", // or deafened, caster's choice
  durationDescription: "1 minute"
}

export const FEAR_INFO: ConditionSpellInfo = {
  name: "Fear",
  level: 3,
  concentration: true,
  saveAbility: "wis",
  conditionApplied: "frightened",
  durationDescription: "Concentration, up to 1 minute"
}

export const SLOW_INFO: ConditionSpellInfo = {
  name: "Slow",
  level: 3,
  concentration: true,
  saveAbility: "wis",
  conditionApplied: "special",
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

export const HYPNOTIC_PATTERN_INFO: ConditionSpellInfo = {
  name: "Hypnotic Pattern",
  level: 3,
  concentration: true,
  saveAbility: "wis",
  conditionApplied: "charmed",
  durationDescription: "Concentration, up to 1 minute"
}

export const ENTANGLE_INFO: ConditionSpellInfo = {
  name: "Entangle",
  level: 1,
  concentration: true,
  saveAbility: "str",
  conditionApplied: "restrained",
  durationDescription: "Concentration, up to 1 minute"
}

export const WEB_INFO: ConditionSpellInfo = {
  name: "Web",
  level: 2,
  concentration: true,
  saveAbility: "dex",
  conditionApplied: "restrained",
  durationDescription: "Concentration, up to 1 hour"
}

// --- Internal constants ---

const SLOW_AC_PENALTY = -2
const SLOW_DEX_SAVE_PENALTY = -2
const SLOW_SPELL_FAIL_CHANCE = 25
const CONFUSION_BASE_RADIUS = 10
const CONFUSION_RADIUS_PER_LEVEL = 5
const SLEEP_BASE_TARGETS = 5

// --- Hold Person (L2 Enchantment, WIS save, Paralyzed) ---

/** Number of targets for Hold Person: 1 base, +1 per slot level above 2nd. */
export function holdPersonTargets(slotLevel: number): number {
  return 1 + Math.max(0, slotLevel - 2)
}

/** Result of Hold Person on a single target. */
export function holdPersonResult(savePassed: boolean): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : "paralyzed",
    specialEffect: null,
    savePassed
  }
}

// --- Hold Monster (L5 Enchantment, WIS save, Paralyzed) ---

/** Number of targets for Hold Monster: 1 base, +1 per slot level above 5th. */
export function holdMonsterTargets(slotLevel: number): number {
  return 1 + Math.max(0, slotLevel - 5)
}

/** Result of Hold Monster on a single target. */
export function holdMonsterResult(savePassed: boolean): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : "paralyzed",
    specialEffect: null,
    savePassed
  }
}

// --- Blindness/Deafness (L2 Transmutation, CON save, Blinded or Deafened) ---

/** Number of targets for Blindness/Deafness: 1 base, +1 per slot level above 2nd. */
export function blindnessDeafnessTargets(slotLevel: number): number {
  return 1 + Math.max(0, slotLevel - 2)
}

/** Result of Blindness/Deafness on a single target. */
export function blindnessDeafnessResult(savePassed: boolean, choice: "blinded" | "deafened"): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : choice,
    specialEffect: null,
    savePassed
  }
}

// --- Fear (L3 Illusion, WIS save, Frightened) ---

/** Result of Fear on a single target. Forced to Dash away; repeat save end of turn only if can't see caster. */
export function fearResult(savePassed: boolean): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : "frightened",
    specialEffect: savePassed ? null : "Must Dash away from caster; repeat save only if no line of sight to caster",
    savePassed
  }
}

// --- Slow (L3 Transmutation, WIS save, special debuffs) ---

/** Maximum number of targets for Slow: always 6. */
export function slowMaxTargets(): 6 {
  return 6
}

/** Result of Slow on a single target. */
export function slowResult(savePassed: boolean): SlowResult {
  if (savePassed) {
    return {
      affected: false,
      savePassed: true,
      speedHalved: false,
      acPenalty: 0,
      dexSavePenalty: 0,
      noReactions: false,
      oneAttackOnly: false,
      spellFailChance: 0
    }
  }
  return {
    affected: true,
    savePassed: false,
    speedHalved: true,
    acPenalty: SLOW_AC_PENALTY,
    dexSavePenalty: SLOW_DEX_SAVE_PENALTY,
    noReactions: true,
    oneAttackOnly: true,
    spellFailChance: SLOW_SPELL_FAIL_CHANCE
  }
}

// --- Sleep (L1 Enchantment, WIS save, Concentration — SRD 5.2.1) ---

/**
 * SRD 5.2.1: Each creature in a 5ft-radius Sphere makes a WIS save.
 * Fail: Incapacitated until end of next turn, then repeat save.
 * Second fail: Unconscious for duration. Ends on damage or being shaken awake.
 * Scales: +1 creature per slot level above 1st (5ft-radius Sphere per SRD).
 */
export function sleepMaxTargets(slotLevel: number): number {
  return SLEEP_BASE_TARGETS + Math.max(0, slotLevel - 1)
}

/**
 * Sleep result: two-phase save. First fail = Incapacitated. Second fail = Unconscious.
 * This models the initial save result.
 */
export function sleepResult(savePassed: boolean): ConditionSpellResult {
  if (savePassed) return { conditionApplied: null, specialEffect: null, savePassed: true }
  return { conditionApplied: null, specialEffect: "incapacitatedUntilEndOfNextTurn", savePassed: false }
}

/** Sleep second save: if failed, target falls Unconscious for the duration. */
export function sleepSecondSaveResult(savePassed: boolean): ConditionSpellResult {
  if (savePassed) return { conditionApplied: null, specialEffect: null, savePassed: true }
  return { conditionApplied: "unconscious", specialEffect: null, savePassed: false }
}

// --- Confusion (L4 Enchantment, WIS save, d10 behavior table) ---

/** Radius for Confusion: 10ft base, +5ft per slot level above 4th. */
export function confusionRadius(slotLevel: number): number {
  return CONFUSION_BASE_RADIUS + CONFUSION_RADIUS_PER_LEVEL * Math.max(0, slotLevel - 4)
}

/**
 * Confusion behavior from d10 roll (SRD 5.2.1 table):
 * 1 = moveRandom (uses all movement in random direction)
 * 2-6 = doNothing (no movement or actions)
 * 7-8 = attackRandom (melee attack against random creature in reach)
 * 9-10 = actNormally (target chooses behavior)
 */
export function confusionBehavior(d10Roll: number): ConfusionBehavior {
  if (d10Roll <= 1) return "moveRandom"
  if (d10Roll <= 6) return "doNothing"
  if (d10Roll <= 8) return "attackRandom"
  return "actNormally"
}

// --- Hypnotic Pattern (L3 Illusion, WIS save, Charmed + Incapacitated + speed 0) ---

/** Result of Hypnotic Pattern on a single target. Returns charmed; Incapacitated + speed 0 tracked by caller. */
export function hypnoticPatternResult(savePassed: boolean): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : "charmed",
    specialEffect: savePassed ? null : "Incapacitated and speed 0 while charmed",
    savePassed
  }
}

// --- Entangle (L1 Conjuration, STR save, Restrained) ---

/** Result of Entangle on a single target. */
export function entangleResult(savePassed: boolean): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : "restrained",
    specialEffect: null,
    savePassed
  }
}

// --- Web (L2 Conjuration, DEX save, Restrained) ---

/** Result of Web on a single target. */
export function webResult(savePassed: boolean): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : "restrained",
    specialEffect: null,
    savePassed
  }
}

/** DC to break free from Web: same as the caster's spell save DC. */
export function webBreakFreeDC(spellSaveDC: number): number {
  return spellSaveDC
}
