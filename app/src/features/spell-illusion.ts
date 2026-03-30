// Illusion spells — SRD 5.2.1
// Spells that deceive the senses or create phantasms.

import type { ConditionSpellInfo, DefenseSpellInfo, DiceDamage } from "#/features/spell-patterns.ts"
import type { Condition } from "#/types.ts"

/* eslint-disable no-magic-numbers */

// --- Types ---

/** Result of applying a condition debuff spell to a single target. */
export interface ConditionSpellResult {
  readonly conditionApplied: Condition | null
  readonly specialEffect: string | null
  readonly savePassed: boolean
}

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

/** Mirror Image (SRD 5.2.1): L2 Illusion, Action. 1 min. 3 duplicates. No concentration. */
export const SPELL_MIRROR_IMAGE: DefenseSpellInfo = {
  name: "Mirror Image",
  level: 2,
  concentration: false,
  castingTime: "action",
  durationDescription: "1 minute"
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

// --- Hypnotic Pattern (L3 Illusion, WIS save, Charmed + Incapacitated + speed 0) ---

/** Result of Hypnotic Pattern on a single target. Returns charmed; Incapacitated + speed 0 tracked by caller. */
export function hypnoticPatternResult(savePassed: boolean): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : "charmed",
    specialEffect: savePassed ? null : "Incapacitated and speed 0 while charmed",
    savePassed
  }
}

// --- Mirror Image ---

/**
 * Mirror Image d20 threshold (SRD 5.1 / task spec):
 * 3 duplicates → 6, 2 → 8, 1 → 11, 0 → 21 (impossible on d20).
 */
export function mirrorImageThreshold(duplicatesRemaining: number): number {
  if (duplicatesRemaining >= 3) return 6
  if (duplicatesRemaining === 2) return 8
  if (duplicatesRemaining === 1) return 11
  return 21
}

/**
 * Whether a d20 roll hits a mirror image duplicate instead of the caster.
 */
export function mirrorImageHitsDuplicate(d20Roll: number, duplicatesRemaining: number): boolean {
  if (duplicatesRemaining <= 0) return false
  return d20Roll >= mirrorImageThreshold(duplicatesRemaining)
}

/**
 * Mirror Image duplicate AC (SRD 5.2.1): 10 + Dexterity modifier.
 */
export function mirrorImageDuplicateAC(dexMod: number): number {
  return 10 + dexMod
}

// =============================================================================
// New Illusion spells
// =============================================================================

// --- Blur (L2, Action, Self, Concentration 1 min) ---

/** Blur (SRD 5.2.1): attacks against you have Disadvantage. */
export function blurActive(): { readonly attackDisadvantage: true } {
  return { attackDisadvantage: true }
}

// --- Invisibility (L2, Action, Touch, Concentration 1 hour) ---

/** Invisibility targets: 1 base, +1 per slot level above 2. */
export function invisibilityTargets(slotLevel: number): number {
  return 1 + Math.max(0, slotLevel - 2)
}

// --- Greater Invisibility (L4, Action, Touch, Concentration 1 min) ---

// Greater Invisibility: same as Invisibility but doesn't end on attack/cast. Modeled as flag.

// --- Color Spray (L1, Action, Self 15-ft Cone, CON save, Blinded) ---

/** Color Spray (SRD 5.2.1): Blinded until end of caster's next turn on failed CON save. */
export function colorSprayResult(savePassed: boolean): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : "blinded",
    specialEffect: null,
    savePassed
  }
}

// --- Phantasmal Killer (L4, Action, 120 ft, Concentration 1 min, WIS save) ---

/** Phantasmal Killer (SRD 5.2.1): 4d10 Psychic at L4, +1d10 per slot above 4. On failed save + ongoing. */
export function phantasmalKillerDamage(slotLevel: number): DiceDamage {
  return { dice: 4 + (slotLevel - 4), dieSize: 10 }
}

/* eslint-enable no-magic-numbers */
