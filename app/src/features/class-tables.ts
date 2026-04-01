// Cross-class reference tables extracted from creature.qnt (non-core)
// SRD 5.2.1 class hit dice and multiclass prerequisites

import type { Ability } from "#/types.ts"

// --- Types ---

export type ClassName =
  | "barbarian"
  | "bard"
  | "cleric"
  | "druid"
  | "fighter"
  | "monk"
  | "paladin"
  | "ranger"
  | "rogue"
  | "sorcerer"
  | "warlock"
  | "wizard"

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
  wizard: 6
}

export function classHitDie(className: ClassName): number {
  return HIT_DIE[className]
}

// --- Multiclass Prerequisites (PHB Ch6) ---

const MULTICLASS_THRESHOLD = 13

export function meetsMulticlassPrereq(scores: Record<Ability, number>, className: ClassName): boolean {
  const t = MULTICLASS_THRESHOLD
  switch (className) {
    case "barbarian":
      return scores.str >= t
    case "bard":
      return scores.cha >= t
    case "cleric":
      return scores.wis >= t
    case "druid":
      return scores.wis >= t
    case "fighter":
      return scores.str >= t || scores.dex >= t
    case "monk":
      return scores.dex >= t && scores.wis >= t
    case "paladin":
      return scores.str >= t && scores.cha >= t
    case "ranger":
      return scores.dex >= t && scores.wis >= t
    case "rogue":
      return scores.dex >= t
    case "sorcerer":
      return scores.cha >= t
    case "warlock":
      return scores.cha >= t
    case "wizard":
      return scores.int >= t
  }
}

/** Must meet prereqs for BOTH current and new class (PHB Ch6). */
export function canMulticlass(scores: Record<Ability, number>, currentClass: ClassName, newClass: ClassName): boolean {
  return meetsMulticlassPrereq(scores, currentClass) && meetsMulticlassPrereq(scores, newClass)
}
// --- Multiclass Proficiency Gains (SRD 5.2.1) ---
// When multiclassing INTO a class (not starting class), you gain only
// partial proficiencies. Attacking without proficiency: no prof bonus (NOT disadvantage).

export type ArmorTraining = "light" | "medium"
export type WeaponTraining = "simple" | "martial"

export interface MulticlassProficiencyGains {
  readonly armor: ReadonlyArray<ArmorTraining>
  readonly weapons: ReadonlyArray<WeaponTraining>
  readonly shields: boolean
  readonly skillChoices: number
}

const MULTICLASS_PROFICIENCY_GAINS: Readonly<Record<ClassName, MulticlassProficiencyGains>> = {
  barbarian: { armor: [], weapons: ["simple", "martial"], shields: true, skillChoices: 0 },
  bard: { armor: ["light"], weapons: [], shields: false, skillChoices: 1 },
  cleric: { armor: ["light", "medium"], weapons: ["simple"], shields: true, skillChoices: 0 },
  druid: { armor: ["light", "medium"], weapons: [], shields: true, skillChoices: 0 },
  fighter: { armor: ["light", "medium"], weapons: ["simple", "martial"], shields: true, skillChoices: 0 },
  monk: { armor: [], weapons: ["simple"], shields: false, skillChoices: 0 },
  paladin: { armor: ["light", "medium"], weapons: ["simple", "martial"], shields: true, skillChoices: 0 },
  ranger: { armor: ["light", "medium"], weapons: ["simple", "martial"], shields: true, skillChoices: 0 },
  rogue: { armor: ["light"], weapons: [], shields: false, skillChoices: 1 },
  sorcerer: { armor: [], weapons: [], shields: false, skillChoices: 0 },
  warlock: { armor: ["light"], weapons: ["simple"], shields: false, skillChoices: 0 },
  wizard: { armor: [], weapons: [], shields: false, skillChoices: 0 }
}

/** Proficiencies gained when multiclassing INTO the given class. */
export function multiclassProficiencies(className: ClassName): MulticlassProficiencyGains {
  return MULTICLASS_PROFICIENCY_GAINS[className]
}

/**
 * Non-proficient weapon attack: no proficiency bonus added to attack roll.
 * SRD: "If you lack proficiency with the weapon, you don't add your
 * Proficiency Bonus to the attack roll." (NOT disadvantage.)
 */
export function nonProficientAttackBonus(): 0 {
  return 0
}
