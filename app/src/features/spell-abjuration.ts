// Abjuration spells — SRD 5.2.1
// Protective and warding spells.

import type { DefenseSpellInfo, DiceDamage, SpellDamageInfo } from "#/features/spell-patterns.ts"
import type { Condition, DamageType } from "#/types.ts"

/* eslint-disable no-magic-numbers */

// --- Types ---

/** Counterspell check result (SRD 5.2.1: target makes CON save). */
export interface CounterspellResult {
  readonly autoSuccess: boolean
  readonly requiresSave: boolean
}

const PROTECTED_CREATURE_TYPE_VALUES = ["aberration", "celestial", "elemental", "fey", "fiend", "undead"] as const
/** Creature types warded by Protection from Evil and Good. */
export type ProtectedCreatureType = (typeof PROTECTED_CREATURE_TYPE_VALUES)[number]

// --- Spell Metadata ---

export const SPELL_COUNTERSPELL: SpellDamageInfo = {
  name: "Counterspell",
  level: 3,
  damageType: "force", // no damage dealt, but type-complete
  pattern: "saveOrNothing",
  concentration: false,
  saveAbility: "con"
}

/** Shield (SRD 5.2.1): L1 Abjuration, Reaction. +5 AC until start of next turn. */
export const SPELL_SHIELD: DefenseSpellInfo = {
  name: "Shield",
  level: 1,
  concentration: false,
  castingTime: "reaction",
  durationDescription: "1 round"
}

/** Mage Armor (SRD 5.2.1): L1 Abjuration, Action. Base AC = 13 + DEX mod. 8 hours. */
export const SPELL_MAGE_ARMOR: DefenseSpellInfo = {
  name: "Mage Armor",
  level: 1,
  concentration: false,
  castingTime: "action",
  durationDescription: "8 hours"
}

/** Shield of Faith (SRD 5.2.1): L1 Abjuration, Bonus Action. +2 AC. Concentration, 10 min. */
export const SPELL_SHIELD_OF_FAITH: DefenseSpellInfo = {
  name: "Shield of Faith",
  level: 1,
  concentration: true,
  castingTime: "bonusAction",
  durationDescription: "Concentration, up to 10 minutes"
}

/** Stoneskin (SRD 5.2.1): L4 Abjuration, Action. Concentration, 1 hour. Resistance to nonmagical B/P/S. */
export const SPELL_STONESKIN: DefenseSpellInfo = {
  name: "Stoneskin",
  level: 4,
  concentration: true,
  castingTime: "action",
  durationDescription: "Concentration, up to 1 hour"
}

/** Sanctuary (SRD 5.2.1): L1 Abjuration, Bonus Action. 1 min. No concentration. */
export const SPELL_SANCTUARY: DefenseSpellInfo = {
  name: "Sanctuary",
  level: 1,
  concentration: false,
  castingTime: "bonusAction",
  durationDescription: "1 minute"
}

/** Protection from Evil and Good (SRD 5.2.1): L1 Abjuration, Action. Concentration, 10 min. */
export const SPELL_PROTECTION_FROM_EVIL_AND_GOOD: DefenseSpellInfo = {
  name: "Protection from Evil and Good",
  level: 1,
  concentration: true,
  castingTime: "action",
  durationDescription: "Concentration, up to 10 minutes"
}

// --- Counterspell ---

/**
 * Counterspell (SRD 5.2.1): target makes a CON save. On fail, spell is interrupted.
 * If counterspell slot >= target spell level, the spell is automatically interrupted
 * (no save required).
 */
export function counterspellCheck(targetSpellLevel: number, counterSpellSlotLevel: number): CounterspellResult {
  return {
    autoSuccess: counterSpellSlotLevel >= targetSpellLevel,
    requiresSave: counterSpellSlotLevel < targetSpellLevel
  }
}

// --- Shield ---

/**
 * Shield (SRD 5.2.1): +5 bonus to AC until start of next turn.
 */
export function shieldACBonus(): number {
  return 5
}

/**
 * Whether Shield can be cast: requires reaction and at least one spell slot.
 */
