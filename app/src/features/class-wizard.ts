// Wizard class features — SRD 5.2.1
// TS-only: resource recovery validation, spell slot constraints, and
// damage scaling — all caller-managed with no Quint state transitions.

// --- Constants ---

/* eslint-disable no-magic-numbers */

const SCHOLAR_LEVEL = 2
const MEMORIZE_SPELL_LEVEL = 5
const SPELL_MASTERY_LEVEL = 18
const SIGNATURE_SPELLS_LEVEL = 20
const MAX_ARCANE_RECOVERY_SLOT = 5
const EVOKER_SUBCLASS_LEVEL = 3
const SCULPT_SPELLS_LEVEL = 6
const EMPOWERED_EVOCATION_LEVEL = 10
const OVERCHANNEL_LEVEL = 14

// =============================================================================
// Arcane Recovery (Level 1)
//
// SRD: "choose expended spell slots to recover. The spell slots can have a
// combined level equal to no more than half your Wizard level (round up),
// and none of the slots can be level 6 or higher."
// Once per Long Rest, used during Short Rest.
// =============================================================================

/** Max combined slot levels recoverable via Arcane Recovery. */
export function arcaneRecoveryMaxLevels(wizardLevel: number): number {
  if (wizardLevel <= 0) return 0
  return Math.ceil(wizardLevel / 2)
}

/** Whether a given slot level can be recovered (max 5th). */
export function canArcaneRecoverSlot(slotLevel: number): boolean {
  return slotLevel >= 1 && slotLevel <= MAX_ARCANE_RECOVERY_SLOT
}

/**
 * Validates an Arcane Recovery selection: total levels <= max and all slots <= 5th.
 * Returns true if the selection is valid.
 */
export function validateArcaneRecovery(wizardLevel: number, slotLevels: ReadonlyArray<number>): boolean {
  const total = slotLevels.reduce((sum, l) => sum + l, 0)
  if (total > arcaneRecoveryMaxLevels(wizardLevel)) return false
  return slotLevels.every(canArcaneRecoverSlot)
}

// =============================================================================
// Scholar (Level 2) — Expertise in one skill
// =============================================================================

export function hasScholar(wizardLevel: number): boolean {
  return wizardLevel >= SCHOLAR_LEVEL
}

// =============================================================================
// Memorize Spell (Level 5) — swap one prepared spell on Short Rest
// =============================================================================

export function hasMemorizeSpell(wizardLevel: number): boolean {
  return wizardLevel >= MEMORIZE_SPELL_LEVEL
}

// =============================================================================
// Spell Mastery (Level 18) — chosen L1 + L2 at will
// =============================================================================

export function hasSpellMastery(wizardLevel: number): boolean {
  return wizardLevel >= SPELL_MASTERY_LEVEL
}

// =============================================================================
// Signature Spells (Level 20) — two L3 spells, 1/SR each
// =============================================================================

export function hasSignatureSpells(wizardLevel: number): boolean {
  return wizardLevel >= SIGNATURE_SPELLS_LEVEL
}

// =============================================================================
// Evoker Subclass (SRD 5.2.1)
//
// The only Wizard subclass in the SRD 5.2.1.
// =============================================================================

// --- Potent Cantrip (L3) ---

/**
 * SRD: "When you cast a cantrip at a creature and you miss with the attack roll
 * or the target succeeds on a saving throw against the cantrip, the target takes
 * half the cantrip's damage (if any) but suffers no additional effect."
 */
export function hasPotentCantrip(wizardLevel: number): boolean {
  return wizardLevel >= EVOKER_SUBCLASS_LEVEL
}

export function potentCantripDamage(fullDamage: number): number {
  return Math.floor(fullDamage / 2)
}

// --- Sculpt Spells (L6) ---

/**
 * SRD: "you can choose a number of them equal to 1 plus the spell's level.
 * The chosen creatures automatically succeed on their saving throws against
 * the spell, and they take no damage."
 */
export function sculptSpellsMaxCreatures(wizardLevel: number, spellLevel: number): number {
  if (wizardLevel < SCULPT_SPELLS_LEVEL) return 0
  return 1 + spellLevel
}

// --- Empowered Evocation (L10) ---

/** SRD: "+Intelligence modifier to one damage roll of [Evocation] spell." */
export function empoweredEvocationBonus(wizardLevel: number, intMod: number): number {
  if (wizardLevel < EMPOWERED_EVOCATION_LEVEL) return 0
  return intMod
}

// --- Overchannel (L14) ---

/**
 * SRD: "When you cast a Wizard spell with a spell slot of levels 1–5 that deals
 * damage, you can deal maximum damage with that spell on the turn you cast it."
 * First use free/LR. Subsequent: escalating Necrotic damage.
 */
export function hasOverchannel(wizardLevel: number): boolean {
  return wizardLevel >= OVERCHANNEL_LEVEL
}

/** Max damage for an overchanneled spell. */
export function overchannelMaxDamage(diceCount: number, dieSize: number): number {
  return diceCount * dieSize
}

/**
 * Necrotic damage from Overchannel after the first free use.
 * SRD: "2d12 Necrotic damage for each level of the spell slot... each time you
 * use this feature again before finishing a Long Rest, the Necrotic damage per
 * spell level increases by 1d12."
 * Returns number of d12s to roll. First use = 0. Second = 2×slotLevel. Third = 3×slotLevel.
 */
export function overchannelNecroticDice(useCount: number, slotLevel: number): number {
  if (useCount <= 1) return 0
  return useCount * slotLevel
}

/* eslint-enable no-magic-numbers */
