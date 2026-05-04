// Cross-class reference tables extracted from creature.qnt (non-core)
// SRD 5.2.1 class hit dice and multiclass prerequisites

import type { Ability } from "#/types.ts";
import {
  CLASS_NAMES as SHARED_CLASS_NAMES,
  type ClassName as SharedClassName,
} from "@dnd/shared/game-facts";
import {
  meetsMulticlassPrerequisite as sharedMeetsPrereq,
  canMulticlass as sharedCanMulticlass,
} from "@dnd/shared-algebras/multiclass-prerequisite-algebra";

// --- Types ---

export const CLASS_NAMES = SHARED_CLASS_NAMES;
export type ClassName = SharedClassName;

// --- Hit Dice (PHB class tables) ---

const HIT_DIE: Record<ClassName, number> = {
  barbarian: 12,
  fighter: 10,
  paladin: 10,
  ranger: 10,
  bard: 8,
  cleric: 8,
  druid: 8,
  monk: 8,
  rogue: 8,
  warlock: 8,
  sorcerer: 6,
  wizard: 6,
};

export function classHitDie(className: ClassName): number {
  return HIT_DIE[className];
}

// --- Hit Dice Remaining (per-class tracking, SRD 5.2.1 multiclass) ---

export type HitDiceRemaining = Readonly<Record<ClassName, number>>;

export const ZERO_HIT_DICE: HitDiceRemaining = Object.fromEntries(
  CLASS_NAMES.map((c) => [c, 0]),
) as HitDiceRemaining;

export function singleClassHitDice(
  className: ClassName,
  count: number,
): HitDiceRemaining {
  return { ...ZERO_HIT_DICE, [className]: count };
}

export function hitDiceFromClassLevels(
  classStates: Partial<Record<ClassName, { level: number }>>,
): HitDiceRemaining {
  const result = { ...ZERO_HIT_DICE };
  for (const c of CLASS_NAMES) {
    result[c] = classStates[c]?.level ?? 0;
  }
  return result;
}

// --- Multiclass Prerequisites (PHB Ch6) — delegated to shared-algebras ---

/** @deprecated use `meetsMulticlassPrerequisite` from shared-algebras */
export function meetsMulticlassPrereq(
  scores: Record<Ability, number>,
  className: ClassName,
): boolean {
  return sharedMeetsPrereq(scores, className);
}

/** @deprecated use `canMulticlass` from shared-algebras */
export function canMulticlass(
  scores: Record<Ability, number>,
  currentClass: ClassName,
  newClass: ClassName,
): boolean {
  return sharedCanMulticlass(scores, currentClass, newClass);
}

// --- Multiclass Proficiency Gains (SRD 5.2.1) ---
// partial proficiencies. Attacking without proficiency: no prof bonus (NOT disadvantage).

export const ARMOR_TRAININGS = ["light", "medium"] as const;
export type ArmorTraining = (typeof ARMOR_TRAININGS)[number];

export const WEAPON_TRAININGS = ["simple", "martial"] as const;
export type WeaponTraining = (typeof WEAPON_TRAININGS)[number];

export interface MulticlassProficiencyGains {
  readonly armor: ReadonlyArray<ArmorTraining>;
  readonly weapons: ReadonlyArray<WeaponTraining>;
  readonly shields: boolean;
  readonly skillChoices: number;
}

const MULTICLASS_PROFICIENCY_GAINS: Readonly<
  Record<ClassName, MulticlassProficiencyGains>
> = {
  barbarian: {
    armor: [],
    weapons: ["simple", "martial"],
    shields: true,
    skillChoices: 0,
  },
  bard: { armor: ["light"], weapons: [], shields: false, skillChoices: 1 },
  cleric: {
    armor: ["light", "medium"],
    weapons: ["simple"],
    shields: true,
    skillChoices: 0,
  },
  druid: {
    armor: ["light", "medium"],
    weapons: [],
    shields: true,
    skillChoices: 0,
  },
  fighter: {
    armor: ["light", "medium"],
    weapons: ["simple", "martial"],
    shields: true,
    skillChoices: 0,
  },
  monk: { armor: [], weapons: ["simple"], shields: false, skillChoices: 0 },
  paladin: {
    armor: ["light", "medium"],
    weapons: ["simple", "martial"],
    shields: true,
    skillChoices: 0,
  },
  ranger: {
    armor: ["light", "medium"],
    weapons: ["simple", "martial"],
    shields: true,
    skillChoices: 0,
  },
  rogue: { armor: ["light"], weapons: [], shields: false, skillChoices: 1 },
  sorcerer: { armor: [], weapons: [], shields: false, skillChoices: 0 },
  warlock: {
    armor: ["light"],
    weapons: ["simple"],
    shields: false,
    skillChoices: 0,
  },
  wizard: { armor: [], weapons: [], shields: false, skillChoices: 0 },
};

/** Proficiencies gained when multiclassing INTO the given class. */
export function multiclassProficiencies(
  className: ClassName,
): MulticlassProficiencyGains {
  return MULTICLASS_PROFICIENCY_GAINS[className];
}

/**
 * Non-proficient weapon attack: no proficiency bonus added to attack roll.
 * SRD: "If you lack proficiency with the weapon, you don't add your
 * Proficiency Bonus to the attack roll." (NOT disadvantage.)
 */
export function nonProficientAttackBonus(): 0 {
  return 0;
}
