// Necromancy spells — SRD 5.2.1
// Life-draining and undeath spells.

import type { DiceDamage, DiceDamageWithBonus, SpellDamageInfo } from "#/features/spell-patterns.ts"
import { cantripDamageDice } from "#/features/spell-patterns.ts"

/* eslint-disable no-magic-numbers */

// --- Types ---

/** Vampiric Touch damage descriptor including heal fraction. */
export interface VampiricTouchDamageInfo {
  readonly dice: number
  readonly dieSize: number
  readonly healFraction: number
}

// --- Spell Metadata ---

export const SPELL_VAMPIRIC_TOUCH: SpellDamageInfo = {
  name: "Vampiric Touch",
  level: 3,
  damageType: "necrotic",
  pattern: "attackRoll",
  concentration: true
}

// --- Vampiric Touch ---

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

// =============================================================================
// New Necromancy spells
// =============================================================================

// --- False Life (L1, Action, Self, instantaneous) ---

/** False Life (SRD 5.2.1): 2d4 + 4 temp HP at L1, +5 per slot level above 1. */
export function falseLifeTempHp(slotLevel: number): DiceDamageWithBonus {
  return { dice: 2, dieSize: 4, flatBonus: 4 + 5 * (slotLevel - 1) }
}

// --- Revivify (L3, Action, Touch, 300 GP diamond consumed) ---

/** Revivify (SRD 5.2.1): target returns with 1 HP. Dead ≤ 1 minute. */
export function revivifyHp(): 1 {
  return 1
}

/** Max time dead for Revivify: 1 minute. */
export function revivifyMaxMinutesDead(): 1 {
  return 1
}

// --- Raise Dead (L5, 1 hour, Touch, 500 GP diamond consumed) ---

/** Raise Dead (SRD 5.2.1): returns with 1 HP, -4 D20 penalty (reduces by 1/Long Rest). */
export function raiseDeadHp(): 1 {
  return 1
}

export function raiseDeadD20Penalty(): -4 {
  return -4
}

/** Max days dead for Raise Dead: 10. */
export function raiseDeadMaxDaysDead(): 10 {
  return 10
}

// --- Resurrection (L7, 1 hour, Touch, 1000 GP diamond consumed) ---

/** Resurrection (SRD 5.2.1): full HP, -4 D20 penalty. Dead ≤ 100 years. */
export function resurrectionD20Penalty(): -4 {
  return -4
}

// --- True Resurrection (L9, 1 hour, Touch, 25000 GP diamonds consumed) ---

/** True Resurrection (SRD 5.2.1): full HP, no penalty. Dead ≤ 200 years. Can create new body. */
// No specific functions needed beyond capability flag.

// --- Chill Touch (Cantrip, Action, Touch, melee spell attack) ---

/** Chill Touch (SRD 5.2.1): scaling d10 Necrotic, target can't regain HP until end of your next turn. */
export function chillTouchDamage(characterLevel: number): DiceDamage {
  return { dice: cantripDamageDice(characterLevel), dieSize: 10 }
}

// --- Spare the Dying (Cantrip, Action, 15 ft) ---

/** Spare the Dying range scaling (SRD 5.2.1): 15 ft base, doubles at L5/L11/L17. */
export function spareTheDyingRange(characterLevel: number): number {
  if (characterLevel < 5) return 15
  if (characterLevel < 11) return 30
  if (characterLevel < 17) return 60
  return 120
}

// --- Ray of Enfeeblement (L2, Action, 60 ft, Concentration 1 min, CON save) ---

/** Ray of Enfeeblement damage reduction on failed save (SRD 5.2.1): -1d8 from all damage rolls. */
export function rayOfEnfeeblementDamageReduction(): DiceDamage {
  return { dice: 1, dieSize: 8 }
}

// --- Bestow Curse (L3, Action, Touch, WIS save) ---

/** Bestow Curse options (SRD 5.2.1). */
export const BESTOW_CURSE_OPTIONS = ["abilityDisadvantage", "attackDisadvantage", "wastedTurn", "extraDamage"] as const

export type BestowCurseOption = (typeof BESTOW_CURSE_OPTIONS)[number]

/** Extra damage from Bestow Curse option 4: 1d8 Necrotic. */
export function bestowCurseExtraDamage(): DiceDamage {
  return { dice: 1, dieSize: 8 }
}

/** Whether Bestow Curse requires concentration at the given slot level. */
export function bestowCurseRequiresConcentration(slotLevel: number): boolean {
  return slotLevel <= 4
}

/* eslint-enable no-magic-numbers */
