// --- Fighter extras hook section (Tactical Mind, Indomitable, Champion) ---
// Extracted from useFeatures.ts to stay under eslint max-lines (420).

import { useCallback } from "react"

import type { BridgeResult } from "#/features/feature-bridge.ts"
import {
  canExecuteIndomitable,
  canExecuteTacticalMind,
  championCritRange,
  executeIndomitable,
  executeTacticalMind,
  hasRemarkableAthlete,
  heroicWarriorInspiration,
  remarkableAthleteCritMovement,
  survivorDefyDeathAdvantage,
  survivorHeroicRally
} from "#/features/feature-bridge.ts"
import type { FeatureAction, FeatureState } from "#/features/feature-store.ts"

// eslint-disable-next-line functional/no-mixed-types -- hook return bundles state + methods by design
export interface FighterExtrasHookResult {
  readonly canTacticalMind: (checkFailed: boolean) => boolean
  readonly tacticalMind: (boostedCheckSucceeded: boolean) => BridgeResult | null
  readonly canIndomitable: boolean
  readonly indomitable: () => BridgeResult | null
  readonly championCritRange: number
  readonly hasRemarkableAthlete: boolean
  readonly remarkableAthleteCritMovement: (effectiveSpeed: number) => number
  readonly heroicWarriorInspiration: (hasHeroicInspiration: boolean) => boolean
  readonly survivorDefyDeathAdvantage: boolean
  readonly survivorHeroicRally: (currentHp: number, maxHp: number, conMod: number) => number
}

export function useFighterExtras(
  featureState: FeatureState,
  level: number,
  championLevel: number,
  dispatch: (action: FeatureAction) => void
): FighterExtrasHookResult {
  const canTacticalMind = useCallback(
    (checkFailed: boolean): boolean => canExecuteTacticalMind(featureState, level, checkFailed),
    [featureState, level]
  )

  const tacticalMind = useCallback(
    (boostedCheckSucceeded: boolean): BridgeResult | null => {
      const result = executeTacticalMind(boostedCheckSucceeded)
      dispatch(result.featureAction)
      return result
    },
    [dispatch]
  )

  const canIndomitableVal = canExecuteIndomitable(featureState, level)

  const indomitableCb = useCallback((): BridgeResult | null => {
    const result = executeIndomitable()
    dispatch(result.featureAction)
    return result
  }, [dispatch])

  const champCritRange = championCritRange(championLevel)
  const hasRemarkableAthleteVal = hasRemarkableAthlete(championLevel)
  const remarkableAthleteCritMovementFn = useCallback(
    (effectiveSpeed: number): number => remarkableAthleteCritMovement(championLevel, effectiveSpeed),
    [championLevel]
  )
  const heroicWarriorInspirationFn = useCallback(
    (hasInspiration: boolean): boolean => heroicWarriorInspiration(championLevel, hasInspiration),
    [championLevel]
  )
  const survivorDefyDeathAdvantageVal = survivorDefyDeathAdvantage(championLevel)
  const survivorHeroicRallyFn = useCallback(
    (currentHp: number, maxHp: number, conMod: number): number =>
      survivorHeroicRally(championLevel, currentHp, maxHp, conMod),
    [championLevel]
  )

  return {
    canTacticalMind,
    tacticalMind,
    canIndomitable: canIndomitableVal,
    indomitable: indomitableCb,
    championCritRange: champCritRange,
    hasRemarkableAthlete: hasRemarkableAthleteVal,
    remarkableAthleteCritMovement: remarkableAthleteCritMovementFn,
    heroicWarriorInspiration: heroicWarriorInspirationFn,
    survivorDefyDeathAdvantage: survivorDefyDeathAdvantageVal,
    survivorHeroicRally: survivorHeroicRallyFn
  }
}
