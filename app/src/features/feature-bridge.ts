import { canUseActionSurge, canUseSecondWind, useSecondWind as applySecondWind } from "#/features/class-fighter.ts"
import type { FeatureAction, FeatureState } from "#/features/feature-store.ts"
import type { DndContext, DndEvent } from "#/machine-types.ts"
import { healAmount } from "#/types.ts"

export interface BridgeResult {
  readonly featureAction: FeatureAction
  readonly machineEvents: ReadonlyArray<DndEvent>
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
  const result = applySecondWind(
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
    machineEvents: [{ type: "USE_BONUS_ACTION" }, { type: "HEAL", amount: healAmount(result.healAmount) }]
  }
}

export function canExecuteActionSurge(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.fighter) return false
  return canUseActionSurge({
    actionSurgeCharges: featureState.fighter.actionSurgeCharges,
    actionSurgeUsedThisTurn: featureState.fighter.actionSurgeUsedThisTurn,
    actionsRemaining: ctx.actionsRemaining
  })
}

export function executeActionSurge(featureState: FeatureState): BridgeResult {
  if (!featureState.fighter) throw new Error("executeActionSurge called without fighter state")
  return {
    featureAction: { type: "FIGHTER_USE_ACTION_SURGE" },
    machineEvents: [{ type: "GRANT_EXTRA_ACTION" }]
  }
}
