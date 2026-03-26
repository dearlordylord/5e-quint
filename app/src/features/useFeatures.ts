import { useCallback, useMemo, useReducer } from "react"

import { canCastWhileRaging } from "#/features/class-barbarian.ts"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import {
  canExecuteActionSurge,
  canExecuteDeclareReckless,
  canExecuteEndRage,
  canExecuteEnterRage,
  canExecuteExtendRageBA,
  canExecuteSecondWind,
  executeActionSurge,
  executeDeclareReckless,
  executeEndRage,
  executeEnterRage,
  executeExtendRageBA,
  executeSecondWind,
  getIsRaging,
  getRageDamageBonus,
  getRageResistances
} from "#/features/feature-bridge.ts"
import {
  createInitialFeatureState,
  type FeatureAction,
  type FeatureConfig,
  featureReducer,
  type FeatureState
} from "#/features/feature-store.ts"
import type { DndSnapshot } from "#/machine.ts"
import type { DndEvent } from "#/machine-types.ts"
import type { DamageType } from "#/types.ts"

export type { FeatureConfig } from "#/features/feature-store.ts"

// eslint-disable-next-line functional/no-mixed-types -- hook return bundles state + methods by design
export interface UseFeatures {
  readonly featureState: FeatureState
  // Fighter
  readonly canSecondWind: boolean
  readonly canActionSurge: boolean
  readonly secondWind: (d10Roll: number) => BridgeResult | null
  readonly actionSurge: () => BridgeResult | null
  // Barbarian
  readonly canEnterRage: boolean
  readonly enterRage: () => BridgeResult | null
  readonly canEndRage: boolean
  readonly endRage: () => BridgeResult | null
  readonly canExtendRageBA: boolean
  readonly extendRageBA: () => BridgeResult | null
  readonly canDeclareReckless: boolean
  readonly declareReckless: () => BridgeResult | null
  readonly markAttackOrSave: () => void
  readonly isRaging: boolean
  readonly rageResistances: ReadonlySet<DamageType>
  readonly rageDamageBonus: number
  readonly canCastSpells: boolean
  // Shared
  readonly notify: (event: DndEvent) => void
  readonly resetToInitial: () => void
  readonly dispatch: (action: FeatureAction) => void
}

export function useFeatures(config: FeatureConfig, snapshot: DndSnapshot | null): UseFeatures {
  const initialState = useMemo(() => createInitialFeatureState(config), [config])
  const [featureState, dispatch] = useReducer(
    (state: FeatureState, action: FeatureAction) => featureReducer(state, action, config),
    initialState
  )

  const notify = useCallback((event: DndEvent) => {
    switch (event.type) {
      case "SHORT_REST":
        dispatch({ type: "NOTIFY_SHORT_REST" })
        break
      case "LONG_REST":
        dispatch({ type: "NOTIFY_LONG_REST" })
        break
      case "START_TURN":
        dispatch({ type: "NOTIFY_START_TURN" })
        break
      case "END_TURN":
        dispatch({ type: "NOTIFY_END_TURN" })
        break
    }
  }, [])

  const ctx = snapshot?.context ?? null

  // Fighter
  const canSecondWind = ctx ? canExecuteSecondWind(featureState, ctx) : false
  const canActionSurge = ctx ? canExecuteActionSurge(featureState, ctx) : false

  const secondWind = useCallback(
    (d10Roll: number): BridgeResult | null => {
      if (!ctx) return null
      const result = executeSecondWind(featureState, ctx, d10Roll, config.level)
      dispatch(result.featureAction)
      return result
    },
    [featureState, ctx, config.level]
  )

  const actionSurge = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeActionSurge(featureState)
    dispatch(result.featureAction)
    return result
  }, [featureState, ctx])

  // Barbarian
  const canEnterRageVal = ctx ? canExecuteEnterRage(featureState, ctx) : false

  const enterRage = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeEnterRage(featureState, ctx)
    dispatch(result.featureAction)
    return result
  }, [featureState, ctx])

  const canEndRageVal = canExecuteEndRage(featureState)

  const endRage = useCallback((): BridgeResult | null => {
    const result = executeEndRage()
    dispatch(result.featureAction)
    return result
  }, [])

  const canExtendRageBAVal = ctx ? canExecuteExtendRageBA(featureState, ctx) : false

  const extendRageBA = useCallback((): BridgeResult | null => {
    const result = executeExtendRageBA()
    dispatch(result.featureAction)
    return result
  }, [])

  const canDeclareRecklessVal = canExecuteDeclareReckless(featureState)

  const declareReckless = useCallback((): BridgeResult | null => {
    const result = executeDeclareReckless()
    dispatch(result.featureAction)
    return result
  }, [])

  const markAttackOrSave = useCallback(() => {
    dispatch({ type: "BARBARIAN_MARK_ATTACK_OR_SAVE" })
  }, [])

  const isRaging = getIsRaging(featureState)
  const rageRes = getRageResistances(featureState)
  const rageDmgBonus = getRageDamageBonus(featureState, config.level)
  const canCastSpells = featureState.barbarian ? canCastWhileRaging(featureState.barbarian.raging) : true

  const resetToInitial = useCallback(() => {
    dispatch({ type: "RESET" })
  }, [])

  return {
    featureState,
    canSecondWind,
    canActionSurge,
    secondWind,
    actionSurge,
    canEnterRage: canEnterRageVal,
    enterRage,
    canEndRage: canEndRageVal,
    endRage,
    canExtendRageBA: canExtendRageBAVal,
    extendRageBA,
    canDeclareReckless: canDeclareRecklessVal,
    declareReckless,
    markAttackOrSave,
    isRaging,
    rageResistances: rageRes,
    rageDamageBonus: rageDmgBonus,
    canCastSpells,
    notify,
    resetToInitial,
    dispatch
  }
}
