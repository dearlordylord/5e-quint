// Shared spell damage/effect patterns — technical helpers used across school files.
// SRD 5.2.1 spells organized by school; this file provides the common mechanics.
//
// Note: existing spell-damage.ts, spell-conditions.ts, spell-defense.ts contain
// spells from the initial implementation. New spells go into school-based files
// (spell-evocation.ts, spell-abjuration.ts, etc.) importing from here.

import type { Ability, DamageType } from "#/types.ts"

// =============================================================================
// Types
// =============================================================================

/** Damage pattern used by a spell. */
export type SpellDamagePattern = "saveForHalf" | "attackRoll" | "autoHit" | "saveOrNothing"

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
  readonly conditionApplied: string
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

/* eslint-enable no-magic-numbers */
