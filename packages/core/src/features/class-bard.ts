// Bard class features — SRD 5.2.1
// TS-only: resource tracking is caller-managed, multi-creature effects
// (inspiration targets, Countercharm aura) not trackable in single-creature model.

// --- Constants ---

const JACK_OF_ALL_TRADES_LEVEL = 2
const FONT_OF_INSPIRATION_LEVEL = 5
const COUNTERCHARM_LEVEL = 7
const SUPERIOR_INSPIRATION_LEVEL = 18
const SUPERIOR_INSPIRATION_THRESHOLD = 2
const WORDS_OF_CREATION_LEVEL = 20
const LORE_SUBCLASS_LEVEL = 3
const CUTTING_WORDS_LEVEL = 3
const MAGICAL_DISCOVERIES_LEVEL = 6
const PEERLESS_SKILL_LEVEL = 14

// =============================================================================
// Bardic Inspiration (Level 1)
//
// SRD: "As a Bonus Action, you can inspire another creature within 60 feet...
// That creature gains one of your Bardic Inspiration dice."
// Uses = CHA mod (min 1)/LR. Die: d6→d8(L5)→d10(L10)→d12(L15).
// =============================================================================

/* eslint-disable no-magic-numbers */

/** Bardic Inspiration die size at given Bard level. */
export function bardicInspirationDie(bardLevel: number): number {
  if (bardLevel <= 0) return 0
  if (bardLevel < 5) return 6
  if (bardLevel < 10) return 8
  if (bardLevel < 15) return 10
  return 12
}

/** Max Bardic Inspiration uses = CHA mod (min 1). */
export function bardicInspirationMaxCharges(chaMod: number): number {
  return Math.max(1, chaMod)
}

// =============================================================================
// Jack of All Trades (Level 2)
//
// SRD: "You can add half your Proficiency Bonus (round down) to any ability
// check you make that uses a skill proficiency you lack."
// =============================================================================

export function jackOfAllTradesBonus(bardLevel: number, profBonus: number, hasProficiency: boolean): number {
  if (bardLevel < JACK_OF_ALL_TRADES_LEVEL || hasProficiency) return 0
  return Math.floor(profBonus / 2)
}

// =============================================================================
// Song of Rest (Level 2)
//
// SRD: Extra healing during short rest. Die scales same as Bardic Inspiration.
// =============================================================================

/** Song of Rest die = same progression as Bardic Inspiration die. */
export const songOfRestDie: (bardLevel: number) => number = bardicInspirationDie

// =============================================================================
// Font of Inspiration (Level 5)
//
// SRD: "You now regain all your expended uses of Bardic Inspiration when you
// finish a Short or Long Rest. In addition, you can expend a spell slot (no
// action required) to regain one expended use."
// =============================================================================

export function hasFontOfInspiration(bardLevel: number): boolean {
  return bardLevel >= FONT_OF_INSPIRATION_LEVEL
}

// =============================================================================
// Countercharm (Level 7)
//
// SRD: "If you or a creature within 30 feet of you fails a saving throw against
// an effect that applies the Charmed or Frightened condition, you can take a
// Reaction to cause the save to be rerolled, and the new roll has Advantage."
// =============================================================================

export function hasCountercharm(bardLevel: number): boolean {
  return bardLevel >= COUNTERCHARM_LEVEL
}

// =============================================================================
// Superior Inspiration (Level 18)
//
// SRD: "When you roll Initiative, you regain expended uses of Bardic
// Inspiration until you have two if you have fewer than that."
// =============================================================================

export function superiorInspirationRestore(bardLevel: number, currentCharges: number): number {
  if (bardLevel < SUPERIOR_INSPIRATION_LEVEL) return currentCharges
  return Math.max(currentCharges, SUPERIOR_INSPIRATION_THRESHOLD)
}

// =============================================================================
// Words of Creation (Level 20)
//
// SRD: "You always have Power Word Heal and Power Word Kill prepared. When you
// cast either spell, you can target a second creature within 10 feet."
// =============================================================================

export function hasWordsOfCreation(bardLevel: number): boolean {
  return bardLevel >= WORDS_OF_CREATION_LEVEL
}

// =============================================================================
// College of Lore Subclass (SRD 5.2.1)
//
// The only Bard subclass in the SRD 5.2.1.
// =============================================================================

// --- Bonus Proficiencies (L3) ---

export function hasLoreBonusProficiencies(bardLevel: number): boolean {
  return bardLevel >= LORE_SUBCLASS_LEVEL
}

// --- Cutting Words (L3) ---

/**
 * SRD: "When a creature that you can see within 60 feet makes a damage roll or
 * succeeds on an ability check or attack roll, you can take a Reaction to expend
 * one use of your Bardic Inspiration; roll your Bardic Inspiration die, and
 * subtract the number rolled from the creature's roll."
 */
export function hasCuttingWords(bardLevel: number): boolean {
  return bardLevel >= CUTTING_WORDS_LEVEL
}

// --- Magical Discoveries (L6) ---

/** SRD: Learn 2 spells from Cleric/Druid/Wizard list. Config-only. */
export function hasMagicalDiscoveries(bardLevel: number): boolean {
  return bardLevel >= MAGICAL_DISCOVERIES_LEVEL
}

// --- Peerless Skill (L14) ---

export function hasPeerlessSkill(bardLevel: number): boolean {
  return bardLevel >= PEERLESS_SKILL_LEVEL
}

export interface PeerlessSkillResult {
  readonly newTotal: number
  readonly success: boolean
  readonly biExpended: boolean
}

/**
 * SRD: "When you make an ability check or attack roll and fail, you can expend
 * one use of Bardic Inspiration; roll the Bardic Inspiration die, and add the
 * number rolled to the d20, potentially turning a failure into a success. On a
 * failure, the Bardic Inspiration isn't expended."
 */
export function peerlessSkillResult(originalTotal: number, dc: number, biDieRoll: number): PeerlessSkillResult {
  const newTotal = originalTotal + biDieRoll
  const success = newTotal >= dc
  return { newTotal, success, biExpended: success }
}

/* eslint-enable no-magic-numbers */
