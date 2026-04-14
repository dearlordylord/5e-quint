// Evocation spells — SRD 5.2.1
// Damage-dealing spells that channel magical energy.

import {
  battleReadyableSaveSpell,
  diceMaximum,
} from "#/features/spell-modeled-mechanics.ts";
import type {
  DefenseSpellInfo,
  DiceDamage,
  SpellDamageInfo,
} from "#/features/spell-patterns.ts";
import { cantripDamage, scalingDice } from "#/features/spell-patterns.ts";
import type { Condition, DamageType } from "#/types.ts";

/* eslint-disable no-magic-numbers */

// --- Types ---

/** Magic Missile per-dart damage descriptor. */
export interface MagicMissileDartDamage {
  readonly dieSize: number;
  readonly bonus: number;
}

export const FIRE_SHIELD_CHOICES = ["warm", "chill"] as const;
export type FireShieldChoice = (typeof FIRE_SHIELD_CHOICES)[number];

// --- Constants ---

/** Magic Missile per-dart damage: 1d4+1. */
export const MAGIC_MISSILE_DART: MagicMissileDartDamage = {
  dieSize: 4,
  bonus: 1,
};

/** Fire Shield retaliation: 2d8. */
export const FIRE_SHIELD_RETALIATION: DiceDamage = { dice: 2, dieSize: 8 };

/** Eldritch Blast: 1d10 Force per beam. */
export const ELDRITCH_BLAST_PER_BEAM: DiceDamage = { dice: 1, dieSize: 10 };

/** Ray of Frost speed reduction: 10 feet. */
export const RAY_OF_FROST_SPEED_REDUCTION = 10;

/** Chromatic Orb damage types. */
export const CHROMATIC_ORB_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
  "thunder",
] as const satisfies ReadonlyArray<DamageType>;
export type ChromaticOrbType = (typeof CHROMATIC_ORB_TYPES)[number];

/** Faerie Fire effect: can't be Invisible, attacks have Advantage. */
export const FAERIE_FIRE_EFFECT = {
  cantBeInvisible: true,
  attackAdvantage: true,
} as const;

// --- Spell Metadata ---

export const SPELL_FIREBALL: SpellDamageInfo = {
  name: "Fireball",
  level: 3,
  damageType: "fire",
  pattern: "saveForHalf",
  concentration: false,
  saveAbility: "dex",
};

export const SPELL_MAGIC_MISSILE: SpellDamageInfo = {
  name: "Magic Missile",
  level: 1,
  damageType: "force",
  pattern: "autoHit",
  concentration: false,
};

export const SPELL_SPIRITUAL_WEAPON: SpellDamageInfo = {
  name: "Spiritual Weapon",
  level: 2,
  damageType: "force",
  pattern: "attackRoll",
  concentration: true,
};

export const SPELL_FIRE_SHIELD: DefenseSpellInfo = {
  name: "Fire Shield",
  level: 4,
  concentration: false,
  castingTime: "action",
  durationDescription: "10 minutes",
};

// --- Burning Hands ---

/** Burning Hands (SRD 5.2.1): 3d6 Fire at L1, +1d6 per slot level above 1. */
export function burningHandsDamage(slotLevel: number): DiceDamage {
  return scalingDice(3, 1, 6, slotLevel);
}

// SRD 5.2.1 Descriptions-A-D.md "Burning Hands" plus UBIQUITOUS_LANGUAGE.md
// terms "Saving Throw", "Base Spell Level", and "Using a Higher-Level Spell Slot".
export const BURNING_HANDS_MECHANICS = battleReadyableSaveSpell({
  delivery: "aoe",
  baseLevel: 1,
  saveAbility: "dex",
  halfOnSuccess: true,
  damageType: "fire",
  conditionOnFail: "blinded",
  applyCondition: false,
  damageOnFailAtSlotLevel: (slotLevel) =>
    diceMaximum(burningHandsDamage(slotLevel)),
});

// --- Guiding Bolt ---

/** Guiding Bolt (SRD 5.2.1): 4d6 Radiant at L1, +1d6 per slot level above 1. */
export function guidingBoltDamage(slotLevel: number): DiceDamage {
  return scalingDice(4, 1, 6, slotLevel);
}

// --- Fireball ---

/** Fireball (SRD 5.2.1): 8d6 Fire at L3, +1d6 per slot level above 3. */
export function fireballDamage(slotLevel: number): DiceDamage {
  return scalingDice(8, 3, 6, slotLevel);
}

// SRD 5.2.1 Descriptions-E-L.md "Fireball" plus UBIQUITOUS_LANGUAGE.md
// terms "Saving Throw", "Base Spell Level", and "Using a Higher-Level Spell Slot".
export const FIREBALL_MECHANICS = battleReadyableSaveSpell({
  delivery: "aoe",
  baseLevel: SPELL_FIREBALL.level,
  saveAbility: "dex",
  halfOnSuccess: SPELL_FIREBALL.pattern === "saveForHalf",
  damageType: SPELL_FIREBALL.damageType,
  conditionOnFail: "blinded",
  applyCondition: false,
  damageOnFailAtSlotLevel: (slotLevel) =>
    diceMaximum(fireballDamage(slotLevel)),
});

// --- Magic Missile ---

