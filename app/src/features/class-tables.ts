// Cross-class reference tables extracted from dnd.qnt (non-core)
// SRD 5.2.1 class hit dice and multiclass prerequisites

import type { Ability } from "#/types.ts"

// --- Types ---

export type ClassName =
  | "barbarian" | "bard" | "cleric" | "druid" | "fighter" | "monk"
  | "paladin" | "ranger" | "rogue" | "sorcerer" | "warlock" | "wizard"

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
}

export function classHitDie(className: ClassName): number {
  return HIT_DIE[className]
}

// --- Multiclass Prerequisites (PHB Ch6) ---

/* eslint-disable no-magic-numbers */
const MULTICLASS_THRESHOLD = 13

export function meetsMulticlassPrereq(scores: Record<Ability, number>, className: ClassName): boolean {
  const t = MULTICLASS_THRESHOLD
  switch (className) {
    case "barbarian": return scores.str >= t
    case "bard": return scores.cha >= t
    case "cleric": return scores.wis >= t
    case "druid": return scores.wis >= t
    case "fighter": return scores.str >= t || scores.dex >= t
    case "monk": return scores.dex >= t && scores.wis >= t
    case "paladin": return scores.str >= t && scores.cha >= t
    case "ranger": return scores.dex >= t && scores.wis >= t
    case "rogue": return scores.dex >= t
    case "sorcerer": return scores.cha >= t
    case "warlock": return scores.cha >= t
    case "wizard": return scores.int >= t
  }
}

/** Must meet prereqs for BOTH current and new class (PHB Ch6). */
export function canMulticlass(
  scores: Record<Ability, number>,
  currentClass: ClassName,
  newClass: ClassName,
): boolean {
  return meetsMulticlassPrereq(scores, currentClass) && meetsMulticlassPrereq(scores, newClass)
}
/* eslint-enable no-magic-numbers */
