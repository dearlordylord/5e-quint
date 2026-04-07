// Shared spell damage/effect patterns — technical helpers used across school files.
// SRD 5.2.1 spells organized by school; this file provides the common mechanics.
//
// Note: existing spell-damage.ts, spell-conditions.ts, spell-defense.ts contain
// spells from the initial implementation. New spells go into school-based files
// (spell-evocation.ts, spell-abjuration.ts, etc.) importing from here.

import type { Ability, Condition, DamageType } from "#/types.ts"

// =============================================================================
// Types
// =============================================================================

/** Damage pattern used by a spell. */
export const SPELL_DAMAGE_PATTERNS = ["saveForHalf", "attackRoll", "autoHit", "saveOrNothing"] as const

export type SpellDamagePattern = (typeof SPELL_DAMAGE_PATTERNS)[number]

/** Metadata for a damage-dealing spell (SRD 5.2.1). */
export interface SpellDamageInfo {
  readonly name: string
  readonly level: number // 0 = cantrip
  readonly damageType: DamageType
  readonly pattern: SpellDamagePattern
  readonly concentration: boolean
  readonly saveAbility?: Ability
}

/** Metadata for a condition-applying spell. */
export interface ConditionSpellInfo {
  readonly name: string
  readonly level: number
  readonly concentration: boolean
  readonly saveAbility?: Ability
  readonly conditionApplied: Condition | "special"
  readonly durationDescription: string
}

/** Metadata for a defensive/buff spell. */
export interface DefenseSpellInfo {
  readonly name: string
  readonly level: number
  readonly concentration: boolean
  readonly castingTime: string
  readonly durationDescription: string
}

/** Dice-based damage descriptor. */
export interface DiceDamage {
  readonly dice: number
  readonly dieSize: number
}

/** Result of applying a condition spell to a single target. */
export interface ConditionSpellResult {
  readonly conditionApplied: Condition | null
  readonly specialEffect: string | null
  readonly savePassed: boolean
}

/** Dice damage with a flat bonus (e.g. Disintegrate). */
export interface DiceDamageWithBonus {
  readonly dice: number
  readonly dieSize: number
  readonly flatBonus: number
}

// =============================================================================
// Core Damage Pattern Functions
// =============================================================================

/* eslint-disable no-magic-numbers */

/**
 * Save-for-half: full damage on failed save, floor(damage/2) on success.
 * Used by Fireball, Spirit Guardians, etc.
 */
export function saveForHalf(totalDamage: number, savePassed: boolean): number {
  return savePassed ? Math.floor(totalDamage / 2) : totalDamage
}

/**
 * Attack roll damage: full damage on hit, 0 on miss.
 * Used by Spiritual Weapon, Vampiric Touch, etc.
 */
export function attackRollDamage(hit: boolean, totalDamage: number): number {
  return hit ? totalDamage : 0
}

/**
 * Auto-hit damage: guaranteed damage, typically multi-dart.
 * Used by Magic Missile.
 */
export function autoHitDamage(darts: number, damagePerDart: number): number {
  return darts * damagePerDart
}

/**
 * Save-or-nothing: full damage on failed save, 0 on success.
 * Used by Disintegrate, etc.
 */
export function saveOrNothing(totalDamage: number, savePassed: boolean): number {
  return savePassed ? 0 : totalDamage
}

// =============================================================================
// Cantrip Scaling
// =============================================================================

/**
 * SRD: Damage cantrips add dice at character levels 5, 11, 17.
 * Returns the number of damage dice for a cantrip at given character level.
 */
export function cantripDamageDice(characterLevel: number): number {
  if (characterLevel < 5) return 1
  if (characterLevel < 11) return 2
  if (characterLevel < 17) return 3
  return 4
}

/**
 * Eldritch Blast beams: 1 beam at L1, 2 at L5, 3 at L11, 4 at L17.
 * Same scaling as cantrip damage dice.
 */
export const eldritchBlastBeams: (characterLevel: number) => number = cantripDamageDice

/**
 * Upcast target scaling: 1 target at base level, +1 per slot level above base.
 * Used by Hold Person (base 2), Hold Monster (base 5), Blindness/Deafness (base 2), etc.
 */
export function upcastTargets(slotLevel: number, baseLevel: number): number {
  return 1 + Math.max(0, slotLevel - baseLevel)
}

/**
 * Generic cantrip damage: scaling dice of the given die size.
 * Used by Fire Bolt (d10), Sacred Flame (d8), Shocking Grasp (d8), etc.
 */
export function cantripDamage(characterLevel: number, dieSize: number): DiceDamage {
  return { dice: cantripDamageDice(characterLevel), dieSize }
}

/**
 * Standard upcast damage: baseDice at baseLevel, +1 die per slot level above base.
 * Covers the most common SRD scaling pattern (Fireball, Guiding Bolt, Spirit Guardians, etc.).
 */
export function scalingDice(baseDice: number, baseLevel: number, dieSize: number, slotLevel: number): DiceDamage {
  return { dice: baseDice + (slotLevel - baseLevel), dieSize }
}

/** Shared result for spells where the target passes the save — no condition, no special effect. */
export const SAVE_PASSED: ConditionSpellResult = { conditionApplied: null, specialEffect: null, savePassed: true }

/**
 * Generic save-or-condition: condition on failed save, null on success.
 * Used by Hold Person/Monster, Entangle, Web, Color Spray, etc.
 */
export function saveOrCondition(savePassed: boolean, condition: Condition): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : condition,
    specialEffect: null,
    savePassed
  }
}

/* eslint-enable no-magic-numbers */
