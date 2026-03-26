import { useCallback, useMemo, useReducer } from "react"

import { canCastWhileRaging } from "#/features/class-barbarian.ts"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import {
  canExecuteActionSurge,
  canExecuteDeclareReckless,
  canExecuteEndRage,
  canExecuteEnterRage,
  canExecuteExtendRageBA,
  canExecuteFrenzy,
  canExecuteIntimidatingPresence,
  canExecuteRetaliation,
  canExecuteSecondWind,
  executeActionSurge,
  executeDeclareReckless,
  executeEndRage,
  executeEnterRage,
  executeEnterRageWithMindlessRage,
  executeExtendRageBA,
  executeFrenzy,
  executeIntimidatingPresence,
  executeRetaliation,
  executeSecondWind,
  getFrenzyDamageDice,
  getIntimidatingPresenceDC,
  getIsRaging,
  getMindlessRageImmunities,
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
import type { Condition, DamageType } from "#/types.ts"

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
  readonly berserkerLevel: number
  // Berserker
  readonly canFrenzy: boolean
  readonly frenzy: () => BridgeResult | null
  readonly frenzyDamageDice: number
  readonly mindlessRageImmunities: ReadonlySet<Condition>
  readonly canRetaliation: boolean
  readonly retaliation: () => BridgeResult | null
  readonly canIntimidatingPresence: boolean
  readonly intimidatingPresence: () => BridgeResult | null
  readonly intimidatingPresenceDC: number
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

  const berserkerLevel = config.berserkerLevel ?? 0

  const enterRage = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result =
      berserkerLevel >= 6
        ? executeEnterRageWithMindlessRage(featureState, ctx, berserkerLevel, [])
        : executeEnterRage(featureState, ctx)
    dispatch(result.featureAction)
    return result
  }, [featureState, ctx, berserkerLevel])

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

  // Berserker
  // Frenzy: isStrengthBased defaults to true (caller can check canFrenzy before calling)
  const canFrenzyVal = canExecuteFrenzy(featureState, berserkerLevel, true)

  const frenzy = useCallback((): BridgeResult | null => {
    const result = executeFrenzy()
    dispatch(result.featureAction)
    return result
  }, [])

  const frenzyDice = getFrenzyDamageDice(featureState, config.level)

  const mindlessImmunities = getMindlessRageImmunities(featureState, berserkerLevel)

  const canRetaliationVal = ctx ? canExecuteRetaliation(featureState, ctx, berserkerLevel, false) : false

  const retaliationCb = useCallback((): BridgeResult | null => {
    const result = executeRetaliation()
    dispatch(result.featureAction)
    return result
  }, [])

  const canIntimidatingPresenceVal = ctx ? canExecuteIntimidatingPresence(featureState, ctx, berserkerLevel) : false

  const intimidatingPresenceCb = useCallback((): BridgeResult | null => {
    const result = executeIntimidatingPresence()
    dispatch(result.featureAction)
    return result
  }, [])

  const intimidatingDC = getIntimidatingPresenceDC(0, 0) // caller provides actual strMod/profBonus via config or UI

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
    berserkerLevel,
    canFrenzy: canFrenzyVal,
    frenzy,
    frenzyDamageDice: frenzyDice,
    mindlessRageImmunities: mindlessImmunities,
    canRetaliation: canRetaliationVal,
    retaliation: retaliationCb,
    canIntimidatingPresence: canIntimidatingPresenceVal,
    intimidatingPresence: intimidatingPresenceCb,
    intimidatingPresenceDC: intimidatingDC,
    notify,
    resetToInitial,
    dispatch
  }
}
