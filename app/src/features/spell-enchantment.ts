// Enchantment spells — SRD 5.2.1
// Mind-affecting spells that influence or control creatures.

import type { ConditionSpellInfo, DiceDamage } from "#/features/spell-patterns.ts"
import { cantripDamageDice } from "#/features/spell-patterns.ts"
import type { Condition } from "#/types.ts"

/* eslint-disable no-magic-numbers */

// --- Types ---

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

// --- Sleep (L1 Enchantment, WIS save, Concentration — SRD 5.2.1) ---

/**
 * SRD 5.2.1: Each creature in a 5ft-radius Sphere makes a WIS save.
 * Scales: +1 creature per slot level above 1st.
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
 * 1 = moveRandom, 2-6 = doNothing, 7-8 = attackRandom, 9-10 = actNormally
 */
export function confusionBehavior(d10Roll: number): ConfusionBehavior {
  if (d10Roll <= 1) return "moveRandom"
  if (d10Roll <= 6) return "doNothing"
  if (d10Roll <= 8) return "attackRandom"
  return "actNormally"
}

// =============================================================================
// New Enchantment spells — Buffs / Debuffs
// =============================================================================

// --- Bless (L1, Action, 30 ft, Concentration 1 min) ---

/** Bless (SRD 5.2.1): +1d4 to attack rolls and saving throws. 3 targets, +1 per upcast. */
export function blessTargets(slotLevel: number): number {
  return 3 + (slotLevel - 1)
}

/** Bless bonus die: always d4. */
export function blessBonusDie(): 4 {
  return 4
}

// --- Bane (L1, Action, 30 ft, Concentration 1 min, CHA save) ---

/** Bane (SRD 5.2.1): -1d4 to attack rolls and saving throws. 3 targets, +1 per upcast. */
export function baneTargets(slotLevel: number): number {
  return 3 + (slotLevel - 1)
}

/** Bane penalty die: always d4. */
export function banePenaltyDie(): 4 {
  return 4
}

// --- Heroism (L1, Action, Touch, Concentration 1 min) ---

/** Heroism (SRD 5.2.1): temp HP = spellcasting mod at start of each turn. Immune to Frightened. */
export function heroismTempHp(spellcastingMod: number): number {
  return Math.max(0, spellcastingMod)
}

/** Heroism targets: 1 base, +1 per slot level above 1. */
export function heroismTargets(slotLevel: number): number {
  return 1 + (slotLevel - 1)
}

// --- Hex (L1, Bonus Action, 90 ft, Concentration) ---

/** Hex (SRD 5.2.1): +1d6 Necrotic per hit. Target has disadvantage on one ability's checks. */
export function hexDamage(): DiceDamage {
  return { dice: 1, dieSize: 6 }
}

/** Hex concentration duration in hours based on slot level. */
export function hexDuration(slotLevel: number): number {
  if (slotLevel <= 1) return 1
  if (slotLevel <= 2) return 4
  if (slotLevel <= 4) return 8
  return 24
}

// --- Compulsion (L4, Action, 30 ft, Concentration 1 min, WIS save) ---

// Compulsion: Charmed, forced movement direction. Modeled as capability flag.

// --- Dominate spells ---

/** Target type restriction for Dominate spells. */
export type DominateTargetType = "beast" | "humanoid" | "any"

/** Dominate spell base duration in minutes based on spell and slot level. */
export function dominateDuration(baseSpellLevel: number, slotLevel: number): { minutes: number } {
  const levelsAbove = slotLevel - baseSpellLevel
  if (levelsAbove <= 0) return { minutes: baseSpellLevel === 8 ? 60 : 1 }
  if (levelsAbove === 1) return { minutes: baseSpellLevel === 8 ? 480 : 10 }
  if (levelsAbove === 2) return { minutes: baseSpellLevel === 8 ? 480 : 60 }
  return { minutes: 480 }
}

// --- Power Word Kill (L9, Action, 60 ft, no save) ---

/** Power Word Kill (SRD 5.2.1): kills if ≤ 100 HP; else 12d12 Psychic. */
export function powerWordKillThreshold(): 100 {
  return 100
}

/** Power Word Kill overflow damage (SRD 5.2.1): 12d12 Psychic if target > 100 HP. */
export function powerWordKillOverflowDamage(): DiceDamage {
  return { dice: 12, dieSize: 12 }
}

// --- Power Word Stun (L8, Action, 60 ft, no initial save) ---

/** Power Word Stun (SRD 5.2.1): Stunned if ≤ 150 HP; else Speed = 0 for 1 turn. */
export function powerWordStunThreshold(): 150 {
  return 150
}

// --- Power Word Heal (L9, Action, 60 ft, no save) ---

/** Conditions removed by Power Word Heal. */
export const POWER_WORD_HEAL_REMOVED_CONDITIONS = [
  "charmed",
  "frightened",
  "paralyzed",
  "poisoned",
  "stunned"
] as const satisfies ReadonlyArray<Condition>

// --- Irresistible Dance (L6, Action, 30 ft, Concentration 1 min, WIS save) ---

/** Irresistible Dance effects on failed save (SRD 5.2.1). */
export interface IrresistibleDanceResult {
  readonly charmed: boolean
  readonly mustDanceInPlace: boolean
  readonly disadvantageOnDexSaves: boolean
  readonly disadvantageOnAttackRolls: boolean
  readonly advantageOnAttacksAgainst: boolean
}

export function irresistibleDanceResult(savePassed: boolean): IrresistibleDanceResult {
  if (savePassed) {
    return {
      charmed: false,
      mustDanceInPlace: true, // dances until end of next turn even on success
      disadvantageOnDexSaves: false,
      disadvantageOnAttackRolls: false,
      advantageOnAttacksAgainst: false
    }
  }
  return {
    charmed: true,
    mustDanceInPlace: true,
    disadvantageOnDexSaves: true,
    disadvantageOnAttackRolls: true,
    advantageOnAttacksAgainst: true
  }
}

// --- Vicious Mockery (Cantrip, Action, 60 ft, WIS save) ---

/** Vicious Mockery (SRD 5.2.1): scaling d6 Psychic, disadvantage on next attack roll. */
export function viciousMockeryDamage(characterLevel: number): DiceDamage {
  return { dice: cantripDamageDice(characterLevel), dieSize: 6 }
}

/* eslint-enable no-magic-numbers */