export function canCastShield(reactionAvailable: boolean, spellSlotsAvailable: boolean): boolean {
  return reactionAvailable && spellSlotsAvailable
}

// --- Mage Armor ---

/**
 * Mage Armor (SRD 5.2.1): base AC becomes 13 + Dexterity modifier.
 */
export function mageArmorAC(dexMod: number): number {
  return 13 + dexMod
}

/**
 * Mage Armor requires the target not be wearing armor.
 */
export function canUseMageArmor(wearingArmor: boolean): boolean {
  return !wearingArmor
}

// --- Shield of Faith ---

/**
 * Shield of Faith (SRD 5.2.1): +2 bonus to AC.
 */
export function shieldOfFaithACBonus(): number {
  return 2
}

// --- Stoneskin ---

/**
 * Stoneskin (SRD 5.2.1): resistance to Bludgeoning, Piercing, and Slashing damage.
 */
export function stoneskinResistances(): ReadonlyArray<DamageType> {
  return ["bludgeoning", "piercing", "slashing"]
}

// --- Sanctuary ---

/**
 * Sanctuary save DC (SRD 5.2.1): the caster's spell save DC (passthrough).
 */
export function sanctuaryDC(spellSaveDC: number): number {
  return spellSaveDC
}

/**
 * Sanctuary (SRD 5.2.1): ends if the warded creature makes an attack roll,
 * casts a spell, or deals damage.
 */
export function sanctuaryBroken(wardedCreatureAttacked: boolean, wardedCreatureCastHarmful: boolean): boolean {
  return wardedCreatureAttacked || wardedCreatureCastHarmful
}

// --- Protection from Evil and Good ---

const PROTECTED_CREATURE_TYPES = new Set(PROTECTED_CREATURE_TYPE_VALUES)

/**
 * Protection from Evil and Good (SRD 5.2.1): returns true if the attacker's
 * creature type is one of the protected types.
 */
export function protectionFromEvilAndGoodActive(attackerType: string): boolean {
  return PROTECTED_CREATURE_TYPES.has(attackerType as ProtectedCreatureType)
}

// =============================================================================
// New Abjuration spells — Healing
// =============================================================================

// --- Cure Wounds (L1, Action, Touch) ---

/** Cure Wounds (SRD 5.2.1): 2d8 + mod at L1, +2d8 per slot level above 1. */
export function cureWoundsDice(slotLevel: number): DiceDamage {
  return { dice: 2 * slotLevel, dieSize: 8 }
}

// --- Healing Word (L1, Bonus Action, 60 ft) ---

/** Healing Word (SRD 5.2.1): 2d4 + mod at L1, +2d4 per slot level above 1. */
export function healingWordDice(slotLevel: number): DiceDamage {
  return { dice: 2 * slotLevel, dieSize: 4 }
}

// --- Heal (L6, Action, 60 ft) ---

/** Heal (SRD 5.2.1): 70 HP at L6, +10 per slot level above 6. Ends Blinded, Deafened, Poisoned. */
export function healAmount(slotLevel: number): number {
  return 70 + 10 * (slotLevel - 6)
}

/** Conditions ended by Heal. */
export const HEAL_REMOVED_CONDITIONS = ["blinded", "deafened", "poisoned"] as const satisfies ReadonlyArray<Condition>

// --- Mass Cure Wounds (L5, Action, 60 ft, 6 targets) ---

/** Mass Cure Wounds (SRD 5.2.1): 5d8 + mod at L5, +1d8 per slot level above 5. */
export function massCureWoundsDice(slotLevel: number): DiceDamage {
  return { dice: 5 + (slotLevel - 5), dieSize: 8 }
}

/** Mass Cure Wounds always affects up to 6 creatures. */
export function massCureWoundsTargets(): 6 {
  return 6
}

// --- Mass Heal (L9, Action, 60 ft) ---

/** Mass Heal (SRD 5.2.1): 700 HP distributed freely. Ends Blinded, Deafened, Poisoned. */
export function massHealPool(): 700 {
  return 700
}

// --- Prayer of Healing (L2, 10 min, 30 ft, 5 targets) ---

