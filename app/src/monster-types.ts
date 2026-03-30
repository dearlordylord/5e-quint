/**
 * Monster-related types mirroring the Quint spec (dnd.qnt).
 * SRD 5.2.1: Stat blocks contain the game statistics of a monster.
 */

import type { Ability, Condition, DamageType, Size } from "./types"

// --- Phase L: Legendary / Recharge / X-Day types ---

export interface LegendaryActionDef {
  readonly name: string
  readonly cost: number
}

export interface RechargeAbilityDef {
  readonly name: string
  readonly rechargeMin: number // min d6 roll to recharge (e.g., 5 for "Recharge 5-6")
}

export interface RechargeRollEvent {
  readonly abilityName: string
  readonly d6Roll: number
}

export interface MonsterResourceState {
  readonly legendaryActionsRemaining: number
  readonly legendaryResistancesRemaining: number
  readonly rechargeAvailable: Readonly<Record<string, boolean>>
  readonly dailyUsesRemaining: Readonly<Record<string, number>>
}

// --- SRD 5.2.1 Creature Types (14 types, Monsters > Overview) ---

export type CreatureType =
  | "aberration"
  | "beast"
  | "celestial"
  | "construct"
  | "dragon"
  | "elemental"
  | "fey"
  | "fiend"
  | "giant"
  | "humanoid"
  | "monstrosity"
  | "ooze"
  | "plant"
  | "undead"

// --- SRD 5.2.1 Senses ---

export type SenseType = "blindsight" | "darkvision" | "tremorsense" | "truesight"

// --- Challenge Rating (sum type: fractional CRs are special cases) ---

export type ChallengeRating =
  | { readonly type: "CR0" }
  | { readonly type: "CR_Eighth" }
  | { readonly type: "CR_Quarter" }
  | { readonly type: "CR_Half" }
  | { readonly type: "CRN"; readonly value: number }

// --- Monster Attack ---

export interface MonsterAttack {
  readonly name: string
  readonly attackBonus: number
  readonly reach: number // 0 for ranged-only
  readonly rangeNormal: number // 0 for melee-only
  readonly rangeLong: number
  readonly damageAmount: number // average damage
  readonly damageType: DamageType
  readonly isRanged: boolean
}

// --- Multiattack Slot ---

export type MultiattackSlot =
  | { readonly type: "MAttack"; readonly name: string }
  | { readonly type: "MSpecialAbility"; readonly name: string }

// --- Speed Types ---

export type SpeedType = "walk" | "fly" | "swim" | "climb" | "burrow"

// --- Skill (18 SRD skills) ---

export type Skill =
  | "acrobatics"
  | "animalHandling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleightOfHand"
  | "stealth"
  | "survival"

// --- Stat Block (SRD 5.2.1: "contains the game statistics of a monster") ---

export interface StatBlock {
  readonly name: string
  readonly creatureType: CreatureType
  readonly creatureSize: Size
  readonly ac: number
  readonly initiativeMod: number
  readonly maxHp: number
  readonly hitDice: number
  readonly hitDieType: number
  readonly speeds: Readonly<Record<SpeedType, number>>
  readonly abilityScores: Readonly<Record<Ability, number>>
  readonly saveProficiencies: ReadonlySet<Ability>
  readonly skillBonuses: Readonly<Record<Skill, number>>
  readonly cr: ChallengeRating
  readonly proficiencyBonus: number
  readonly resistances: ReadonlySet<DamageType>
  readonly vulnerabilities: ReadonlySet<DamageType>
  readonly damageImmunities: ReadonlySet<DamageType>
  readonly conditionImmunities: ReadonlySet<Condition>
  readonly exhaustionImmune: boolean
  readonly senses: Readonly<Record<SenseType, number>>
  readonly attacks: Readonly<Record<string, MonsterAttack>>
  readonly multiattack: ReadonlyArray<MultiattackSlot>
  // Phase L: Legendary / Recharge / X-Day
  readonly legendaryActionUses: number // 0 = no legendary actions
  readonly legendaryResistanceUses: number // 0 = no LR
  readonly legendaryActions: Readonly<Record<string, LegendaryActionDef>>
  readonly rechargeAbilities: Readonly<Record<string, RechargeAbilityDef>>
  readonly dailyAbilities: Readonly<Record<string, number>> // name -> max uses/day
  readonly inLair: boolean
}
