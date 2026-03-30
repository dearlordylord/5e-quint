// Abjuration spells — SRD 5.2.1
// Protective and warding spells.

import type { ConditionSpellResult, DefenseSpellInfo, DiceDamage, SpellDamageInfo } from "#/features/spell-patterns.ts"
import { upcastTargets } from "#/features/spell-patterns.ts"
import type { Condition, DamageType } from "#/types.ts"

/* eslint-disable no-magic-numbers */

// --- Types ---

const PROTECTED_CREATURE_TYPE_VALUES = ["aberration", "celestial", "elemental", "fey", "fiend", "undead"] as const
/** Creature types warded by Protection from Evil and Good. */
export type ProtectedCreatureType = (typeof PROTECTED_CREATURE_TYPE_VALUES)[number]

// --- Constants ---

/** Shield AC bonus: +5. */
export const SHIELD_AC_BONUS = 5

/** Shield of Faith AC bonus: +2. */
export const SHIELD_OF_FAITH_AC_BONUS = 2

/** Mass Cure Wounds targets: 6. */
export const MASS_CURE_WOUNDS_TARGETS = 6

/** Mass Heal HP pool: 700. */
export const MASS_HEAL_POOL = 700

/** Prayer of Healing targets: 5. */
export const PRAYER_OF_HEALING_TARGETS = 5

/** Aid targets: 3. */
export const AID_TARGETS = 3

/** Warding Bond: +1 AC, +1 saves, 60 ft range. */
export const WARDING_BOND_AC_BONUS = 1
export const WARDING_BOND_SAVE_BONUS = 1
export const WARDING_BOND_RANGE = 60

/** Holy Aura: advantage on saves, disadvantage on attacks against affected creatures. */
export const HOLY_AURA_SAVE_ADVANTAGE = true
export const HOLY_AURA_ATTACK_DISADVANTAGE = true

/** Stoneskin: resistance to B/P/S. */
export const STONESKIN_RESISTANCES: ReadonlyArray<DamageType> = ["bludgeoning", "piercing", "slashing"]

// --- Spell Metadata ---

export const SPELL_COUNTERSPELL: SpellDamageInfo = {
  name: "Counterspell",
  level: 3,
  damageType: "force", // no damage dealt, but type-complete
  pattern: "saveOrNothing",
  concentration: false,
  saveAbility: "con"
}

export const SPELL_SHIELD: DefenseSpellInfo = {
  name: "Shield",
  level: 1,
  concentration: false,
  castingTime: "reaction",
  durationDescription: "1 round"
}

export const SPELL_MAGE_ARMOR: DefenseSpellInfo = {
  name: "Mage Armor",
  level: 1,
  concentration: false,
  castingTime: "action",
  durationDescription: "8 hours"
}

export const SPELL_SHIELD_OF_FAITH: DefenseSpellInfo = {
  name: "Shield of Faith",
  level: 1,
  concentration: true,
  castingTime: "bonusAction",
  durationDescription: "Concentration, up to 10 minutes"
}

export const SPELL_STONESKIN: DefenseSpellInfo = {
  name: "Stoneskin",
  level: 4,
  concentration: true,
  castingTime: "action",
  durationDescription: "Concentration, up to 1 hour"
}

export const SPELL_SANCTUARY: DefenseSpellInfo = {
  name: "Sanctuary",
  level: 1,
  concentration: false,
  castingTime: "bonusAction",
  durationDescription: "1 minute"
}

export const SPELL_PROTECTION_FROM_EVIL_AND_GOOD: DefenseSpellInfo = {
  name: "Protection from Evil and Good",
  level: 1,
  concentration: true,
  castingTime: "action",
  durationDescription: "Concentration, up to 10 minutes"
}

// --- Counterspell ---

/**
 * Counterspell (SRD 5.2.1): auto-interrupts if slot ≥ target level, else requires CON save.
 */
export function counterspellAutoSuccess(targetSpellLevel: number, counterSpellSlotLevel: number): boolean {
  return counterSpellSlotLevel >= targetSpellLevel
}

// --- Shield ---

/** Whether Shield can be cast: requires reaction and at least one spell slot. */
export function canCastShield(reactionAvailable: boolean, spellSlotsAvailable: boolean): boolean {
  return reactionAvailable && spellSlotsAvailable
}

// --- Mage Armor ---

/** Mage Armor (SRD 5.2.1): base AC becomes 13 + Dexterity modifier. */
export function mageArmorAC(dexMod: number): number {
  return 13 + dexMod
}

/** Mage Armor requires the target not be wearing armor. */
export function canUseMageArmor(wearingArmor: boolean): boolean {
  return !wearingArmor
}

// --- Sanctuary ---

/** Sanctuary (SRD 5.2.1): ends if the warded creature attacks or casts harmful spell. */
export function sanctuaryBroken(wardedCreatureAttacked: boolean, wardedCreatureCastHarmful: boolean): boolean {
  return wardedCreatureAttacked || wardedCreatureCastHarmful
}

// --- Protection from Evil and Good ---

