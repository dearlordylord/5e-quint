import type { DndContext, DndEvent } from "#/machine-types.ts"
import { healAmount } from "#/types.ts"

import { canUseSecondWind, useSecondWind } from "#/features/class-fighter.ts"
import type { FeatureAction, FeatureState } from "#/features/feature-store.ts"

export interface BridgeResult {
  readonly featureAction: FeatureAction
  readonly machineEvents: readonly DndEvent[]
}

export function canExecuteSecondWind(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.fighter) return false
  return canUseSecondWind({
    hp: ctx.hp,
    maxHp: ctx.maxHp,
    secondWindCharges: featureState.fighter.secondWindCharges,
    bonusActionUsed: ctx.bonusActionUsed
  })
}

export function executeSecondWind(
  featureState: FeatureState,
  ctx: DndContext,
  d10Roll: number,
  fighterLevel: number
): BridgeResult {
  if (!featureState.fighter) throw new Error("executeSecondWind called without fighter state")
  const result = useSecondWind(
    {
      hp: ctx.hp,
      maxHp: ctx.maxHp,
      secondWindCharges: featureState.fighter.secondWindCharges,
      bonusActionUsed: ctx.bonusActionUsed
    },
    { d10Roll, fighterLevel },
    ctx.effectiveSpeed
  )

  return {
    featureAction: { type: "FIGHTER_USE_SECOND_WIND" },
    machineEvents: [
      { type: "USE_BONUS_ACTION" },
      { type: "HEAL", amount: healAmount(result.healAmount) }
    ]
  }
}
