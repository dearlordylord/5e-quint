import { Schema } from "effect"

// --- Sum types (string unions) ---

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha"

export type DamageType =
  | "acid"
  | "bludgeoning"
  | "cold"
  | "fire"
  | "force"
  | "lightning"
  | "necrotic"
  | "piercing"
  | "poison"
  | "psychic"
  | "radiant"
  | "slashing"
  | "thunder"

export type Condition =
  | "blinded"
  | "charmed"
  | "deafened"
  | "frightened"
  | "grappled"
  | "incapacitated"
  | "invisible"
  | "paralyzed"
  | "petrified"
  | "poisoned"
  | "prone"
  | "restrained"
  | "stunned"
  | "unconscious"

export type IncapSource = "paralyzed" | "petrified" | "stunned" | "unconscious" | "direct"

export type ActionType =
  | "attack"
  | "cast"
  | "dash"
  | "disengage"
  | "dodge"
  | "help"
  | "hide"
  | "ready"
  | "search"
  | "useObject"

export type SpeedType = "walk" | "fly" | "swim" | "climb" | "burrow"

export type CoverType = "none" | "half" | "threeQuarters" | "total"

export type ArmorCategory = "light" | "medium" | "heavy"

export type Size = "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan"

export type ContestResult = "aWins" | "bWins" | "tie"

export type ShoveChoice = "prone" | "push"

export type UnarmoredDefense = "none" | "barbarian" | "monk"

export type Illumination = "bright" | "dim" | "dark"

export type TravelPace = "fast" | "normal" | "slow"

export interface Armor {
  readonly category: ArmorCategory
  readonly baseAC: number
  readonly strRequirement: number
  readonly stealthDisadvantage: boolean
}

export type ArmorState = { readonly type: "unarmored" } | { readonly type: "wearingArmor"; readonly armor: Armor }

// --- Modifier result types ---

export interface AdvState {
  readonly hasAdvantage: boolean
  readonly hasDisadvantage: boolean
}

export interface DefenseMods {
  readonly attackerAdvantage: boolean
  readonly attackerDisadvantage: boolean
  readonly autoCrit: boolean
}

export interface D20Mods {
  readonly hasAdvantage: boolean
  readonly hasDisadvantage: boolean
  readonly autoFail: boolean
}

export interface AttackResult {
  readonly hits: boolean
  readonly isCritical: boolean
}

export interface FullAttackMods {
  readonly hasAdvantage: boolean
  readonly hasDisadvantage: boolean
  readonly autoCrit: boolean
  readonly autoMiss: boolean
}

export interface AttackContext {
  readonly attackerBlinded: boolean
  readonly attackerProne: boolean
  readonly attackerRestrained: boolean
  readonly attackerPoisoned: boolean
  readonly attackerFrightened: boolean
  readonly attackerFrightSourceInLOS: boolean
  readonly attackerExhaustion: number
  readonly targetBlinded: boolean
  readonly targetParalyzed: boolean
  readonly targetPetrified: boolean
  readonly targetStunned: boolean
  readonly targetUnconscious: boolean
  readonly targetRestrained: boolean
  readonly targetProne: boolean
  readonly attackerWithin5ft: boolean
  readonly targetDodging: boolean
  readonly targetCanSeeAttacker: boolean
  readonly attackerCanSeeTarget: boolean
  readonly isRangedAttack: boolean
  readonly beyondNormalRange: boolean
  readonly hostileWithin5ft: boolean
  readonly isHeavyWeapon: boolean
  readonly wielderSizeSmallOrTiny: boolean
  readonly squeezing: boolean
  readonly underwater: boolean
  readonly attackerHasSwimSpeed: boolean
  readonly isUnderwaterMeleeException: boolean
  readonly isUnderwaterRangedException: boolean
}

// --- Branded numeric types ---

