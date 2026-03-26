// --- Monk bridge functions ---
// Extracted from feature-bridge.ts to stay under eslint max-lines (420).

import type { WeaponCategory } from "#/features/class-monk.ts"
import {
  canFlurryOfBlows,
  canPatientDefenseFocus,
  canPatientDefenseFree,
  canStepOfTheWindFocus,
  canStepOfTheWindFree,
  canStunningStrike,
  FOCUS_ACTION_COST,
  pBonusUnarmedStrikeEligible,
  pMartialArtsDie,
  pUncannyMetabolism,
  useStunningStrike as applyStunningStrike
} from "#/features/class-monk.ts"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import type { FeatureState } from "#/features/feature-store.ts"
import type { DndContext, DndEvent } from "#/machine-types.ts"
import type { Condition } from "#/types.ts"
import { healAmount } from "#/types.ts"

// --- Flurry of Blows ---

export function canExecuteFlurryOfBlows(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.monk) return false
  return canFlurryOfBlows(featureState.monk.focusPoints, ctx.bonusActionUsed)
}

const EXPEND_FOCUS_BONUS_ACTION: BridgeResult = {
  featureAction: { type: "MONK_EXPEND_FOCUS", cost: FOCUS_ACTION_COST },
  machineEvents: [{ type: "USE_BONUS_ACTION" }]
}

const FREE_BONUS_ACTION: BridgeResult = {
  featureAction: { type: "NOTIFY_START_TURN" }, // no store-side state change for free version
  machineEvents: [{ type: "USE_BONUS_ACTION" }]
}

export function executeFlurryOfBlows(): BridgeResult {
  return EXPEND_FOCUS_BONUS_ACTION
}

// --- Patient Defense (free) ---

export function canExecutePatientDefenseFree(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.monk) return false
  return canPatientDefenseFree(ctx.bonusActionUsed)
}

export function executePatientDefenseFree(): BridgeResult {
  return FREE_BONUS_ACTION
}

// --- Patient Defense (focus) ---

export function canExecutePatientDefenseFocus(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.monk) return false
  return canPatientDefenseFocus(featureState.monk.focusPoints, ctx.bonusActionUsed)
}

export function executePatientDefenseFocus(): BridgeResult {
  return EXPEND_FOCUS_BONUS_ACTION
}

// --- Step of the Wind (free) ---

export function canExecuteStepOfTheWindFree(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.monk) return false
  return canStepOfTheWindFree(ctx.bonusActionUsed)
}

export function executeStepOfTheWindFree(): BridgeResult {
  return FREE_BONUS_ACTION
}

// --- Step of the Wind (focus) ---

export function canExecuteStepOfTheWindFocus(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.monk) return false
  return canStepOfTheWindFocus(featureState.monk.focusPoints, ctx.bonusActionUsed)
}

export function executeStepOfTheWindFocus(): BridgeResult {
  return EXPEND_FOCUS_BONUS_ACTION
}

// --- Stunning Strike ---

export function canExecuteStunningStrike(
  featureState: FeatureState,
  monkLevel: number,
  stunningStrikeUsedThisTurn: boolean,
  weaponCategory: WeaponCategory
): boolean {
  if (!featureState.monk) return false
  return canStunningStrike(monkLevel, featureState.monk.focusPoints, stunningStrikeUsedThisTurn, weaponCategory)
}

export function executeStunningStrike(featureState: FeatureState, targetSavePassed: boolean): BridgeResult {
  if (!featureState.monk) throw new Error("executeStunningStrike called without monk state")
  const result = applyStunningStrike(featureState.monk.focusPoints, targetSavePassed)
  const machineEvents: ReadonlyArray<DndEvent> = result.targetStunned
    ? [{ type: "APPLY_CONDITION", condition: "stunned" as Condition }]
    : []
  return {
    featureAction: { type: "MONK_EXPEND_FOCUS", cost: FOCUS_ACTION_COST },
    machineEvents
  }
}

// --- Uncanny Metabolism ---

/* eslint-disable no-magic-numbers */
export function canExecuteUncannyMetabolism(featureState: FeatureState, monkLevel: number): boolean {
  if (!featureState.monk) return false
  return monkLevel >= 2 && !featureState.monk.uncannyMetabolismUsed
}
/* eslint-enable no-magic-numbers */

export function executeUncannyMetabolism(featureState: FeatureState, monkLevel: number, d8Roll: number): BridgeResult {
  if (!featureState.monk) throw new Error("executeUncannyMetabolism called without monk state")
  const result = pUncannyMetabolism(
    {
      focusPoints: featureState.monk.focusPoints,
      focusMax: featureState.monk.focusMax,
      uncannyMetabolismUsed: featureState.monk.uncannyMetabolismUsed
    },
    monkLevel,
    d8Roll
  )
  if (!result.triggered) {
    return { featureAction: { type: "NOTIFY_START_TURN" }, machineEvents: [] } // no-op
  }
  return {
    featureAction: {
      type: "MONK_USE_UNCANNY_METABOLISM",
      focusPoints: result.focusPoints,
      uncannyMetabolismUsed: result.uncannyMetabolismUsed
    },
    machineEvents: [{ type: "HEAL", amount: healAmount(result.hpHealed) }]
  }
}

// --- Query functions (no BridgeResult -- pure data for UI) ---

export const getMartialArtsDie: (monkLevel: number) => number = pMartialArtsDie

export const getBonusUnarmedStrikeEligible: (
  tookAttackAction: boolean,
  attackWeaponCategory: WeaponCategory,
  wearingArmor: boolean,
  wieldingShield: boolean
) => boolean = pBonusUnarmedStrikeEligible