/** Magic Missile (SRD 5.2.1): 3 darts at L1, +1 dart per slot level above 1. */
export function magicMissileDarts(slotLevel: number): number {
  return 3 + (slotLevel - 1);
}

// --- Spiritual Weapon ---

/** Spiritual Weapon (SRD 5.2.1): 1d8 Force at L2, +1d8 per slot level above 2. */
export function spiritualWeaponDamage(slotLevel: number): DiceDamage {
  return scalingDice(1, 2, 8, slotLevel);
}

// --- Fire Shield ---

export function fireShieldResistance(choice: FireShieldChoice): DamageType {
  return choice === "warm" ? "cold" : "fire";
}

export function fireShieldRetaliationDamageType(
  choice: FireShieldChoice,
): DamageType {
  return choice === "warm" ? "fire" : "cold";
}

// --- Chromatic Orb ---

/** Chromatic Orb (SRD 5.2.1): 3d8 at L1, +1d8 per slot level above 1. */
export function chromaticOrbDamage(slotLevel: number): DiceDamage {
  return scalingDice(3, 1, 8, slotLevel);
}

// --- Searing Smite ---

/** Searing Smite (SRD 5.2.1): slotLevel d6 Fire on hit + per turn (CON save ends). */
export function searingSmiteDamage(slotLevel: number): DiceDamage {
  return scalingDice(1, 1, 6, slotLevel);
}

// --- Vitriolic Sphere ---

/** Vitriolic Sphere initial (SRD 5.2.1): 10d4 Acid at L4, +2d4 per slot above 4. */
export function vitriolicSphereInitialDamage(slotLevel: number): DiceDamage {
  return { dice: 10 + 2 * (slotLevel - 4), dieSize: 4 };
}

/** Vitriolic Sphere delayed damage: 5d4 Acid (does not scale). */
export const VITRIOLIC_SPHERE_DELAYED: DiceDamage = { dice: 5, dieSize: 4 };

// --- Divine Smite ---

/** Divine Smite (SRD 5.2.1): 2d8 Radiant at L1, +1d8 per slot above 1. +1d8 vs Fiend/Undead. */
export function divineSmiteDamage(
  slotLevel: number,
  targetIsFiendOrUndead: boolean,
): DiceDamage {
  const baseDice = 2 + (slotLevel - 1);
  return { dice: baseDice + (targetIsFiendOrUndead ? 1 : 0), dieSize: 8 };
}

// --- Cantrips ---

/** Shocking Grasp: scaling d8 Lightning, melee spell attack, no opportunity attacks. */
export function shockingGraspDamage(characterLevel: number): DiceDamage {
  return cantripDamage(characterLevel, 8);
}

/** Sacred Flame: scaling d8 Radiant, DEX save, ignores cover. */
export function sacredFlameDamage(characterLevel: number): DiceDamage {
  return cantripDamage(characterLevel, 8);
}

/** Fire Bolt: scaling d10 Fire, ranged spell attack. */
export function fireBoltDamage(characterLevel: number): DiceDamage {
  return cantripDamage(characterLevel, 10);
}

/** Ray of Frost: scaling d8 Cold, ranged spell attack. */
export function rayOfFrostDamage(characterLevel: number): DiceDamage {
  return cantripDamage(characterLevel, 8);
}

// --- Flame Blade (L2, Bonus Action, Self, Concentration 10 min, melee spell attack) ---

/** Flame Blade (SRD 5.2.1): 3d6 Fire + mod at L2, +1d6 per slot above 2. */
export function flameBladeDamage(slotLevel: number): DiceDamage {
  return scalingDice(3, 2, 6, slotLevel);
}

// --- Moonbeam (L2, Action, 120 ft, Concentration 1 min, CON save) ---

/** Moonbeam (SRD 5.2.1): 2d10 Radiant at L2, +1d10 per slot above 2. Save for half. */
export function moonbeamDamage(slotLevel: number): DiceDamage {
  return scalingDice(2, 2, 10, slotLevel);
}

// --- Arcane Sword (L7, Action, 90 ft, Concentration 1 min, melee spell attack) ---

/** Arcane Sword (SRD 5.2.1): 4d12 Force + mod. No upcast scaling. */
export const ARCANE_SWORD_DAMAGE: DiceDamage = { dice: 4, dieSize: 12 };

// --- Divine Word (L7, Bonus Action, 30 ft, CHA save) ---

/** Divine Word HP thresholds and effects (SRD 5.2.1). */
export interface DivineWordEffect {
  readonly dies: boolean;
  readonly conditions: ReadonlyArray<Condition>;
  readonly duration: string;
}

export function divineWordEffect(currentHp: number): DivineWordEffect | null {
  if (currentHp > 50) return null;
  if (currentHp <= 20)
    return { dies: true, conditions: [], duration: "instant" };
  if (currentHp <= 30)
    return {
      dies: false,
      conditions: ["blinded", "deafened", "stunned"],
      duration: "1 hour",
    };
  if (currentHp <= 40)
    return {
      dies: false,
      conditions: ["blinded", "deafened"],
      duration: "10 minutes",
    };
  return { dies: false, conditions: ["deafened"], duration: "1 minute" };
}

/* eslint-enable no-magic-numbers */
