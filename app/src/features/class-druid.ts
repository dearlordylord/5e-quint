// Druid class features: Wild Shape, Primal Order, Elemental Fury,
// Wild Companion, Wild Resurgence, Beast Spells, Archdruid
// SRD 5.2.1 Druid

import type { DamageType } from "#/types.ts"

// --- Types ---

export type PrimalOrderChoice = "magician" | "warden"

export type ElementalFuryChoice = "potentSpellcasting" | "primalStrike"

export type PrimalStrikeDamageType = Extract<DamageType, "cold" | "fire" | "lightning" | "thunder">

export interface WildShapeState {
  readonly inWildShape: boolean
  readonly wildShapeCharges: number
  readonly wildShapeHp: number
  readonly wildShapeMaxHp: number
  readonly wildShapeTempHp: number
  readonly originalHp: number
  readonly bonusActionUsed: boolean
}

export interface WildShapeForm {
  readonly cr: number // e.g. 0.25 for CR 1/4, 0.5 for CR 1/2
  readonly maxHp: number
  readonly hasFlySpeed: boolean
}

// --- Wild Shape charges by level ---

/** Wild Shape max uses from the Druid Features table (SRD 5.2.1). */
export function wildShapeMaxCharges(druidLevel: number): number {
  if (druidLevel < 2) return 0
  if (druidLevel <= 5) return 2
  if (druidLevel <= 16) return 3
  return 4
}

// --- Wild Shape CR cap ---

/** Maximum CR for Wild Shape beast forms (SRD 5.2.1 Beast Shapes table). */
export function wildShapeCRCap(druidLevel: number): number {
  if (druidLevel < 2) return 0
  if (druidLevel < 4) return 0.25
  if (druidLevel < 8) return 0.5
  return 1
}

/** Whether fly speed forms are allowed (druid level 8+). */
export function wildShapeCanFly(druidLevel: number): boolean {
  return druidLevel >= 8
}

// --- Wild Shape form eligibility ---

export function isFormEligible(druidLevel: number, form: WildShapeForm): boolean {
  if (form.cr > wildShapeCRCap(druidLevel)) return false
  if (form.hasFlySpeed && !wildShapeCanFly(druidLevel)) return false
  return true
}

// --- Enter Wild Shape ---

export interface EnterWildShapeConfig {
  readonly druidLevel: number
  readonly form: WildShapeForm
}

export interface EnterWildShapeResult {
  readonly inWildShape: true
  readonly wildShapeCharges: number
  readonly wildShapeHp: number
  readonly wildShapeMaxHp: number
  readonly wildShapeTempHp: number
  readonly originalHp: number
  readonly bonusActionUsed: true
}

/** Precondition: can enter Wild Shape. */
export function canEnterWildShape(state: WildShapeState, config: EnterWildShapeConfig): boolean {
  return (
    !state.inWildShape &&
    state.wildShapeCharges > 0 &&
    !state.bonusActionUsed &&
    config.druidLevel >= 2 &&
    isFormEligible(config.druidLevel, config.form)
  )
}

/**
 * Enter Wild Shape from normal form. Caller provides current HP to store for revert.
 * Expends one Wild Shape use as a Bonus Action. Temp HP = druid level (SRD 5.2.1).
 */
export function enterWildShape(
  state: WildShapeState,
  config: EnterWildShapeConfig,
  currentHp: number
): EnterWildShapeResult {
  return {
    inWildShape: true,
    wildShapeCharges: state.wildShapeCharges - 1,
    wildShapeHp: config.form.maxHp,
    wildShapeMaxHp: config.form.maxHp,
    wildShapeTempHp: config.druidLevel,
    originalHp: currentHp,
    bonusActionUsed: true
  }
}

// --- Exit Wild Shape ---

export interface ExitWildShapeResult {
  readonly inWildShape: false
  readonly wildShapeHp: 0
  readonly wildShapeMaxHp: 0
  readonly wildShapeTempHp: 0
  readonly restoredHp: number
  readonly bonusActionUsed: true
}

/** Precondition: can voluntarily exit Wild Shape. */
export function canExitWildShape(state: WildShapeState): boolean {
  return state.inWildShape && !state.bonusActionUsed
}

/**
 * Exit Wild Shape voluntarily as a Bonus Action. Restores original HP.
 */
export function exitWildShape(state: WildShapeState): ExitWildShapeResult {
  return {
    inWildShape: false,
    wildShapeHp: 0,
    wildShapeMaxHp: 0,
    wildShapeTempHp: 0,
    restoredHp: state.originalHp,
    bonusActionUsed: true
  }
}