/** Prayer of Healing (SRD 5.2.1): 2d8 at L2, +1d8 per slot level above 2. Also grants Short Rest. */
export function prayerOfHealingDice(slotLevel: number): DiceDamage {
  return { dice: 2 + (slotLevel - 2), dieSize: 8 }
}

/** Prayer of Healing affects up to 5 creatures. */
export function prayerOfHealingTargets(): 5 {
  return 5
}

// =============================================================================
// New Abjuration spells — Protection / Condition Removal
// =============================================================================

// --- Aid (L2, Action, 30 ft, 3 targets, 8 hours) ---

/** Aid (SRD 5.2.1): +5 max & current HP at L2, +5 per slot level above 2. */
export function aidHpIncrease(slotLevel: number): number {
  return 5 * (slotLevel - 1)
}

/** Aid affects up to 3 creatures. */
export function aidTargets(): 3 {
  return 3
}

// --- Death Ward (L4, Action, Touch, 8 hours) ---

/** Death Ward (SRD 5.2.1): first drop to 0 HP → drop to 1 HP instead. */
export function deathWardTriggered(wouldDropTo0: boolean, wardActive: boolean): boolean {
  return wouldDropTo0 && wardActive
}

// --- Lesser Restoration (L2, Bonus Action, Touch) ---

/** Conditions removable by Lesser Restoration (SRD 5.2.1). */
export const LESSER_RESTORATION_CONDITIONS = [
  "blinded",
  "deafened",
  "paralyzed",
  "poisoned"
] as const satisfies ReadonlyArray<Condition>

// --- Greater Restoration (L5, Action, Touch) ---

/** Effects removable by Greater Restoration (SRD 5.2.1). */
export const GREATER_RESTORATION_EFFECTS = [
  "exhaustion",
  "charmed",
  "petrified",
  "curse",
  "abilityScoreReduction",
  "hpMaxReduction"
] as const

export type GreaterRestorationEffect = (typeof GREATER_RESTORATION_EFFECTS)[number]

// --- Remove Curse (L3, Action, Touch) ---

// Remove Curse ends all curses on one target. Modeled as a capability flag.

// --- Dispel Magic (L3, Action, 120 ft) ---

/**
 * Dispel Magic (SRD 5.2.1): auto-ends spells ≤ slot level.
 * For higher-level spells, caster makes ability check vs DC = 10 + spell level.
 */
export function dispelMagicAutoSuccess(targetSpellLevel: number, slotLevel: number): boolean {
  return slotLevel >= targetSpellLevel
}

/** DC for the ability check when dispelling a higher-level spell. */
export function dispelMagicDC(targetSpellLevel: number): number {
  return 10 + targetSpellLevel
}

// --- Protection from Energy (L3, Action, Touch, Concentration 1 hour) ---

/** Damage types grantable as resistance by Protection from Energy. */
export const PROTECTION_FROM_ENERGY_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "thunder"
] as const satisfies ReadonlyArray<DamageType>

// --- Warding Bond (L2, Action, Touch, 1 hour, no concentration) ---

/** Warding Bond (SRD 5.2.1): +1 AC, +1 saves, resistance to all damage; caster takes same damage. */
export function wardingBondACBonus(): 1 {
  return 1
}

export function wardingBondSaveBonus(): 1 {
  return 1
}

/** Warding Bond active range: 60 feet. */
export function wardingBondRange(): 60 {
  return 60
}

// --- Holy Aura (L8, Action, Self 30-ft Emanation, Concentration 1 minute) ---

/** Holy Aura (SRD 5.2.1): advantage on saves, disadvantage on attacks against, Fiend/Undead blinded on melee hit. */
export function holyAuraSaveAdvantage(): true {
  return true
}

export function holyAuraAttackDisadvantage(): true {
  return true
}

// --- Globe of Invulnerability (L6, Action, Self 10-ft Emanation, Concentration 1 minute) ---

/** Globe of Invulnerability (SRD 5.2.1): blocks spells of level ≤ 5, +1 per slot above 6. */
export function globeBlocksSpellLevel(slotLevel: number): number {
  return 5 + (slotLevel - 6)
}

/* eslint-enable no-magic-numbers */
