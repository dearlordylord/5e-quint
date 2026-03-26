// --- Rogue hook section ---
// Extracted from useFeatures.ts to stay under eslint max-lines (420).

import { useCallback } from "react"

import type { CunningActionChoice, StrikeEffect } from "#/features/class-rogue.ts"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import {
  canExecuteCunningAction,
  canExecuteCunningStrike,
  canExecuteSneakAttack,
  canExecuteSteadyAim,
  canExecuteStrokeOfLuck,
  executeCunningAction,
  executeSneakAttack,
  executeSteadyAim,
  executeStrokeOfLuck,
  getElusiveCancelsAdvantage,
  getHasSlipperyMind,
  getReliableTalent,
  getSneakAttackDice
} from "#/features/feature-bridge.ts"
import type { FeatureAction, FeatureState } from "#/features/feature-store.ts"
import type { DndContext } from "#/machine-types.ts"

// eslint-disable-next-line functional/no-mixed-types -- hook return bundles state + methods by design
export interface RogueHookResult {
  readonly sneakAttackDice: number
  readonly canSneakAttack: (params: {
    readonly hasAdvantage: boolean
    readonly hasDisadvantage: boolean
    readonly allyAdjacentAndNotIncapacitated: boolean
    readonly isFinesse: boolean
    readonly isRanged: boolean
  }) => boolean
  readonly sneakAttack: () => BridgeResult | null
  readonly canCunningAction: boolean
  readonly cunningAction: (choice: CunningActionChoice) => BridgeResult | null
  readonly canSteadyAim: boolean
  readonly steadyAim: () => BridgeResult | null
  readonly canCunningStrike: (sneakAttackDiceUsed: number, effect: StrikeEffect) => boolean
  readonly canStrokeOfLuck: boolean
  readonly strokeOfLuck: () => BridgeResult | null
  readonly reliableTalent: (d20Roll: number, isProficient: boolean) => number
  readonly hasSlipperyMind: boolean
  readonly elusiveCancelsAdvantage: (isIncapacitated: boolean) => boolean
}

export function useRogueFeatures(
  featureState: FeatureState,
  ctx: DndContext | null,
  level: number,
  dispatch: (action: FeatureAction) => void
): RogueHookResult {
  const sneakAttackDiceVal = getSneakAttackDice(level)

  const canSneakAttackFn = useCallback(
    (params: {
      readonly hasAdvantage: boolean
      readonly hasDisadvantage: boolean
      readonly allyAdjacentAndNotIncapacitated: boolean
      readonly isFinesse: boolean
      readonly isRanged: boolean
    }): boolean => canExecuteSneakAttack(featureState, level, params),
    [featureState, level]
  )

  const sneakAttackCb = useCallback((): BridgeResult | null => {
    const result = executeSneakAttack()
    dispatch(result.featureAction)
    return result
  }, [dispatch])

  const canCunningActionVal = ctx ? canExecuteCunningAction(featureState, level, ctx) : false

  const cunningActionCb = useCallback(
    (choice: CunningActionChoice): BridgeResult | null => {
      const result = executeCunningAction(choice)
      dispatch(result.featureAction)
      return result
    },
    [dispatch]
  )

  const canSteadyAimVal = ctx ? canExecuteSteadyAim(featureState, level, ctx) : false

  const steadyAimCb = useCallback((): BridgeResult | null => {
    const result = executeSteadyAim()
    dispatch(result.featureAction)
    return result
  }, [dispatch])

  const canCunningStrikeFn = useCallback(
    (sneakAttackDiceUsed: number, effect: StrikeEffect): boolean =>
      canExecuteCunningStrike(featureState, level, sneakAttackDiceUsed, effect),
    [featureState, level]
  )

  const canStrokeOfLuckVal = canExecuteStrokeOfLuck(featureState, level)

  const strokeOfLuckCb = useCallback((): BridgeResult | null => {
    const result = executeStrokeOfLuck()
    dispatch(result.featureAction)
    return result
  }, [dispatch])

  const reliableTalentFn = useCallback(
    (d20Roll: number, isProficient: boolean): number => getReliableTalent(level, d20Roll, isProficient),
    [level]
  )

  const hasSlipperyMindVal = getHasSlipperyMind(level)

  const elusiveCancelsAdvantageFn = useCallback(
    (isIncapacitated: boolean): boolean => getElusiveCancelsAdvantage(level, isIncapacitated),
    [level]
  )

  return {
    sneakAttackDice: sneakAttackDiceVal,
    canSneakAttack: canSneakAttackFn,
    sneakAttack: sneakAttackCb,
    canCunningAction: canCunningActionVal,
    cunningAction: cunningActionCb,
    canSteadyAim: canSteadyAimVal,
    steadyAim: steadyAimCb,
    canCunningStrike: canCunningStrikeFn,
    canStrokeOfLuck: canStrokeOfLuckVal,
    strokeOfLuck: strokeOfLuckCb,
    reliableTalent: reliableTalentFn,
    hasSlipperyMind: hasSlipperyMindVal,
    elusiveCancelsAdvantage: elusiveCancelsAdvantageFn
  }
}
