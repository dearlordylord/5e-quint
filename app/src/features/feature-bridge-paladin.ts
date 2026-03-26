// --- Paladin bridge functions ---
// Extracted from feature-bridge.ts to stay under eslint max-lines (420).

import {
  auraOfProtectionBonus as auraOfProtectionBonusPure,
  canLayOnHandsCure as canLayOnHandsCurePure,
  canLayOnHandsHeal as canLayOnHandsHealPure,
  canPaladinSmiteFree as canPaladinSmiteFreePure,
  canUseAuraOfProtection as canUseAuraOfProtectionPure,

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
