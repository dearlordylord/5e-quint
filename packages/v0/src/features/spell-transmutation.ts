// Transmutation spells — SRD 5.2.1
// Spells that alter matter, energy, or physical properties.

import type {
  ConditionSpellInfo,
  ConditionSpellResult,
  DefenseSpellInfo,
  DiceDamage,
  DiceDamageWithBonus,
  SpellDamageInfo,
} from "#/features/spell-patterns.ts";
import {
  saveOrCondition,
  scalingDice,
  upcastTargets,
} from "#/features/spell-patterns.ts";

/* eslint-disable no-magic-numbers */

// --- Types ---

/** Slow-specific result with individual effect fields per SRD 5.2.1. */
export interface SlowResult {
  readonly affected: boolean;
  readonly savePassed: boolean;
  readonly speedHalved: boolean;
  readonly acPenalty: number;
  readonly dexSavePenalty: number;
  readonly noReactions: boolean;
  readonly oneAttackOnly: boolean;
  readonly spellFailChance: number;
}

/** Haste effects (SRD 5.2.1). */
export interface HasteEffects {
  readonly speedMultiplier: 2;
  readonly acBonus: 2;
  readonly dexSaveAdvantage: true;
  readonly extraAction: true;
}

/** Flesh to Stone progressive petrification state. */
export interface FleshToStoneState {
  readonly failures: number;
  readonly successes: number;
  readonly petrified: boolean;
  readonly spellEnded: boolean;
}

// --- Constants ---

export const SLOW_MAX_TARGETS = 6;

/** Enlarge: +1d4 to damage rolls. Reduce: -1d4 (minimum 1). */
export const ENLARGE_REDUCE_DICE: DiceDamage = { dice: 1, dieSize: 4 };

/** Divine Favor: +1d4 Radiant on weapon attacks. */
export const DIVINE_FAVOR_DAMAGE: DiceDamage = { dice: 1, dieSize: 4 };

/** Regenerate per-round healing: 1 HP. */
export const REGENERATE_PER_ROUND = 1;

export const HASTE_EFFECTS: HasteEffects = {
  speedMultiplier: 2,
  acBonus: 2,
  dexSaveAdvantage: true,
  extraAction: true,
};

const SLOW_SAVED: SlowResult = {
  affected: false,
  savePassed: true,
  speedHalved: false,
  acPenalty: 0,
  dexSavePenalty: 0,
  noReactions: false,
  oneAttackOnly: false,
  spellFailChance: 0,
};

const SLOW_FAILED: SlowResult = {
  affected: true,
  savePassed: false,
  speedHalved: true,
  acPenalty: -2,
  dexSavePenalty: -2,
  noReactions: true,
  oneAttackOnly: true,
  spellFailChance: 25,
};

// --- Spell Metadata ---

export const SPELL_DISINTEGRATE: SpellDamageInfo = {
  name: "Disintegrate",
  level: 6,
  damageType: "force",
  pattern: "saveOrNothing",
  concentration: false,
  saveAbility: "dex",
};

export const BLINDNESS_DEAFNESS_INFO: ConditionSpellInfo = {
  name: "Blindness/Deafness",
  level: 2,
  concentration: false,
  saveAbility: "con",
  conditionApplied: "blinded",
  durationDescription: "1 minute",
};

export const SLOW_INFO: ConditionSpellInfo = {
  name: "Slow",
  level: 3,
  concentration: true,
  saveAbility: "wis",
  conditionApplied: "special",
  durationDescription: "Concentration, up to 1 minute",
};

export const SPELL_BARKSKIN: DefenseSpellInfo = {
  name: "Barkskin",
  level: 2,
  concentration: false,
  castingTime: "bonusAction",
  durationDescription: "1 hour",
};

// --- Disintegrate ---

/** Disintegrate (SRD 5.2.1): 10d6+40 Force at L6, +3d6 per slot level above 6. */
export function disintegrateDamage(slotLevel: number): DiceDamageWithBonus {
  return { dice: 10 + 3 * (slotLevel - 6), dieSize: 6, flatBonus: 40 };
}

// --- Blindness/Deafness ---

/** Number of targets for Blindness/Deafness: 1 base, +1 per slot level above 2nd. */
export function blindnessDeafnessTargets(slotLevel: number): number {
  return upcastTargets(slotLevel, 2);
}

/** Result of Blindness/Deafness on a single target. */
export const blindnessDeafnessResult: (
  savePassed: boolean,
  choice: "blinded" | "deafened",
) => ConditionSpellResult = saveOrCondition;

// --- Slow ---

export function slowResult(savePassed: boolean): SlowResult {
  return savePassed ? SLOW_SAVED : SLOW_FAILED;
}

// --- Barkskin ---

export function barkskinAC(currentAC: number): number {
  return Math.max(17, currentAC);
}

// --- Enlarge/Reduce (shared constant ENLARGE_REDUCE_DICE) ---

// --- Flesh to Stone ---

export function fleshToStoneProgress(
  failures: number,
  successes: number,
): FleshToStoneState {
  return {
    failures,
    successes,
    petrified: failures >= 3,
    spellEnded: successes >= 3,
  };
}

// --- Enhance Ability ---

export function enhanceAbilityTargets(slotLevel: number): number {
  return upcastTargets(slotLevel, 2);
}

// --- Magic Weapon ---

/** Magic Weapon (SRD 5.2.1): +1 at L2, +2 at L3-L5, +3 at L6+. */
export function magicWeaponBonus(slotLevel: number): number {
  if (slotLevel <= 2) return 1;
  if (slotLevel <= 5) return 2;
  return 3;
}

// --- Regenerate ---

/** Regenerate (SRD 5.2.1): 4d8 + 15 immediate. */
export const REGENERATE_INITIAL_HEAL: DiceDamageWithBonus = {
  dice: 4,
  dieSize: 8,
  flatBonus: 15,
};

// --- Heat Metal (L2, Action, 60 ft, Concentration 1 min, CON save) ---

/** Heat Metal (SRD 5.2.1): 2d8 Fire at L2, +1d8 per slot above 2. Repeatable as Bonus Action. */
export function heatMetalDamage(slotLevel: number): DiceDamage {
  return scalingDice(2, 2, 8, slotLevel);
}

// --- Shining Smite (L2, Bonus Action, Self, Concentration 1 min) ---

/** Shining Smite (SRD 5.2.1): +2d6 Radiant at L2, +1d6 per slot above 2. Target sheds light, can't be Invisible. */
export function shiningSmiteDamage(slotLevel: number): DiceDamage {
  return scalingDice(2, 2, 6, slotLevel);
}

/* eslint-enable no-magic-numbers */
