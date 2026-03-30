// Necromancy spells — SRD 5.2.1
// Life-draining and undeath spells.

import type { DiceDamage, DiceDamageWithBonus, SpellDamageInfo } from "#/features/spell-patterns.ts"
import { cantripDamage } from "#/features/spell-patterns.ts"

/* eslint-disable no-magic-numbers */

// --- Types ---

/** Vampiric Touch damage descriptor including heal fraction. */
export interface VampiricTouchDamageInfo {
  readonly dice: number
  readonly dieSize: number
  readonly healFraction: number
}

// --- Constants ---

/** Revivify / Raise Dead: target returns with 1 HP. */
export const REVIVE_HP = 1

/** Raise Dead / Resurrection: -4 D20 penalty (reduces by 1 per Long Rest). */
export const RESURRECTION_D20_PENALTY = -4

/** Revivify: dead ≤ 1 minute. */
export const REVIVIFY_MAX_MINUTES_DEAD = 1

/** Raise Dead: dead ≤ 10 days. */
export const RAISE_DEAD_MAX_DAYS_DEAD = 10

/** Ray of Enfeeblement damage reduction: -1d8 from all damage rolls. */
export const RAY_OF_ENFEEBLEMENT_REDUCTION: DiceDamage = { dice: 1, dieSize: 8 }

/** Bestow Curse extra damage (option 4): 1d8 Necrotic. */
export const BESTOW_CURSE_EXTRA_DAMAGE: DiceDamage = { dice: 1, dieSize: 8 }

/** Bestow Curse options (SRD 5.2.1). */
export const BESTOW_CURSE_OPTIONS = ["abilityDisadvantage", "attackDisadvantage", "wastedTurn", "extraDamage"] as const
export type BestowCurseOption = (typeof BESTOW_CURSE_OPTIONS)[number]

// --- Spell Metadata ---

export const SPELL_VAMPIRIC_TOUCH: SpellDamageInfo = {
  name: "Vampiric Touch",
  level: 3,
  damageType: "necrotic",
  pattern: "attackRoll",
  concentration: true
}

// --- Vampiric Touch ---

/** Vampiric Touch (SRD 5.2.1): 3d6 Necrotic at L3, +1d6 per slot level above 3. Heal = half damage. */
export function vampiricTouchDamage(slotLevel: number): VampiricTouchDamageInfo {
  return { dice: 3 + (slotLevel - 3), dieSize: 6, healFraction: 0.5 }
}

/** Vampiric Touch heal: floor(damageDealt / 2). */
export function vampiricTouchHeal(damageDealt: number): number {
  return Math.floor(damageDealt / 2)
}

// --- False Life ---

/** False Life (SRD 5.2.1): 2d4 + 4 temp HP at L1, +5 per slot level above 1. */
export function falseLifeTempHp(slotLevel: number): DiceDamageWithBonus {
  return { dice: 2, dieSize: 4, flatBonus: 4 + 5 * (slotLevel - 1) }
}

// --- Chill Touch ---

/** Chill Touch (SRD 5.2.1): scaling d10 Necrotic, target can't regain HP. */
export function chillTouchDamage(characterLevel: number): DiceDamage {
  return cantripDamage(characterLevel, 10)
}

// --- Spare the Dying ---

/** Spare the Dying range scaling (SRD 5.2.1): 15 ft, doubles at L5/L11/L17. */
export function spareTheDyingRange(characterLevel: number): number {
  if (characterLevel < 5) return 15
  if (characterLevel < 11) return 30
  if (characterLevel < 17) return 60
  return 120
}

// --- Bestow Curse ---

/** Whether Bestow Curse requires concentration at the given slot level. */
export function bestowCurseRequiresConcentration(slotLevel: number): boolean {
  return slotLevel <= 4
}

// --- Eyebite (L6, Action, Self/60 ft, Concentration 1 min, WIS save) ---

/** Eyebite effect choices (SRD 5.2.1). */
export const EYEBITE_CHOICES = ["asleep", "panicked", "sickened"] as const
export type EyebiteChoice = (typeof EYEBITE_CHOICES)[number]

/** Map Eyebite choice to the condition applied on failed save. */
export function eyebiteCondition(choice: EyebiteChoice): "unconscious" | "frightened" | "poisoned" {
  if (choice === "asleep") return "unconscious"
  if (choice === "panicked") return "frightened"
  return "poisoned"
}

/* eslint-enable no-magic-numbers */
