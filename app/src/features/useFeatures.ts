import { useCallback, useMemo, useReducer } from "react"

import type { DndEvent } from "#/machine-types.ts"
import type { DndSnapshot } from "#/machine.ts"

import type { BridgeResult } from "#/features/feature-bridge.ts"
import { canExecuteSecondWind, executeSecondWind } from "#/features/feature-bridge.ts"
import {
  createInitialFeatureState,
  type FeatureAction,
  type FeatureConfig,
  featureReducer,
  type FeatureState
} from "#/features/feature-store.ts"

export type { FeatureConfig } from "#/features/feature-store.ts"

export interface UseFeatures {
  readonly featureState: FeatureState
  readonly canSecondWind: boolean
  readonly secondWind: (d10Roll: number) => BridgeResult | null
  readonly notify: (event: DndEvent) => void
  readonly resetToInitial: () => void
  readonly dispatch: (action: FeatureAction) => void
}

export function useFeatures(
  config: FeatureConfig,
  snapshot: DndSnapshot | null
): UseFeatures {
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

  const secondWind = useCallback(
    (d10Roll: number): BridgeResult | null => {
      if (!ctx) return null
      const result = executeSecondWind(featureState, ctx, d10Roll, config.level)
      dispatch(result.featureAction)
      return result
    },
    [featureState, ctx, config.level]
  )

  const resetToInitial = useCallback(() => {
    dispatch({ type: "RESET" })
  }, [])

  return { featureState, canSecondWind, secondWind, notify, resetToInitial, dispatch }
}
