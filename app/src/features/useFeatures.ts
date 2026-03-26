import { useCallback, useMemo, useReducer } from "react"

import type { BridgeResult } from "#/features/feature-bridge.ts"
import {
  canExecuteActionSurge,
  canExecuteSecondWind,
  executeActionSurge,
  executeSecondWind
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

export type { FeatureConfig } from "#/features/feature-store.ts"

// eslint-disable-next-line functional/no-mixed-types -- hook return bundles state + methods by design
export interface UseFeatures {
  readonly featureState: FeatureState
  readonly canSecondWind: boolean
  readonly canActionSurge: boolean
  readonly secondWind: (d10Roll: number) => BridgeResult | null
  readonly actionSurge: () => BridgeResult | null
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
    }
  }, [])

  const ctx = snapshot?.context ?? null

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

  const resetToInitial = useCallback(() => {
    dispatch({ type: "RESET" })
  }, [])

  return { featureState, canSecondWind, canActionSurge, secondWind, actionSurge, notify, resetToInitial, dispatch }
}