const HP = Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0), Schema.brand("HP"))
type HP = typeof HP.Type
export function hp(n: number): HP {
  return HP.make(Math.max(0, Math.floor(n)))
}
export type { HP }

const TempHP = Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0), Schema.brand("TempHP"))
type TempHP = typeof TempHP.Type
export function tempHp(n: number): TempHP {
  return TempHP.make(Math.max(0, Math.floor(n)))
}
export type { TempHP }

const DamageAmount = Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0), Schema.brand("DamageAmount"))
type DamageAmount = typeof DamageAmount.Type
export function damageAmount(n: number): DamageAmount {
  return DamageAmount.make(Math.max(0, Math.floor(n)))
}
export type { DamageAmount }

const HealAmount = Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1), Schema.brand("HealAmount"))
type HealAmount = typeof HealAmount.Type
export function healAmount(n: number): HealAmount {
  return HealAmount.make(Math.max(1, Math.floor(n)))
}
export type { HealAmount }

const DeathSaveCount = Schema.Literal(0, 1, 2, 3).pipe(Schema.brand("DeathSaveCount"))
type DeathSaveCount = typeof DeathSaveCount.Type
export function deathSaveCount(n: number): DeathSaveCount {
  return DeathSaveCount.make(Math.max(0, Math.min(3, Math.floor(n))) as 0 | 1 | 2 | 3)
}
export type { DeathSaveCount }

const D20Roll = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(20),
  Schema.brand("D20Roll")
)
type D20Roll = typeof D20Roll.Type
export function d20Roll(n: number): D20Roll {
  const MIN = 1
  const MAX = 20
  return D20Roll.make(Math.max(MIN, Math.min(MAX, Math.floor(n))))
}
export type { D20Roll }

const ExhaustionLevel = Schema.Literal(0, 1, 2, 3, 4, 5, 6).pipe(Schema.brand("ExhaustionLevel"))
type ExhaustionLevel = typeof ExhaustionLevel.Type
export function exhaustionLevel(n: number): ExhaustionLevel {
  const MAX = 6
  return ExhaustionLevel.make(Math.max(0, Math.min(MAX, Math.floor(n))) as 0 | 1 | 2 | 3 | 4 | 5 | 6)
}
export type { ExhaustionLevel }

const AbilityScore = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(30),
  Schema.brand("AbilityScore")
)
type AbilityScore = typeof AbilityScore.Type
export function abilityScore(n: number): AbilityScore {
  const MAX = 30
  return AbilityScore.make(Math.max(1, Math.min(MAX, Math.floor(n))))
}
export type { AbilityScore }

const ProficiencyBonus = Schema.Literal(2, 3, 4, 5, 6).pipe(Schema.brand("ProficiencyBonus"))
type ProficiencyBonus = typeof ProficiencyBonus.Type
export function proficiencyBonus(n: number): ProficiencyBonus {
  const MIN = 2
  const MAX = 6
  return ProficiencyBonus.make(Math.max(MIN, Math.min(MAX, Math.floor(n))) as 2 | 3 | 4 | 5 | 6)
}
export type { ProficiencyBonus }

const MovementFeet = Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0), Schema.brand("MovementFeet"))
type MovementFeet = typeof MovementFeet.Type
export function movementFeet(n: number): MovementFeet {
  return MovementFeet.make(Math.max(0, Math.floor(n)))
}
export type { MovementFeet }

export type CasterType = "full" | "half" | "third"

export type SpellSlots = ReadonlyArray<number>

const SPELL_SLOT_LEVELS = 9
export const EMPTY_SLOTS: SpellSlots = Array.from({ length: SPELL_SLOT_LEVELS }, () => 0)

// --- Record types ---

export interface DeathSaves {
  readonly successes: DeathSaveCount
  readonly failures: DeathSaveCount
}

export const DEATH_SAVES_RESET: DeathSaves = {
  successes: deathSaveCount(0),
  failures: deathSaveCount(0)
}