const PROTECTED_CREATURE_TYPES = new Set(PROTECTED_CREATURE_TYPE_VALUES)

export function protectionFromEvilAndGoodActive(attackerType: string): boolean {
  return PROTECTED_CREATURE_TYPES.has(attackerType as ProtectedCreatureType)
}

// =============================================================================
// Healing spells
// =============================================================================

/** Cure Wounds (SRD 5.2.1): 2d8 + mod at L1, +2d8 per slot level above 1. */
export function cureWoundsDice(slotLevel: number): DiceDamage {
  return { dice: 2 * slotLevel, dieSize: 8 }
}

/** Healing Word (SRD 5.2.1): 2d4 + mod at L1, +2d4 per slot level above 1. */
export function healingWordDice(slotLevel: number): DiceDamage {
  return { dice: 2 * slotLevel, dieSize: 4 }
}

/** Heal (SRD 5.2.1): 70 HP at L6, +10 per slot level above 6. */
export function healAmount(slotLevel: number): number {
  return 70 + 10 * (slotLevel - 6)
}

/** Conditions ended by Heal / Mass Heal. */
export const HEAL_REMOVED_CONDITIONS = ["blinded", "deafened", "poisoned"] as const satisfies ReadonlyArray<Condition>

/** Mass Cure Wounds (SRD 5.2.1): 5d8 + mod at L5, +1d8 per slot level above 5. */
export function massCureWoundsDice(slotLevel: number): DiceDamage {
  return { dice: 5 + (slotLevel - 5), dieSize: 8 }
}

/** Prayer of Healing (SRD 5.2.1): 2d8 at L2, +1d8 per slot level above 2. */
export function prayerOfHealingDice(slotLevel: number): DiceDamage {
  return { dice: 2 + (slotLevel - 2), dieSize: 8 }
}

// =============================================================================
// Protection / Condition Removal
// =============================================================================

/** Aid (SRD 5.2.1): +5 max & current HP at L2, +5 per slot level above 2. */
export function aidHpIncrease(slotLevel: number): number {
  return 5 * (slotLevel - 1)
}

/** Death Ward (SRD 5.2.1): first drop to 0 HP → drop to 1 HP instead. */
export function deathWardTriggered(wouldDropTo0: boolean, wardActive: boolean): boolean {
  return wouldDropTo0 && wardActive
}

/** Conditions removable by Lesser Restoration (SRD 5.2.1). */
export const LESSER_RESTORATION_CONDITIONS = [
  "blinded",
  "deafened",
  "paralyzed",
  "poisoned"
] as const satisfies ReadonlyArray<Condition>

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

/** Dispel Magic auto-success: slot ≥ target spell level. */
export function dispelMagicAutoSuccess(targetSpellLevel: number, slotLevel: number): boolean {
  return slotLevel >= targetSpellLevel
}

/** Dispel Magic check DC = 10 + target spell level. */
export function dispelMagicDC(targetSpellLevel: number): number {
  return 10 + targetSpellLevel
}

/** Damage types grantable as resistance by Protection from Energy. */
export const PROTECTION_FROM_ENERGY_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "thunder"
] as const satisfies ReadonlyArray<DamageType>

/** Globe of Invulnerability (SRD 5.2.1): blocks spells ≤ 5, +1 per slot above 6. */
export function globeBlocksSpellLevel(slotLevel: number): number {
  return 5 + (slotLevel - 6)
}

// --- Banishment (L4, Action, 30 ft, Concentration 1 min, CHA save) ---

/** Banishment targets: 1 base, +1 per slot level above 4. */
export function banishmentTargets(slotLevel: number): number {
  return upcastTargets(slotLevel, 4)
}

/** Banishment result: Incapacitated while banished. Permanent if extraplanar + full duration. */
export function banishmentResult(savePassed: boolean): ConditionSpellResult {
  return {
    conditionApplied: savePassed ? null : "incapacitated",
    specialEffect: savePassed
      ? null
      : "Transported to harmless demiplane; permanent if extraplanar and spell lasts full duration",
    savePassed
  }
}

/** Creature types permanently banished if spell lasts full duration. */
export const BANISHMENT_PERMANENT_TYPES = ["aberration", "celestial", "elemental", "fey", "fiend"] as const

// --- Freedom of Movement (L4, Action, Touch, 1 hour, no concentration) ---

/** Freedom of Movement targets: 1 base, +1 per slot above 4. */
export function freedomOfMovementTargets(slotLevel: number): number {
  return upcastTargets(slotLevel, 4)
}

/** Conditions that Freedom of Movement grants immunity to (from spells/magic). */
export const FREEDOM_OF_MOVEMENT_IMMUNITIES = ["paralyzed", "restrained"] as const satisfies ReadonlyArray<Condition>

// --- Mind Blank (L8, Action, Touch, 24 hours, no concentration) ---

/** Mind Blank: immunity to Psychic damage and Charmed condition. */
export const MIND_BLANK_IMMUNITIES = { psychicDamage: true, charmed: true } as const

/* eslint-enable no-magic-numbers */
