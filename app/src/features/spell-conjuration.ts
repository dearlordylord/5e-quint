// Conjuration spells — SRD 5.2.1
// Spells that summon creatures, objects, or transport.

import type { ConditionSpellInfo, DiceDamage, SpellDamageInfo } from "#/features/spell-patterns.ts"
import type { Condition } from "#/types.ts"

/* eslint-disable no-magic-numbers */

// --- Types ---

/** Result of applying a condition debuff spell to a single target. */
export interface ConditionSpellResult {
  readonly conditionApplied: Condition | null
  readonly specialEffect: string | null
  readonly savePassed: boolean
}

// --- Spell Metadata ---

export const SPELL_SPIRIT_GUARDIANS: SpellDamageInfo = {
  name: "Spirit Guardians",
  level: 3,
  damageType: "radiant",
  pattern: "saveForHalf",
  concentration: true,
  saveAbility: "wis"
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

// --- Spirit Guardians ---

/**
 * Spirit Guardians (SRD 5.2.1): 3d8 Radiant/Necrotic at L3, +1d8 per slot level above 3.
 * Save for half (WIS).
 */
export function spiritGuardiansDamage(slotLevel: number): DiceDamage {
  return { dice: 3 + (slotLevel - 3), dieSize: 8 }
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

// =============================================================================
// New Conjuration spells
// =============================================================================

// --- Goodberry (L1, Action, Self, 24 hours) ---

/** Goodberry (SRD 5.2.1): 10 berries, each heals 1 HP and provides a day's nourishment. */
export function goodberryCount(): 10 {
  return 10
}

export function goodberryHealPerBerry(): 1 {
  return 1
}

// --- Ice Knife (L1, Action, 60 ft, ranged spell attack + DEX save) ---

/** Ice Knife impact (SRD 5.2.1): 1d10 Piercing on hit. */
export function iceKnifeImpactDamage(): DiceDamage {
  return { dice: 1, dieSize: 10 }
}

/** Ice Knife explosion (SRD 5.2.1): 2d6 Cold at L1, +1d6 per slot above 1. DEX save. */
export function iceKnifeExplosionDamage(slotLevel: number): DiceDamage {
  return { dice: 2 + (slotLevel - 1), dieSize: 6 }
}

/* eslint-enable no-magic-numbers */
