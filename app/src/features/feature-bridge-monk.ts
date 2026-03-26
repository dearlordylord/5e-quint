// --- Monk bridge functions ---
// Wires pure functions from class-monk.ts and class-monk-features.ts into the integration layer.

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
import {
  canDeflectAttacks,
  canSlowFall,
  canUseQuiveringPalm,
  canUseSuperiorDefense,
  canUseWholenessOfBody,
  hasDeflectEnergy,
  hasDisciplinedSurvivor
} from "#/features/class-monk-features.ts"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import type { FeatureState } from "#/features/feature-store.ts"
import type { DndContext, DndEvent } from "#/machine-types.ts"
import type { Condition } from "#/types.ts"
import { healAmount } from "#/types.ts"

// --- Passive re-exports ---

export {
  canSelfRestore,
  hasDeflectEnergy,
  hasDisciplinedSurvivor,
  hasFleetStep,
  hasFocusEmpoweredStrikes,
  selfRestorationConditions,
  unarmoredMovementBonus
} from "#/features/class-monk-features.ts"

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

// --- Deflect Attacks (reaction) ---

export function canExecuteDeflectAttacks(
  featureState: FeatureState,
  ctx: DndContext,
  monkLevel: number,
  isWeaponAttack: boolean
): boolean {
  if (!featureState.monk) return false
  return canDeflectAttacks(monkLevel, ctx.reactionAvailable, isWeaponAttack, hasDeflectEnergy(monkLevel))
}

export function executeDeflectAttacks(): BridgeResult {
  return {
    featureAction: { type: "MONK_USE_DEFLECT_ATTACKS" },
    machineEvents: [{ type: "USE_REACTION" }]
  }
}

// --- Slow Fall (reaction) ---

export function canExecuteSlowFall(featureState: FeatureState, ctx: DndContext, monkLevel: number): boolean {
  if (!featureState.monk) return false
  return canSlowFall(monkLevel, ctx.reactionAvailable)
}

export function executeSlowFall(): BridgeResult {
  return {
    featureAction: { type: "MONK_USE_SLOW_FALL" },
    machineEvents: [{ type: "USE_REACTION" }]
  }
}

// --- Superior Defense (action + 3 FP) ---

const SUPERIOR_DEFENSE_FP_COST = 3

export function canExecuteSuperiorDefense(featureState: FeatureState, ctx: DndContext, monkLevel: number): boolean {
  if (!featureState.monk) return false
  return canUseSuperiorDefense(monkLevel, featureState.monk.focusPoints, ctx.actionsRemaining)
}

export function executeSuperiorDefense(): BridgeResult {
  return {
    featureAction: { type: "MONK_EXPEND_FOCUS", cost: SUPERIOR_DEFENSE_FP_COST },
    machineEvents: [{ type: "USE_ACTION", actionType: "utilize" }]
  }
}

// --- Wholeness of Body (bonus action, charges) ---

export function canExecuteWholenessOfBody(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.monk) return false
  return canUseWholenessOfBody(featureState.monk.wholenessOfBodyCharges, ctx.bonusActionUsed)
}

export function executeWholenessOfBody(featureState: FeatureState, martialArtsDieRoll: number, wisMod: number): BridgeResult {
  if (!featureState.monk) throw new Error("executeWholenessOfBody called without monk state")
  const healAmt = Math.max(1, martialArtsDieRoll + wisMod)
  const chargesAfter = featureState.monk.wholenessOfBodyCharges - 1
  return {
    featureAction: { type: "MONK_USE_WHOLENESS_OF_BODY", chargesAfter },
    machineEvents: [{ type: "USE_BONUS_ACTION" }, { type: "HEAL", amount: healAmount(healAmt) }]
  }
}

// --- Quivering Palm (4 FP, no action cost) ---

const QUIVERING_PALM_FP_COST = 4

export function canExecuteQuiveringPalm(featureState: FeatureState, monkLevel: number): boolean {
  if (!featureState.monk) return false
  return canUseQuiveringPalm(monkLevel, featureState.monk.focusPoints)
}

export function executeQuiveringPalm(): BridgeResult {
  return {
    featureAction: { type: "MONK_EXPEND_FOCUS", cost: QUIVERING_PALM_FP_COST },
    machineEvents: []
  }
}

export function executeTriggerQuiveringPalm(): BridgeResult {
  return {
    featureAction: { type: "MONK_TRIGGER_QUIVERING_PALM" },
    machineEvents: []
  }
}

// --- Disciplined Survivor Reroll (1 FP, no action cost) ---

export function canExecuteDisciplinedSurvivorReroll(featureState: FeatureState, monkLevel: number): boolean {
  if (!featureState.monk) return false
  return hasDisciplinedSurvivor(monkLevel) && featureState.monk.focusPoints >= FOCUS_ACTION_COST
}

export function executeDisciplinedSurvivorReroll(): BridgeResult {
  return {
    featureAction: { type: "MONK_EXPEND_FOCUS", cost: FOCUS_ACTION_COST },
    machineEvents: []
  }
}
