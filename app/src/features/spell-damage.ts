import type { Ability, DamageType } from "#/types.ts"

// --- Types ---

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

/** Vampiric Touch damage descriptor including heal fraction. */
export interface VampiricTouchDamageInfo {
  readonly dice: number
  readonly dieSize: number
  readonly healFraction: number
}

/** Magic Missile per-dart damage descriptor. */
export interface MagicMissileDartDamage {
  readonly dieSize: number
  readonly bonus: number
}

/** Counterspell check result (SRD 5.2.1: target makes CON save). */
export interface CounterspellResult {
  readonly autoSuccess: boolean
  readonly requiresSave: boolean
}

// --- Spell Metadata ---

export const SPELL_FIREBALL: SpellDamageInfo = {
  name: "Fireball",
  level: 3,
  damageType: "fire",
  pattern: "saveForHalf",
  concentration: false,
  saveAbility: "dex"
}

export const SPELL_MAGIC_MISSILE: SpellDamageInfo = {
  name: "Magic Missile",
  level: 1,
  damageType: "force",
  pattern: "autoHit",
  concentration: false
}

export const SPELL_VAMPIRIC_TOUCH: SpellDamageInfo = {
  name: "Vampiric Touch",
  level: 3,
  damageType: "necrotic",
  pattern: "attackRoll",
  concentration: true
}

export const SPELL_SPIRITUAL_WEAPON: SpellDamageInfo = {
  name: "Spiritual Weapon",
  level: 2,
  damageType: "force",
  pattern: "attackRoll",
  concentration: true
}

export const SPELL_SPIRIT_GUARDIANS: SpellDamageInfo = {
  name: "Spirit Guardians",
  level: 3,
  damageType: "radiant",
  pattern: "saveForHalf",
  concentration: true,
  saveAbility: "wis"
}

export const SPELL_COUNTERSPELL: SpellDamageInfo = {
  name: "Counterspell",
  level: 3,
  damageType: "force", // no damage dealt, but type-complete
  pattern: "saveOrNothing",
  concentration: false,
  saveAbility: "con"
}

export const SPELL_DISINTEGRATE: SpellDamageInfo = {
  name: "Disintegrate",
  level: 6,
  damageType: "force",
  pattern: "saveOrNothing",
  concentration: false,
  saveAbility: "dex"
}

// --- Core Damage Pattern Functions ---

/**
 * Save-for-half pattern (SRD 5.2.1): full damage on failed save,
 * floor(damage/2) on successful save.
 * Used by: Fireball, Lightning Bolt, Cone of Cold, Spirit Guardians.
 */
export function saveForHalf(totalDamage: number, savePassed: boolean): number {
  if (savePassed) return Math.floor(totalDamage / 2)
  return totalDamage
}

/**
 * Attack roll pattern: damage on hit, 0 on miss.
 * Used by: Spiritual Weapon, Vampiric Touch (melee spell attacks).
 */
export function attackRollDamage(hit: boolean, totalDamage: number): number {
  if (hit) return totalDamage
  return 0
}

/**
 * Auto-hit pattern: total damage = darts * damagePerDart.
 * Used by: Magic Missile (no attack roll, no save).
 */
export function autoHitDamage(darts: number, damagePerDart: number): number {
  return darts * damagePerDart
}

/**
 * Save-or-nothing pattern (SRD 5.2.1): full damage on failed save,
 * 0 on successful save.
 * Used by: Disintegrate. If reduced to 0 HP, target is disintegrated.
 */
export function saveOrNothing(totalDamage: number, savePassed: boolean): number {
  if (savePassed) return 0
  return totalDamage
}

// --- Per-Spell Scaling Functions ---

/**
 * Fireball (SRD 5.2.1): 8d6 Fire at L3, +1d6 per slot level above 3.
 */
export function fireballDamage(slotLevel: number): DiceDamage {
  return { dice: 8 + (slotLevel - 3), dieSize: 6 }
}

/**
 * Magic Missile (SRD 5.2.1): 3 darts at L1, +1 dart per slot level above 1.
 */
export function magicMissileDarts(slotLevel: number): number {
  return 3 + (slotLevel - 1)
}

/**
 * Magic Missile per-dart damage (SRD 5.2.1): always 1d4+1 per dart.
 */
export function magicMissileDamagePerDart(): MagicMissileDartDamage {
  return { dieSize: 4, bonus: 1 }
}

/**
 * Vampiric Touch (SRD 5.2.1): 3d6 Necrotic at L3, +1d6 per slot level above 3.
 * Caster regains HP equal to half the Necrotic damage dealt.
 */
export function vampiricTouchDamage(slotLevel: number): VampiricTouchDamageInfo {
  return { dice: 3 + (slotLevel - 3), dieSize: 6, healFraction: 0.5 }
}

/**
 * Vampiric Touch heal (SRD 5.2.1): floor(damageDealt / 2).
 */
export function vampiricTouchHeal(damageDealt: number): number {
  return Math.floor(damageDealt / 2)
}

/**
 * Spiritual Weapon (SRD 5.2.1): 1d8 Force at L2, +1d8 per slot level above 2.
 * i.e. L2→1d8, L3→2d8, L4→3d8, L5→4d8.
 */
export function spiritualWeaponDamage(slotLevel: number): DiceDamage {
  return { dice: 1 + (slotLevel - 2), dieSize: 8 }
}

/**
 * Spirit Guardians (SRD 5.2.1): 3d8 Radiant/Necrotic at L3, +1d8 per slot level above 3.
 * Save for half (WIS).
 */
export function spiritGuardiansDamage(slotLevel: number): DiceDamage {
  return { dice: 3 + (slotLevel - 3), dieSize: 8 }
}

/**
 * Counterspell (SRD 5.2.1): target makes a CON save. On fail, spell is interrupted.
 * If counterspell slot >= target spell level, the spell is automatically interrupted
 * (no save required).
 *
 * Using a Higher-Level Spell Slot: the spell is automatically interrupted if the
 * Counterspell's slot level >= the target spell's level.
 */
export function counterspellCheck(targetSpellLevel: number, counterSpellSlotLevel: number): CounterspellResult {
  return {
    autoSuccess: counterSpellSlotLevel >= targetSpellLevel,
    requiresSave: counterSpellSlotLevel < targetSpellLevel
  }
}

/**
 * Disintegrate (SRD 5.2.1): 10d6+40 Force at L6, +3d6 per slot level above 6.
 * Save or nothing (DEX). If reduced to 0 HP, target is disintegrated.
 */
export function disintegrateDamage(slotLevel: number): DiceDamageWithBonus {
  return { dice: 10 + 3 * (slotLevel - 6), dieSize: 6, flatBonus: 40 }
}

// --- Repeatable Attack Spells ---

/**
 * Returns true if a spell with an active effect can repeat its attack this turn.
 * Caller-managed: the effect lifecycle tracks duration externally.
 */
export function canRepeatSpellAttack(_spellId: string, hasActiveEffect: boolean): boolean {
  return hasActiveEffect
}
