// Ranger class features — SRD 5.2.1
// TS-only: target-relative, multi-creature, and capability flags —
// no state transitions trackable in single-creature Quint model.

// --- Constants ---

const DEFT_EXPLORER_LEVEL = 2
const ROVING_LEVEL = 6
const ROVING_SPEED_BONUS = 10
const RANGER_EXPERTISE_LEVEL = 9
const TIRELESS_LEVEL = 10
const RELENTLESS_HUNTER_LEVEL = 13
const NATURES_VEIL_LEVEL = 14
const PRECISE_HUNTER_LEVEL = 17
const FERAL_SENSES_LEVEL = 18
const FOE_SLAYER_LEVEL = 20
const HUNTERS_MARK_BASE_DIE = 6
const HUNTERS_MARK_FOE_SLAYER_DIE = 10
const HUNTER_SUBCLASS_LEVEL = 3
const SUPERIOR_HUNTERS_PREY_LEVEL = 11
const SUPERIOR_HUNTERS_DEFENSE_LEVEL = 15
const COLOSSUS_SLAYER_DIE = 8

// =============================================================================
// Favored Enemy (Level 1)
//
// SRD: "You always have Hunter's Mark prepared. You can cast it [N] times
// without expending a spell slot... regain all expended uses on Long Rest."
// =============================================================================

/** Free Hunter's Mark casts per long rest (from Favored Enemy column). */
export function favoredEnemyFreeUses(rangerLevel: number): number {
  if (rangerLevel <= 0) return 0
  if (rangerLevel < 5) return 2
  if (rangerLevel < 9) return 3
  if (rangerLevel < 13) return 4
  if (rangerLevel < 17) return 5
  return 6
}

// =============================================================================
// Deft Explorer (Level 2) — Expertise in 1 skill + 2 languages
// =============================================================================

export function hasDeftExplorer(rangerLevel: number): boolean {
  return rangerLevel >= DEFT_EXPLORER_LEVEL
}

// =============================================================================
// Roving (Level 6)
//
// SRD: "Your Speed increases by 10 feet while you aren't wearing Heavy armor.
// You also have a Climb Speed and a Swim Speed equal to your Speed."
// =============================================================================

export function rovingSpeedBonus(rangerLevel: number, isHeavyArmor: boolean): number {
  if (rangerLevel < ROVING_LEVEL || isHeavyArmor) return 0
  return ROVING_SPEED_BONUS
}

function rovingExtraSpeed(rangerLevel: number, walkSpeed: number): number {
  return rangerLevel >= ROVING_LEVEL ? walkSpeed : 0
}

export const rovingClimbSpeed: (rangerLevel: number, walkSpeed: number) => number = rovingExtraSpeed
export const rovingSwimSpeed: (rangerLevel: number, walkSpeed: number) => number = rovingExtraSpeed

// =============================================================================
// Expertise (Level 9) — 2 more skills
// =============================================================================

export function hasRangerExpertise(rangerLevel: number): boolean {
  return rangerLevel >= RANGER_EXPERTISE_LEVEL
}

// =============================================================================
// Tireless (Level 10)
//
// SRD: "As a Magic action, you can give yourself a number of Temporary Hit
// Points equal to 1d8 plus your Wisdom modifier (minimum of 1)."
// Uses = WIS mod (min 1)/LR. Short rest reduces exhaustion by 1.
// =============================================================================

export function canUseTireless(rangerLevel: number, tirelessCharges: number): boolean {
  return rangerLevel >= TIRELESS_LEVEL && tirelessCharges > 0
}

export function tirelessTempHp(d8Roll: number, wisMod: number): number {
  return d8Roll + Math.max(1, wisMod)
}

export function tirelessMaxCharges(wisMod: number): number {
  return Math.max(1, wisMod)
}

// =============================================================================
// Relentless Hunter (Level 13)
//
// SRD: "Taking damage can't break your Concentration on Hunter's Mark."
// =============================================================================

export function hasRelentlessHunter(rangerLevel: number): boolean {
  return rangerLevel >= RELENTLESS_HUNTER_LEVEL
}

// =============================================================================
// Nature's Veil (Level 14)
//
// SRD: "As a Bonus Action, you can give yourself the Invisible condition
// until the end of your next turn."
// Uses = WIS mod (min 1)/LR.
// =============================================================================

