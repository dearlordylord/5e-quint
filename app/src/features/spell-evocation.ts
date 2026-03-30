// Evocation spells — SRD 5.2.1
// Damage-dealing spells that channel magical energy.

import type { DefenseSpellInfo, DiceDamage, SpellDamageInfo } from "#/features/spell-patterns.ts"
import { cantripDamageDice } from "#/features/spell-patterns.ts"
import type { DamageType } from "#/types.ts"

/* eslint-disable no-magic-numbers */

// --- Types ---

/** Magic Missile per-dart damage descriptor. */
export interface MagicMissileDartDamage {
  readonly dieSize: number
  readonly bonus: number
}

export const FIRE_SHIELD_CHOICES = ["warm", "chill"] as const
/** Fire Shield warm/chill choice. */
export type FireShieldChoice = (typeof FIRE_SHIELD_CHOICES)[number]

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

export const SPELL_SPIRITUAL_WEAPON: SpellDamageInfo = {
  name: "Spiritual Weapon",
  level: 2,
  damageType: "force",
  pattern: "attackRoll",
  concentration: true
}

/** Fire Shield (SRD 5.2.1): L4 Evocation, Action. 10 min. Warm or chill shield. */
export const SPELL_FIRE_SHIELD: DefenseSpellInfo = {
  name: "Fire Shield",
  level: 4,
  concentration: false,
  castingTime: "action",
  durationDescription: "10 minutes"
}

// --- Fireball ---

/**
 * Fireball (SRD 5.2.1): 8d6 Fire at L3, +1d6 per slot level above 3.
 */
export function fireballDamage(slotLevel: number): DiceDamage {
  return { dice: 8 + (slotLevel - 3), dieSize: 6 }
}

// --- Magic Missile ---

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

// --- Spiritual Weapon ---

/**
 * Spiritual Weapon (SRD 5.2.1): 1d8 Force at L2, +1d8 per slot level above 2.
 */
export function spiritualWeaponDamage(slotLevel: number): DiceDamage {
  return { dice: 1 + (slotLevel - 2), dieSize: 8 }
}

// --- Fire Shield ---

/**
 * Fire Shield resistance (SRD 5.2.1):
 * Warm shield grants Cold resistance; Chill shield grants Fire resistance.
 */
export function fireShieldResistance(choice: FireShieldChoice): DamageType {
  return choice === "warm" ? "cold" : "fire"
}

/**
 * Fire Shield retaliation damage (SRD 5.2.1): 2d8.
 */
export function fireShieldRetaliationDamage(): DiceDamage {
  return { dice: 2, dieSize: 8 }
}

/**
 * Fire Shield retaliation damage type (SRD 5.2.1):
 * Warm shield deals Fire damage; Chill shield deals Cold damage.
 */
export function fireShieldRetaliationDamageType(choice: FireShieldChoice): DamageType {
  return choice === "warm" ? "fire" : "cold"
}

// --- Repeatable Attack Spells ---

/**
 * Returns true if a spell with an active effect can repeat its attack this turn.
 */
export function canRepeatSpellAttack(_spellId: string, hasActiveEffect: boolean): boolean {
  return hasActiveEffect
}

// =============================================================================
// New Evocation spells — Damage
// =============================================================================

// --- Chromatic Orb (L1, Action, 90 ft, ranged spell attack) ---

/** Damage types choosable for Chromatic Orb. */
export const CHROMATIC_ORB_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
  "thunder"
] as const satisfies ReadonlyArray<DamageType>
export type ChromaticOrbType = (typeof CHROMATIC_ORB_TYPES)[number]

/** Chromatic Orb (SRD 5.2.1): 3d8 at L1, +1d8 per slot level above 1. */
export function chromaticOrbDamage(slotLevel: number): DiceDamage {
  return { dice: 3 + (slotLevel - 1), dieSize: 8 }
}

/** Max leaps for Chromatic Orb: equal to slot level; base L1 = 1 (but requires 2+ matching dice). */
export function chromaticOrbMaxLeaps(slotLevel: number): number {
  return slotLevel
}

// --- Searing Smite (L1, Bonus Action, Self, no concentration, 1 minute) ---

/** Searing Smite (SRD 5.2.1): slotLevel d6 Fire on hit + slotLevel d6 per turn (CON save ends). */
export function searingSmiteDamage(slotLevel: number): DiceDamage {
  return { dice: slotLevel, dieSize: 6 }
}

// --- Vitriolic Sphere (L4, Action, 150 ft, DEX save) ---

/** Vitriolic Sphere initial (SRD 5.2.1): 10d4 Acid at L4, +2d4 per slot above 4. */
export function vitriolicSphereInitialDamage(slotLevel: number): DiceDamage {
  return { dice: 10 + 2 * (slotLevel - 4), dieSize: 4 }
}

/** Vitriolic Sphere delayed damage (SRD 5.2.1): 5d4 Acid (does not scale). */
export function vitriolicSphereDelayedDamage(): DiceDamage {
  return { dice: 5, dieSize: 4 }
}

// --- Divine Smite (L1, Bonus Action, Self, instantaneous) ---

/** Divine Smite (SRD 5.2.1): 2d8 Radiant at L1, +1d8 per slot above 1. +1d8 vs Fiend/Undead. */
export function divineSmiteDamage(slotLevel: number, targetIsFiendOrUndead: boolean): DiceDamage {
  const baseDice = 2 + (slotLevel - 1)
  return { dice: baseDice + (targetIsFiendOrUndead ? 1 : 0), dieSize: 8 }
}

// --- Cantrips ---

/** Shocking Grasp (SRD 5.2.1): scaling d8 Lightning, melee spell attack, no opportunity attacks. */
export function shockingGraspDamage(characterLevel: number): DiceDamage {
  return { dice: cantripDamageDice(characterLevel), dieSize: 8 }
}

/** Sacred Flame (SRD 5.2.1): scaling d8 Radiant, DEX save, ignores cover. */
export function sacredFlameDamage(characterLevel: number): DiceDamage {
  return { dice: cantripDamageDice(characterLevel), dieSize: 8 }
}

/** Fire Bolt (SRD 5.2.1): scaling d10 Fire, ranged spell attack. */
export function fireBoltDamage(characterLevel: number): DiceDamage {
  return { dice: cantripDamageDice(characterLevel), dieSize: 10 }
}

/** Ray of Frost (SRD 5.2.1): scaling d8 Cold, ranged spell attack, -10 speed. */
export function rayOfFrostDamage(characterLevel: number): DiceDamage {
  return { dice: cantripDamageDice(characterLevel), dieSize: 8 }
}

/** Ray of Frost speed reduction (SRD 5.2.1): 10 feet until start of caster's next turn. */
export function rayOfFrostSpeedReduction(): 10 {
  return 10
}

/** Eldritch Blast (SRD 5.2.1): 1d10 Force per beam, beams scale at L5/L11/L17. */
export function eldritchBlastDamagePerBeam(): DiceDamage {
  return { dice: 1, dieSize: 10 }
}

// --- Faerie Fire (L1, Action, 60 ft, Concentration 1 minute, DEX save) ---

/** Faerie Fire (SRD 5.2.1): no damage. Outlined creatures can't be Invisible; attacks have Advantage. */
export function faerieFireActive(): { readonly cantBeInvisible: true; readonly attackAdvantage: true } {
  return { cantBeInvisible: true, attackAdvantage: true }
}

/* eslint-enable no-magic-numbers */