// --- Wild Shape Damage ---

export interface WildShapeDamageResult {
  readonly wildShapeHp: number
  readonly wildShapeTempHp: number
  readonly inWildShape: boolean
  readonly restoredHp: number // 0 if still in wild shape; originalHp if reverted
  readonly overflowDamage: number // damage that carries over to original form
}

/**
 * Apply damage while in Wild Shape.
 * Temp HP absorbs first, then beast HP. If beast HP reaches 0, revert to original form
 * and carry over excess damage.
 */
export function wildShapeDamage(state: WildShapeState, amount: number): WildShapeDamageResult {
  // Temp HP absorbs first
  let remaining = amount
  let newTempHp = state.wildShapeTempHp

  if (newTempHp > 0) {
    if (remaining <= newTempHp) {
      return {
        wildShapeHp: state.wildShapeHp,
        wildShapeTempHp: newTempHp - remaining,
        inWildShape: true,
        restoredHp: 0,
        overflowDamage: 0
      }
    }
    remaining -= newTempHp
    newTempHp = 0
  }

  // Beast HP absorbs remaining
  const newBeastHp = state.wildShapeHp - remaining

  if (newBeastHp > 0) {
    return {
      wildShapeHp: newBeastHp,
      wildShapeTempHp: newTempHp,
      inWildShape: true,
      restoredHp: 0,
      overflowDamage: 0
    }
  }

  // Beast HP drops to 0: revert, overflow carries to original form
  const overflow = Math.abs(newBeastHp) // excess damage
  return {
    wildShapeHp: 0,
    wildShapeTempHp: 0,
    inWildShape: false,
    restoredHp: state.originalHp,
    overflowDamage: overflow
  }
}

// --- Wild Companion (Level 2) ---

export interface WildCompanionState {
  readonly wildShapeCharges: number
}

/** Precondition: can use Wild Companion (expend Wild Shape use or spell slot). */
export function canUseWildCompanion(charges: number): boolean {
  return charges > 0
}

/**
 * Wild Companion: expend a Wild Shape use to cast Find Familiar (as a Magic action).
 * SRD 5.2.1: can also expend a spell slot instead, but this function models the
 * Wild Shape charge path.
 */
export function useWildCompanion(state: WildCompanionState): {
  readonly wildShapeCharges: number
} {
  return {
    wildShapeCharges: state.wildShapeCharges - 1
  }
}

// --- Wild Resurgence (Level 5) ---

export interface WildResurgenceState {
  readonly wildShapeCharges: number
  readonly wildResurgenceSlotUsedThisLR: boolean // tracks the "regain slot" part, 1/LR
}

/**
 * Wild Resurgence part 1: expend a spell slot to regain 1 Wild Shape use.
 * Precondition: no Wild Shape uses left, have a spell slot to expend.
 * Once per turn (enforced by caller). Druid level >= 5.
 */
export function canUseWildResurgenceForCharge(
  wildShapeCharges: number,
  druidLevel: number,
  hasSpellSlot: boolean
): boolean {
  return druidLevel >= 5 && wildShapeCharges === 0 && hasSpellSlot
}

export function wildResurgenceGainCharge(state: WildResurgenceState): {
  readonly wildShapeCharges: number
} {
  return {
    wildShapeCharges: state.wildShapeCharges + 1
  }
}

/**
 * Wild Resurgence part 2: expend a Wild Shape use to regain a level 1 spell slot.
 * 1/Long Rest. Druid level >= 5.
 */
export function canUseWildResurgenceForSlot(
  wildShapeCharges: number,
  druidLevel: number,
  usedThisLR: boolean
): boolean {
  return druidLevel >= 5 && wildShapeCharges > 0 && !usedThisLR
}

export function wildResurgenceGainSlot(state: WildResurgenceState): {
  readonly wildShapeCharges: number
  readonly wildResurgenceSlotUsedThisLR: true
} {
  return {
    wildShapeCharges: state.wildShapeCharges - 1,
    wildResurgenceSlotUsedThisLR: true
  }
}

// --- Spellcasting while shifted ---

/**
 * Can cast spells while in Wild Shape?
 * SRD 5.2.1: No spellcasting in beast form, UNLESS Beast Spells (level 18+),
 * which allows casting except spells with costly/consumed Material components.
 */
