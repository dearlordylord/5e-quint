// --- Paladin bridge functions ---
// Extracted from feature-bridge.ts to stay under eslint max-lines (420).

import {
  type AbjureFoesResult,
  abjureFoesResult,
  auraOfCourageRange,
  auraOfProtectionBonus as auraOfProtectionBonusPure,
  auraOfProtectionRange,
  canAbjureFoes,
  canLayOnHandsCure as canLayOnHandsCurePure,
  canLayOnHandsHeal as canLayOnHandsHealPure,
  canPaladinSmiteFree as canPaladinSmiteFreePure,
  canUseAuraOfCourage,
  canUseAuraOfProtection as canUseAuraOfProtectionPure,
  canUseFaithfulSteed,
  canUseRestoringTouch,
  pDivineSmiteDamage as pDivineSmiteDamagePure,
  pLayOnHands as pLayOnHandsPure,
  pLayOnHandsCure as pLayOnHandsCurePure,
  pRadiantStrikes as pRadiantStrikesPure,
  type RadiantStrikesConfig
} from "#/features/class-paladin.ts"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import type { FeatureState } from "#/features/feature-store.ts"
import type { DndContext } from "#/machine-types.ts"
import type { Condition } from "#/types.ts"
import { healAmount } from "#/types.ts"

// --- Paladin: Lay on Hands ---

export function canExecuteLayOnHandsHeal(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.paladin || ctx.bonusActionUsed) return false
  return canLayOnHandsHealPure({
    hp: ctx.hp,
    maxHp: ctx.maxHp,
    layOnHandsPool: featureState.paladin.layOnHandsPool,
    conditions: []
  })
}

export function executeLayOnHandsHeal(featureState: FeatureState, ctx: DndContext, amount: number): BridgeResult {
  if (!featureState.paladin) throw new Error("executeLayOnHandsHeal called without paladin state")
  const result = pLayOnHandsPure(
    {
      hp: ctx.hp,
      maxHp: ctx.maxHp,
      layOnHandsPool: featureState.paladin.layOnHandsPool,
      conditions: []
    },
    amount
  )
  return {
    featureAction: { type: "PALADIN_LAY_ON_HANDS", poolAfter: result.layOnHandsPool },
    machineEvents: [{ type: "USE_BONUS_ACTION" }, { type: "HEAL", amount: healAmount(result.healedAmount) }]
  }
}

export function canExecuteLayOnHandsCure(
  featureState: FeatureState,
  condition: Condition,
  paladinLevel: number,
  currentConditions: ReadonlyArray<Condition>,
  bonusActionUsed: boolean
): boolean {
  if (!featureState.paladin || bonusActionUsed) return false
  return canLayOnHandsCurePure(
    {
      hp: 1,
      maxHp: 1,
      layOnHandsPool: featureState.paladin.layOnHandsPool,
      conditions: currentConditions
    },
    condition,
    paladinLevel
  )
}

export function executeLayOnHandsCure(featureState: FeatureState, condition: Condition): BridgeResult {
  if (!featureState.paladin) throw new Error("executeLayOnHandsCure called without paladin state")
  const result = pLayOnHandsCurePure(
    {
      hp: 1,
      maxHp: 1,
      layOnHandsPool: featureState.paladin.layOnHandsPool,
      conditions: [condition]
    },
    condition
  )
  return {
    featureAction: { type: "PALADIN_LAY_ON_HANDS_CURE", poolAfter: result.layOnHandsPool },
    machineEvents: [{ type: "USE_BONUS_ACTION" }, { type: "REMOVE_CONDITION", condition }]
  }
}

// --- Paladin: Smite (free use per turn) ---

export function canExecutePaladinSmiteFree(featureState: FeatureState): boolean {
  if (!featureState.paladin) return false
  return canPaladinSmiteFreePure({ paladinSmiteFreeUseAvailable: !featureState.paladin.smiteFreeUsed })
}

export function executePaladinSmiteFree(): BridgeResult {
  return {
    featureAction: { type: "PALADIN_SMITE_FREE" },
    machineEvents: []
  }
}

// --- Paladin: Query functions ---

export const getDivineSmiteDamage: (slotLevel: number, isUndeadOrFiend: boolean) => number = pDivineSmiteDamagePure

export const getAuraOfProtectionBonus: (paladinLevel: number, chaMod: number) => number = auraOfProtectionBonusPure

export const getCanUseAuraOfProtection: (paladinLevel: number, isConscious: boolean) => boolean =
  canUseAuraOfProtectionPure

export const getRadiantStrikesDice: (config: RadiantStrikesConfig) => number = pRadiantStrikesPure

// --- Passive re-exports ---

export const getCanUseAuraOfCourage: (paladinLevel: number, isConscious: boolean) => boolean =
  canUseAuraOfCourage

export const getAuraOfCourageRange: (paladinLevel: number) => number = auraOfCourageRange

export const getAuraOfProtectionRange: (paladinLevel: number) => number = auraOfProtectionRange

// --- Faithful Steed (Level 5, 1/LR) ---

export function canExecuteFaithfulSteed(featureState: FeatureState, paladinLevel: number): boolean {
  if (!featureState.paladin) return false
  return canUseFaithfulSteed(paladinLevel, featureState.paladin.faithfulSteedUsed)
}

export function executeFaithfulSteed(): BridgeResult {
  return { featureAction: { type: "PALADIN_USE_FAITHFUL_STEED" }, machineEvents: [] }
}

// --- Abjure Foes (Level 9, uses Channel Divinity + action) ---

export function canExecuteAbjureFoes(featureState: FeatureState, ctx: DndContext, paladinLevel: number): boolean {
  if (!featureState.paladin) return false
  return canAbjureFoes(paladinLevel, featureState.paladin.channelDivinityCharges, ctx.actionsRemaining)
}

export function executeAbjureFoes(): BridgeResult {
  return {
    featureAction: { type: "PALADIN_USE_ABJURE_FOES" },
    machineEvents: [{ type: "USE_ACTION", actionType: "magic" }]
  }
}

export function getAbjureFoesResult(targetSavePassed: boolean): AbjureFoesResult {
  return abjureFoesResult(targetSavePassed)
}

// --- Restoring Touch (Level 14, costs 5 from LoH pool) ---

const RESTORING_TOUCH_COST = 5

export function canExecuteRestoringTouch(featureState: FeatureState, paladinLevel: number): boolean {
  if (!featureState.paladin) return false
  return canUseRestoringTouch(paladinLevel, featureState.paladin.layOnHandsPool)
}

export function executeRestoringTouch(featureState: FeatureState): BridgeResult {
  if (!featureState.paladin) throw new Error("executeRestoringTouch called without paladin state")
  const poolAfter = featureState.paladin.layOnHandsPool - RESTORING_TOUCH_COST
  return {
    featureAction: { type: "PALADIN_RESTORING_TOUCH", poolAfter },
    machineEvents: []
  }
}
