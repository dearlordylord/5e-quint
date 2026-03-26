import type { DamageType } from "#/types.ts"

// --- Types ---

/** Metadata for an AC/defense buff spell (SRD 5.2.1). */
export interface DefenseSpellInfo {
  readonly name: string
  readonly level: number
  readonly concentration: boolean
  readonly castingTime: "action" | "bonusAction" | "reaction"
  readonly durationDescription: string
}

/** Fire Shield warm/chill choice. */
export type FireShieldChoice = "warm" | "chill"

/** Creature types warded by Protection from Evil and Good. */
export type ProtectedCreatureType = "aberration" | "celestial" | "elemental" | "fey" | "fiend" | "undead"

/** Dice-based damage descriptor. */
export interface DiceDamage {
  readonly dice: number
  readonly dieSize: number
}

// --- Spell Metadata ---

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

/** Barkskin (SRD 5.2.1): L2 Transmutation, Bonus Action. AC can't be less than 17. 1 hour. No concentration. */
export const SPELL_BARKSKIN: DefenseSpellInfo = {
  name: "Barkskin",
  level: 2,
  concentration: false,
  castingTime: "bonusAction",
  durationDescription: "1 hour"
}

/** Fire Shield (SRD 5.2.1): L4 Evocation, Action. 10 min. Warm or chill shield. */
export const SPELL_FIRE_SHIELD: DefenseSpellInfo = {
  name: "Fire Shield",
  level: 4,
  concentration: false,
  castingTime: "action",
  durationDescription: "10 minutes"
}

/** Mirror Image (SRD 5.2.1): L2 Illusion, Action. 1 min. 3 duplicates. No concentration. */
export const SPELL_MIRROR_IMAGE: DefenseSpellInfo = {
  name: "Mirror Image",
  level: 2,
  concentration: false,
  castingTime: "action",
  durationDescription: "1 minute"
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

// --- Barkskin ---

/**
 * Barkskin (SRD 5.2.1): target has AC of 17 if its AC is lower than that.
 */
export function barkskinAC(currentAC: number): number {
  return Math.max(17, currentAC)
}

// --- Fire Shield ---

/**
 * Fire Shield resistance (SRD 5.2.1):
 * Warm shield grants Cold resistance; Chill shield grants Fire resistance.
 */
export function fireShieldResistance(choice: FireShieldChoice): DamageType {
  return choice === "warm" ? "cold" : "fire"
}

/**
 * Fire Shield retaliation damage (SRD 5.2.1): 2d8.
 */
export function fireShieldRetaliationDamage(): DiceDamage {
  return { dice: 2, dieSize: 8 }
}

/**
 * Fire Shield retaliation damage type (SRD 5.2.1):
 * Warm shield deals Fire damage; Chill shield deals Cold damage.
 */
export function fireShieldRetaliationDamageType(choice: FireShieldChoice): DamageType {
  return choice === "warm" ? "fire" : "cold"
}

// --- Mirror Image ---

/**
 * Mirror Image d20 threshold (SRD 5.1 / task spec):
 * 3 duplicates → 6, 2 → 8, 1 → 11, 0 → 21 (impossible on d20).
 */
export function mirrorImageThreshold(duplicatesRemaining: number): number {
  if (duplicatesRemaining >= 3) return 6
  if (duplicatesRemaining === 2) return 8
  if (duplicatesRemaining === 1) return 11
  return 21
}

/**
 * Whether a d20 roll hits a mirror image duplicate instead of the caster.
 */
export function mirrorImageHitsDuplicate(d20Roll: number, duplicatesRemaining: number): boolean {
  if (duplicatesRemaining <= 0) return false
  return d20Roll >= mirrorImageThreshold(duplicatesRemaining)
}

/**
 * Mirror Image duplicate AC (SRD 5.2.1): 10 + Dexterity modifier.
 */
export function mirrorImageDuplicateAC(dexMod: number): number {
  return 10 + dexMod
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

const PROTECTED_CREATURE_TYPES: ReadonlySet<string> = new Set<ProtectedCreatureType>([
  "aberration",
  "celestial",
  "elemental",
  "fey",
  "fiend",
  "undead"
])

/**
 * Protection from Evil and Good (SRD 5.2.1): returns true if the attacker's
 * creature type is one of the protected types.
 */
export function protectionFromEvilAndGoodActive(attackerType: string): boolean {
  return PROTECTED_CREATURE_TYPES.has(attackerType)
}