export function canCastInWildShape(druidLevel: number, hasCostlyMaterial: boolean): boolean {
  if (druidLevel < 18) return false
  return !hasCostlyMaterial
}

// --- Elemental Fury: Primal Strike (Level 7) ---

export interface PrimalStrikeConfig {
  readonly druidLevel: number
  readonly chosenElement: PrimalStrikeDamageType
  readonly d8Roll: number // 1-8 for the damage die
  readonly secondD8Roll?: number // for Improved Elemental Fury (level 15+), second d8
}

export interface PrimalStrikeResult {
  readonly extraDamage: number
  readonly damageType: PrimalStrikeDamageType
}

/** Precondition: can use Primal Strike (Elemental Fury choice = primalStrike, level 7+). */
export function canUsePrimalStrike(druidLevel: number, elementalFuryChoice: ElementalFuryChoice | null): boolean {
  return druidLevel >= 7 && elementalFuryChoice === "primalStrike"
}

/**
 * Primal Strike: on a hit, deal extra 1d8 elemental damage (2d8 at level 15+).
 * Once per turn (enforced by caller).
 */
export function usePrimalStrike(config: PrimalStrikeConfig): PrimalStrikeResult {
  const isImproved = config.druidLevel >= 15
  const extraDamage = isImproved ? config.d8Roll + (config.secondD8Roll ?? 0) : config.d8Roll

  return {
    extraDamage,
    damageType: config.chosenElement
  }
}

// --- Potent Spellcasting (Level 7) ---

/**
 * Potent Spellcasting: add Wisdom modifier to cantrip damage.
 * At level 15 (Improved), cantrip range also increases by 300 ft (modeled by caller).
 */
export function potentSpellcastingBonus(
  druidLevel: number,
  elementalFuryChoice: ElementalFuryChoice | null,
  wisdomModifier: number
): number {
  if (druidLevel < 7 || elementalFuryChoice !== "potentSpellcasting") return 0
  return wisdomModifier
}

// --- Primal Order: Warden ---

/**
 * Warden Primal Order does NOT grant extra melee damage in SRD 5.2.1.
 * It grants martial weapon proficiency and medium armor training.
 * Modeled as a flag; no damage function needed.
 */
export function isWarden(primalOrderChoice: PrimalOrderChoice | null): boolean {
  return primalOrderChoice === "warden"
}

export function isMagician(primalOrderChoice: PrimalOrderChoice | null): boolean {
  return primalOrderChoice === "magician"
}

// --- Rest recovery ---

/** Short rest: regain one expended Wild Shape use (up to max). */
export function druidShortRest(wildShapeCharges: number, druidLevel: number): { readonly wildShapeCharges: number } {
  const max = wildShapeMaxCharges(druidLevel)
  return {
    wildShapeCharges: Math.min(wildShapeCharges + 1, max)
  }
}

/** Long rest: regain all Wild Shape uses; reset Wild Resurgence slot tracker. */
export function druidLongRest(druidLevel: number): {
  readonly wildShapeCharges: number
  readonly wildResurgenceSlotUsedThisLR: false
  readonly inWildShape: false
  readonly wildShapeHp: 0
  readonly wildShapeMaxHp: 0
  readonly wildShapeTempHp: 0
} {
  return {
    wildShapeCharges: wildShapeMaxCharges(druidLevel),
    wildResurgenceSlotUsedThisLR: false,
    inWildShape: false,
    wildShapeHp: 0,
    wildShapeMaxHp: 0,
    wildShapeTempHp: 0
  }
}

// --- Archdruid (Level 20) ---

/**
 * Evergreen Wild Shape: on rolling initiative with no Wild Shape uses, regain 1.
 */
export function archdruidEvergreenWildShape(
  wildShapeCharges: number,
  druidLevel: number
): { readonly wildShapeCharges: number } {
  if (druidLevel < 20 || wildShapeCharges > 0) {
    return { wildShapeCharges }
  }
  return { wildShapeCharges: 1 }
}

/**
 * Nature Magician: convert Wild Shape uses into a spell slot.
 * Each use contributes 2 spell levels. 1/Long Rest (enforced by caller).
 */
export function archdruidNatureMagician(
  wildShapeCharges: number,
  usesToConvert: number
): { readonly wildShapeCharges: number; readonly spellSlotLevel: number } | null {
  if (usesToConvert <= 0 || usesToConvert > wildShapeCharges) return null
  return {
    wildShapeCharges: wildShapeCharges - usesToConvert,
    spellSlotLevel: usesToConvert * 2
  }
}
