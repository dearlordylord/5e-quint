// Illusion spells — SRD 5.2.1
// Spells that deceive the senses or create phantasms.

import type {
  ConditionSpellInfo,
  ConditionSpellResult,
  DefenseSpellInfo,
  DiceDamage
} from "#/features/spell-patterns.ts"
import { saveOrCondition, upcastTargets } from "#/features/spell-patterns.ts"

/* eslint-disable no-magic-numbers */

// --- Spell Info Constants ---

export const FEAR_INFO: ConditionSpellInfo = {
  name: "Fear",
  level: 3,
  concentration: true,
  saveAbility: "wis",
  conditionApplied: "frightened",
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

export const SPELL_MIRROR_IMAGE: DefenseSpellInfo = {
  name: "Mirror Image",
  level: 2,
  concentration: false,
  castingTime: "action",
  durationDescription: "1 minute"
}

// --- Fear ---

/** Result of Fear on a single target. Forced to Dash away; repeat save end of turn only if can't see caster. */
export function fearResult(savePassed: boolean): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : "frightened",
    specialEffect: savePassed ? null : "Must Dash away from caster; repeat save only if no line of sight to caster",
    savePassed
  }
}

// --- Hypnotic Pattern ---

/** Result of Hypnotic Pattern on a single target. */
export function hypnoticPatternResult(savePassed: boolean): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : "charmed",
    specialEffect: savePassed ? null : "Incapacitated and speed 0 while charmed",
    savePassed
  }
}

// --- Mirror Image ---

export function mirrorImageThreshold(duplicatesRemaining: number): number {
  if (duplicatesRemaining >= 3) return 6
  if (duplicatesRemaining === 2) return 8
  if (duplicatesRemaining === 1) return 11
  return 21
}

export function mirrorImageHitsDuplicate(d20Roll: number, duplicatesRemaining: number): boolean {
  if (duplicatesRemaining <= 0) return false
  return d20Roll >= mirrorImageThreshold(duplicatesRemaining)
}

export function mirrorImageDuplicateAC(dexMod: number): number {
  return 10 + dexMod
}

// --- Blur ---

/** Blur (SRD 5.2.1): attacks against you have Disadvantage. */
export const BLUR_EFFECT = { attackDisadvantage: true } as const

// --- Invisibility ---

/** Invisibility targets: 1 base, +1 per slot level above 2. */
export function invisibilityTargets(slotLevel: number): number {
  return upcastTargets(slotLevel, 2)
}

// --- Color Spray ---

/** Color Spray (SRD 5.2.1): Blinded on failed CON save. */
export function colorSprayResult(savePassed: boolean): ConditionSpellResult {
  return saveOrCondition(savePassed, "blinded")
}

// --- Phantasmal Killer ---

/** Phantasmal Killer (SRD 5.2.1): 4d10 Psychic at L4, +1d10 per slot above 4. */
export function phantasmalKillerDamage(slotLevel: number): DiceDamage {
  return { dice: 4 + (slotLevel - 4), dieSize: 10 }
}

/* eslint-enable no-magic-numbers */