export function canUseNaturesVeil(
  rangerLevel: number,
  naturesVeilCharges: number,
  bonusActionAvailable: boolean
): boolean {
  return rangerLevel >= NATURES_VEIL_LEVEL && naturesVeilCharges > 0 && bonusActionAvailable
}

export function naturesVeilMaxCharges(wisMod: number): number {
  return Math.max(1, wisMod)
}

// =============================================================================
// Precise Hunter (Level 17)
//
// SRD: "You have Advantage on attack rolls against the creature currently
// marked by your Hunter's Mark."
// =============================================================================

export function hasPreciseHunter(rangerLevel: number): boolean {
  return rangerLevel >= PRECISE_HUNTER_LEVEL
}

// =============================================================================
// Feral Senses (Level 18) — Blindsight 30ft
// =============================================================================

export function hasFeralSenses(rangerLevel: number): boolean {
  return rangerLevel >= FERAL_SENSES_LEVEL
}

// =============================================================================
// Foe Slayer (Level 20)
//
// SRD: "The damage die of your Hunter's Mark is a d10 rather than a d6."
// =============================================================================

export function foeSlayerHuntersMarkDie(rangerLevel: number): number {
  return rangerLevel >= FOE_SLAYER_LEVEL ? HUNTERS_MARK_FOE_SLAYER_DIE : HUNTERS_MARK_BASE_DIE
}

// =============================================================================
// Hunter Subclass (SRD 5.2.1)
//
// TS-only: all features are target-relative, multi-creature, or capability
// flags. No state transitions trackable in single-creature Quint model.
// =============================================================================

export type HunterPreyChoice = "colossusSlayer" | "hordeBreaker"
export type DefensiveTacticChoice = "escapeTheHorde" | "multiattackDefense"

// --- Hunter's Lore (L3, passive) ---

/** SRD: While marked by Hunter's Mark, you know the target's R/V/I. */
export function hasHuntersLore(rangerLevel: number): boolean {
  return rangerLevel >= HUNTER_SUBCLASS_LEVEL
}

// --- Hunter's Prey (L3, choose one, swappable on rest) ---

/**
 * SRD: "When you hit a creature with a weapon, the weapon deals an extra 1d8
 * damage to the target if it's missing any of its Hit Points."
 */
export function canColossusSlayer(choice: HunterPreyChoice, targetBelowMaxHp: boolean): boolean {
  return choice === "colossusSlayer" && targetBelowMaxHp
}

export function colossusSlayerDieSize(): number {
  return COLOSSUS_SLAYER_DIE
}

/**
 * SRD: "you can make another attack with the same weapon against a different
 * creature that is within 5 feet of the original target"
 */
export function canHordeBreaker(choice: HunterPreyChoice, differentTargetWithin5ft: boolean): boolean {
  return choice === "hordeBreaker" && differentTargetWithin5ft
}

// --- Defensive Tactics (L7, choose one, swappable on rest) ---

/** SRD: "Opportunity Attacks have Disadvantage against you." */
export function hasEscapeTheHorde(choice: DefensiveTacticChoice): boolean {
  return choice === "escapeTheHorde"
}

/**
 * SRD: "When a creature hits you with an attack roll, that creature has
 * Disadvantage on all other attack rolls against you this turn."
 */
export function hasMultiattackDefense(choice: DefensiveTacticChoice): boolean {
  return choice === "multiattackDefense"
}

// --- Superior Hunter's Prey (L11, base feature) ---

/** SRD: 1/turn, spread Hunter's Mark damage to different creature within 30ft. */
export function hasSuperiorHuntersPrey(rangerLevel: number): boolean {
  return rangerLevel >= SUPERIOR_HUNTERS_PREY_LEVEL
}

// --- Superior Hunter's Defense (L15, base feature) ---

/**
 * SRD: "When you take damage, you can take a Reaction to give yourself
 * Resistance to that damage and any other damage of the same type until
 * the end of the current turn."
 */
export function canUseSuperiorHuntersDefense(rangerLevel: number, reactionAvailable: boolean): boolean {
  return rangerLevel >= SUPERIOR_HUNTERS_DEFENSE_LEVEL && reactionAvailable
}
