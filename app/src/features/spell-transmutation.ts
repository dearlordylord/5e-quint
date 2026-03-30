// Transmutation spells — SRD 5.2.1
// Spells that alter matter, energy, or physical properties.

import type {
  ConditionSpellInfo,
  DefenseSpellInfo,
  DiceDamage,
  DiceDamageWithBonus,
  SpellDamageInfo
} from "#/features/spell-patterns.ts"

/* eslint-disable no-magic-numbers */

// --- Types ---

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

/** Result of applying a condition debuff spell to a single target. */
export interface ConditionSpellResult {
  readonly conditionApplied: string | null
  readonly specialEffect: string | null
  readonly savePassed: boolean
}

// --- Spell Metadata ---

export const SPELL_DISINTEGRATE: SpellDamageInfo = {
  name: "Disintegrate",
  level: 6,
  damageType: "force",
  pattern: "saveOrNothing",
  concentration: false,
  saveAbility: "dex"
}

export const BLINDNESS_DEAFNESS_INFO: ConditionSpellInfo = {
  name: "Blindness/Deafness",
  level: 2,
  concentration: false,
  saveAbility: "con",
  conditionApplied: "blinded", // or deafened, caster's choice
  durationDescription: "1 minute"
}

export const SLOW_INFO: ConditionSpellInfo = {
  name: "Slow",
  level: 3,
  concentration: true,
  saveAbility: "wis",
  conditionApplied: "special",
  durationDescription: "Concentration, up to 1 minute"
}

/** Barkskin (SRD 5.2.1): L2 Transmutation, Bonus Action. AC can't be less than 17. 1 hour. No concentration. */
export const SPELL_BARKSKIN: DefenseSpellInfo = {
  name: "Barkskin",
  level: 2,
  concentration: false,
  castingTime: "bonusAction",
  durationDescription: "1 hour"
}

// --- Disintegrate ---

/**
 * Disintegrate (SRD 5.2.1): 10d6+40 Force at L6, +3d6 per slot level above 6.
 * Save or nothing (DEX). If reduced to 0 HP, target is disintegrated.
 */
export function disintegrateDamage(slotLevel: number): DiceDamageWithBonus {
  return { dice: 10 + 3 * (slotLevel - 6), dieSize: 6, flatBonus: 40 }
}

// --- Blindness/Deafness (L2 Transmutation, CON save, Blinded or Deafened) ---

/** Number of targets for Blindness/Deafness: 1 base, +1 per slot level above 2nd. */
export function blindnessDeafnessTargets(slotLevel: number): number {
  return 1 + Math.max(0, slotLevel - 2)
}

/** Result of Blindness/Deafness on a single target. */
export function blindnessDeafnessResult(savePassed: boolean, choice: "blinded" | "deafened"): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : choice,
    specialEffect: null,
    savePassed
  }
}

// --- Slow (L3 Transmutation, WIS save, special debuffs) ---

const SLOW_AC_PENALTY = -2
const SLOW_DEX_SAVE_PENALTY = -2
const SLOW_SPELL_FAIL_CHANCE = 25

/** Maximum number of targets for Slow: always 6. */
export function slowMaxTargets(): 6 {
  return 6
}

/** Result of Slow on a single target. */
export function slowResult(savePassed: boolean): SlowResult {
  if (savePassed) {
    return {
      affected: false,
      savePassed: true,
      speedHalved: false,
      acPenalty: 0,
      dexSavePenalty: 0,
      noReactions: false,
      oneAttackOnly: false,
      spellFailChance: 0
    }
  }
  return {
    affected: true,
    savePassed: false,
    speedHalved: true,
    acPenalty: SLOW_AC_PENALTY,
    dexSavePenalty: SLOW_DEX_SAVE_PENALTY,
    noReactions: true,
    oneAttackOnly: true,
    spellFailChance: SLOW_SPELL_FAIL_CHANCE
  }
}

// --- Barkskin ---

/**
 * Barkskin (SRD 5.2.1): target has AC of 17 if its AC is lower than that.
 */
export function barkskinAC(currentAC: number): number {
  return Math.max(17, currentAC)
}

// =============================================================================
// New Transmutation spells
// =============================================================================

// --- Haste (L3, Action, 30 ft, Concentration 1 min) ---

/** Haste effects (SRD 5.2.1): doubled speed, +2 AC, advantage DEX saves, extra action. */
export interface HasteEffects {
  readonly speedMultiplier: 2
  readonly acBonus: 2
  readonly dexSaveAdvantage: true
  readonly extraAction: true
}

export function hasteEffects(): HasteEffects {
  return { speedMultiplier: 2, acBonus: 2, dexSaveAdvantage: true, extraAction: true }
}

// --- Polymorph (L4, Action, 60 ft, Concentration 1 hour, WIS save) ---

// Polymorph is modeled as a capability: target gains temp HP equal to beast form's HP,
// reverts when temp HP = 0. Implementation is context-dependent.

// --- Enlarge/Reduce (L2, Action, 30 ft, Concentration 1 min, CON save unwilling) ---

/** Enlarge (SRD 5.2.1): +1d4 to damage rolls. */
export function enlargeDamageBonus(): DiceDamage {
  return { dice: 1, dieSize: 4 }
}

/** Reduce (SRD 5.2.1): -1d4 from damage rolls (minimum 1 damage). */
export function reduceDamageReduction(): DiceDamage {
  return { dice: 1, dieSize: 4 }
}

// --- Flesh to Stone (L6, Action, 60 ft, Concentration 1 min, CON save) ---

/** Flesh to Stone (SRD 5.2.1): 3 failed saves = Petrified, 3 successes = spell ends. */
export interface FleshToStoneState {
  readonly failures: number
  readonly successes: number
  readonly petrified: boolean
  readonly spellEnded: boolean
}

export function fleshToStoneProgress(failures: number, successes: number): FleshToStoneState {
  return {
    failures,
    successes,
    petrified: failures >= 3,
    spellEnded: successes >= 3
  }
}

// --- Enhance Ability (L2, Action, Touch, Concentration 1 hour) ---

/** Enhance Ability (SRD 5.2.1): advantage on checks for chosen ability. Targets scale with upcast. */
export function enhanceAbilityTargets(slotLevel: number): number {
  return 1 + (slotLevel - 2)
}

// --- Magic Weapon (L2, Bonus Action, Touch, 1 hour, no concentration) ---

/** Magic Weapon (SRD 5.2.1): +1 at L2, +2 at L3-L5, +3 at L6+. */
export function magicWeaponBonus(slotLevel: number): number {
  if (slotLevel <= 2) return 1
  if (slotLevel <= 5) return 2
  return 3
}

// --- Divine Favor (L1, Bonus Action, Self, 1 minute) ---

/** Divine Favor (SRD 5.2.1): +1d4 Radiant damage on weapon attacks. */
export function divineFavorDamage(): DiceDamage {
  return { dice: 1, dieSize: 4 }
}

// --- Regenerate (L7, 1 minute, Touch, 1 hour) ---

/** Regenerate (SRD 5.2.1): 4d8 + 15 immediate, then 1 HP/round. */
export function regenerateInitialHeal(): DiceDamageWithBonus {
  return { dice: 4, dieSize: 8, flatBonus: 15 }
}

/** Regenerate per-round healing. */
export function regeneratePerRoundHeal(): 1 {
  return 1
}

/* eslint-enable no-magic-numbers */
