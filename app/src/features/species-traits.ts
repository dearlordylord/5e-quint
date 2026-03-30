// Species combat traits and save/resistance modifiers — SRD 5.2.1
// TS-only: all traits are capability flags, resource tracking, or
// modifier functions — no Quint state transitions.

import type { DamageType } from "#/types.ts"

/* eslint-disable no-magic-numbers */

// =============================================================================
// Types
// =============================================================================

export const GIANT_ANCESTRY_OPTIONS = ["cloud", "fire", "frost", "hill", "stone", "storm"] as const
export type GiantAncestry = (typeof GIANT_ANCESTRY_OPTIONS)[number]

export const DRAGONBORN_ANCESTRY_TYPES = ["acid", "cold", "fire", "lightning", "poison"] as const
export type DragonbornAncestryType = (typeof DRAGONBORN_ANCESTRY_TYPES)[number]

export const TIEFLING_LEGACY_OPTIONS = ["abyssal", "chthonic", "infernal"] as const
export type TieflingLegacy = (typeof TIEFLING_LEGACY_OPTIONS)[number]

// =============================================================================
// T140: Combat Species Traits
// =============================================================================

// --- Small species Heavy Weapon Disadvantage ---

export function hasHeavyWeaponDisadvantage(size: string): boolean {
  return size === "small" || size === "tiny"
}

// --- Dragonborn ---

/** Breath Weapon dice: 1d10 scaling at L1/L5/L11/L17. */
export function breathWeaponDice(characterLevel: number): number {
  if (characterLevel < 5) return 1
  if (characterLevel < 11) return 2
  if (characterLevel < 17) return 3
  return 4
}

/** Breath Weapon save DC = 8 + CON mod + prof bonus. */
export function breathWeaponSaveDC(conMod: number, profBonus: number): number {
  return 8 + conMod + profBonus
}

/** Draconic Flight (L5+): BA, fly = Speed, 10 min, 1/LR. */
export function hasDraconicFlight(characterLevel: number): boolean {
  return characterLevel >= 5
}

// --- Orc ---

/** Adrenaline Rush: BA Dash + temp HP = prof bonus. Uses = prof bonus per SR/LR. */
export function orcAdrenalineRushTempHp(profBonus: number): number {
  return profBonus
}

export function orcAdrenalineRushMaxUses(profBonus: number): number {
  return profBonus
}

/** Relentless Endurance: drop to 1 HP instead of 0. 1/LR. */
export function canOrcRelentlessEndurance(relentlessUsed: boolean): boolean {
  return !relentlessUsed
}

// --- Goliath ---

export function goliathGiantAncestryMaxUses(profBonus: number): number {
  return profBonus
}

/** Stone's Endurance: Reaction, reduce damage by 1d12 + CON mod. */
export function stonesEnduranceReduction(d12Roll: number, conMod: number): number {
  return Math.max(0, d12Roll + conMod)
}

/** Fire's Burn: extra 1d10 fire damage on hit, 1/turn. */
export function firesBurnDieSize(): number {
  return 10
}

/** Frost's Chill: extra 1d6 cold damage on hit + target can't use reactions until next turn. */
export function frostChillDieSize(): number {
  return 6
}

/** Hill's Tumble: push up to 15ft on hit, target Large or smaller. */
export function hillsTumblePushDistance(): number {
  return 15
}

/** Storm's Thunder: when hit in melee, Reaction to deal 1d8 thunder + push 15ft on failed CON save. */
export function stormsThunderDieSize(): number {
  return 8
}

/** Large Form (L5+): BA 10 min, advantage STR checks, +10 Speed. 1/LR. */
export function hasLargeForm(characterLevel: number): boolean {
  return characterLevel >= 5
}

export function largeFormSpeedBonus(): number {
  return 10
}

// --- Halfling ---

/** Lucky: reroll on natural 1. */
export function halflingLuckyReroll(d20Roll: number): boolean {
  return d20Roll === 1
}

// =============================================================================
// T141: Species Save/Resistance Modifiers
// =============================================================================

// --- Dwarf ---

export function dwarvenResilianceDamageType(): DamageType {
  return "poison"
}

/** Dwarven Toughness: +1 HP at creation, +1 per level = total bonus = level. */
export function dwarvenToughnessHpBonus(characterLevel: number): number {
  return characterLevel
}

// --- Elf ---

/** Fey Ancestry: Advantage on saves vs Charmed. No sleep immunity in 5.2.1. */
export function feyAncestryAdvantageVsCharmed(): boolean {
  return true
}

// --- Gnome ---

/**
 * SRD: "You have Advantage on Intelligence, Wisdom, and Charisma saving throws."
 * Note: SRD 5.2.1 removed the "against magic" qualifier — it's ALL INT/WIS/CHA saves.
 */
export function gnomishCunningAdvantage(saveAbility: string): boolean {
  return saveAbility === "int" || saveAbility === "wis" || saveAbility === "cha"
}

// --- Halfling ---

/** Brave: Advantage on saves vs Frightened. */
export function halflingBraveAdvantageVsFrightened(): boolean {
  return true
}

// --- Tiefling ---

/** Hellish Resistance (5.1 holdover) — removed in 5.2.1. Fiendish Legacy provides spells instead. */
// Note: SRD 5.2.1 Tiefling does NOT have passive Fire Resistance. The old
// "Hellish Resistance" was replaced by Fiendish Legacy spell options.
// Keeping this for reference but marking as legacy.

// --- Dragonborn ---

/** Damage Resistance matching ancestry type. */
export function dragonbornDamageResistance(ancestryType: DragonbornAncestryType): DamageType {
  return ancestryType
}

/* eslint-enable no-magic-numbers */
