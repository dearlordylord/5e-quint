// --- Rogue bridge functions ---
// Extracted from feature-bridge.ts to stay under eslint max-lines (420).

import type { CunningActionChoice, StrikeEffect } from "#/features/class-rogue.ts"
import {
  canApplyCunningStrike,
  canSneakAttack,
  canSteadyAim,
  canUseCunningAction,
  canUseStrokeOfLuck,
  elusiveCancelsAdvantage,
  hasSlipperyMind,
  reliableTalent,
  sneakAttackDice
} from "#/features/class-rogue.ts"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import type { FeatureState } from "#/features/feature-store.ts"
import type { DndContext } from "#/machine-types.ts"

// --- Rogue: Sneak Attack ---

export const getSneakAttackDice: (rogueLevel: number) => number = sneakAttackDice

export function canExecuteSneakAttack(
  featureState: FeatureState,
  _rogueLevel: number,
  params: {
    readonly hasAdvantage: boolean
    readonly hasDisadvantage: boolean
    readonly allyAdjacentAndNotIncapacitated: boolean
    readonly isFinesse: boolean
    readonly isRanged: boolean
  }
): boolean {
  if (!featureState.rogue) return false
  return canSneakAttack({
    ...params,
    sneakAttackUsedThisTurn: featureState.rogue.sneakAttackUsedThisTurn
  })
}

export function executeSneakAttack(): BridgeResult {
  return {
    featureAction: { type: "ROGUE_USE_SNEAK_ATTACK" },
    machineEvents: []
  }
}

// --- Rogue: Cunning Action (L2) ---

export function canExecuteCunningAction(featureState: FeatureState, rogueLevel: number, ctx: DndContext): boolean {
  if (!featureState.rogue) return false
  return canUseCunningAction(rogueLevel, ctx.bonusActionUsed)
}

export function executeCunningAction(_choice: CunningActionChoice): BridgeResult {
  return {
    featureAction: { type: "ROGUE_USE_CUNNING_ACTION" },
    machineEvents: [{ type: "USE_BONUS_ACTION" }]
  }
}

// --- Rogue: Steady Aim (L3) ---

export function canExecuteSteadyAim(featureState: FeatureState, rogueLevel: number, ctx: DndContext): boolean {
  if (!featureState.rogue) return false
  return canSteadyAim({
    rogueLevel,
    bonusActionUsed: ctx.bonusActionUsed,
    hasMovedThisTurn: false,
    steadyAimUsedThisTurn: featureState.rogue.steadyAimUsed
  })
}

export function executeSteadyAim(): BridgeResult {
  return {
    featureAction: { type: "ROGUE_USE_STEADY_AIM" },
    machineEvents: [{ type: "USE_BONUS_ACTION" }]
  }
}

// --- Rogue: Cunning Strike (L5, query only) ---

export function canExecuteCunningStrike(
  featureState: FeatureState,
  rogueLevel: number,
  sneakAttackDiceUsed: number,
  effect: StrikeEffect
): boolean {
  if (!featureState.rogue) return false
  const totalDice = sneakAttackDice(rogueLevel)
  return canApplyCunningStrike({
    rogueLevel,
    sneakAttackDiceRemaining: totalDice - sneakAttackDiceUsed,
    effect
  })
}

// --- Rogue: Stroke of Luck (L20) ---

export function canExecuteStrokeOfLuck(featureState: FeatureState, rogueLevel: number): boolean {
  if (!featureState.rogue) return false
  return canUseStrokeOfLuck(rogueLevel, featureState.rogue.strokeOfLuckUsed)
}

export function executeStrokeOfLuck(): BridgeResult {
  return {
    featureAction: { type: "ROGUE_USE_STROKE_OF_LUCK" },
    machineEvents: []
  }
}

// --- Rogue: Passive queries ---

export const getReliableTalent: (rogueLevel: number, d20Roll: number, isProficient: boolean) => number = reliableTalent

export const getHasSlipperyMind: (rogueLevel: number) => boolean = hasSlipperyMind

export const getElusiveCancelsAdvantage: (rogueLevel: number, isIncapacitated: boolean) => boolean =
  elusiveCancelsAdvantage
