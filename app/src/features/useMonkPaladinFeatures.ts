// --- Monk + Paladin hook sections ---
// Extracted from useFeatures.ts to stay under eslint max-lines (420).

import { useCallback } from "react"

import type { BridgeResult } from "#/features/feature-bridge.ts"
import {
  canExecuteFlurryOfBlows,
  canExecuteLayOnHandsCure,
  canExecuteLayOnHandsHeal,
  canExecutePaladinSmiteFree,
  canExecutePatientDefenseFocus,
  canExecutePatientDefenseFree,
  canExecuteStepOfTheWindFocus,
  canExecuteStepOfTheWindFree,
  canExecuteStunningStrike,
  canExecuteUncannyMetabolism,
  executeFlurryOfBlows,
  executeLayOnHandsCure,
  executeLayOnHandsHeal,
  executePaladinSmiteFree,
  executePatientDefenseFocus,
  executePatientDefenseFree,
  executeStepOfTheWindFocus,
  executeStepOfTheWindFree,
  executeStunningStrike,
  executeUncannyMetabolism,
  getAuraOfProtectionBonus,
  getBonusUnarmedStrikeEligible,
  getCanUseAuraOfProtection,
  getDivineSmiteDamage,
  getHasDivineHealth,
  getMartialArtsDie,
  getRadiantStrikesDice
} from "#/features/feature-bridge.ts"
import type { FeatureAction, FeatureState } from "#/features/feature-store.ts"
import type { DndContext } from "#/machine-types.ts"
import type { Condition } from "#/types.ts"

// eslint-disable-next-line functional/no-mixed-types -- hook return bundles state + methods by design
export interface MonkPaladinHookResult {
  // Monk
  readonly canFlurryOfBlows: boolean
  readonly flurryOfBlows: () => BridgeResult | null
  readonly canPatientDefenseFree: boolean
  readonly patientDefenseFree: () => BridgeResult | null
  readonly canPatientDefenseFocus: boolean
  readonly patientDefenseFocus: () => BridgeResult | null
  readonly canStepOfTheWindFree: boolean
  readonly stepOfTheWindFree: () => BridgeResult | null
  readonly canStepOfTheWindFocus: boolean
  readonly stepOfTheWindFocus: () => BridgeResult | null
  readonly canStunningStrike: boolean
  readonly stunningStrike: (targetSavePassed: boolean) => BridgeResult | null
  readonly canUncannyMetabolism: boolean
  readonly uncannyMetabolism: (d8Roll: number) => BridgeResult | null
  readonly martialArtsDie: number
  readonly bonusUnarmedStrikeEligible: boolean
  // Paladin
  readonly canLayOnHandsHeal: boolean
  readonly layOnHandsHeal: (amount: number) => BridgeResult | null
  readonly canLayOnHandsCure: (condition: Condition, currentConditions: ReadonlyArray<Condition>) => boolean
  readonly layOnHandsCure: (condition: Condition) => BridgeResult | null
  readonly canPaladinSmiteFree: boolean
  readonly paladinSmiteFree: () => BridgeResult | null
  readonly divineSmiteDamage: (slotLevel: number, isUndeadOrFiend: boolean) => number
  readonly auraOfProtectionBonus: number
  readonly canUseAuraOfProtection: boolean
  readonly hasDivineHealth: boolean
  readonly radiantStrikesDice: number
}

export function useMonkPaladinFeatures(
  featureState: FeatureState,
  ctx: DndContext | null,
  level: number,
  dispatch: (action: FeatureAction) => void
): MonkPaladinHookResult {
  // Monk
  const canFlurryOfBlowsVal = ctx ? canExecuteFlurryOfBlows(featureState, ctx) : false

  const flurryOfBlowsCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeFlurryOfBlows()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  const canPatientDefenseFreeVal = ctx ? canExecutePatientDefenseFree(featureState, ctx) : false

  const patientDefenseFreeCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executePatientDefenseFree()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  const canPatientDefenseFocusVal = ctx ? canExecutePatientDefenseFocus(featureState, ctx) : false

  const patientDefenseFocusCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executePatientDefenseFocus()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  const canStepOfTheWindFreeVal = ctx ? canExecuteStepOfTheWindFree(featureState, ctx) : false

  const stepOfTheWindFreeCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeStepOfTheWindFree()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  const canStepOfTheWindFocusVal = ctx ? canExecuteStepOfTheWindFocus(featureState, ctx) : false

  const stepOfTheWindFocusCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeStepOfTheWindFocus()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  // TODO: stunningStrikeUsedThisTurn and weaponCategory should come from caller state
  const canStunningStrikeVal = canExecuteStunningStrike(featureState, level, false, "unarmed")

  const stunningStrikeCb = useCallback(
    (targetSavePassed: boolean): BridgeResult | null => {
      if (!ctx) return null
      const result = executeStunningStrike(featureState, targetSavePassed)
      dispatch(result.featureAction)
      return result
    },
    [featureState, ctx, dispatch]
  )

  const canUncannyMetabolismVal = canExecuteUncannyMetabolism(featureState, level)

  const uncannyMetabolismCb = useCallback(
    (d8Roll: number): BridgeResult | null => {
      if (!ctx) return null
      const result = executeUncannyMetabolism(featureState, level, d8Roll)
      dispatch(result.featureAction)
      return result
    },
    [featureState, ctx, level, dispatch]
  )

  const martialArtsDieVal = getMartialArtsDie(level)
  // TODO: these params should come from caller state (attack action, weapon, armor)
  const bonusUnarmedStrikeEligibleVal = getBonusUnarmedStrikeEligible(false, "unarmed", false, false)

  // Paladin
  const canLayOnHandsHealVal = ctx ? canExecuteLayOnHandsHeal(featureState, ctx) : false

  const layOnHandsHealCb = useCallback(
    (amount: number): BridgeResult | null => {
      if (!ctx) return null
      const result = executeLayOnHandsHeal(featureState, ctx, amount)
      dispatch(result.featureAction)
      return result
    },
    [featureState, ctx, dispatch]
  )

  const canLayOnHandsCureCb = useCallback(
    (condition: Condition, currentConditions: ReadonlyArray<Condition>): boolean =>
      canExecuteLayOnHandsCure(featureState, condition, level, currentConditions),
    [featureState, level]
  )

  const layOnHandsCureCb = useCallback(
    (condition: Condition): BridgeResult | null => {
      const result = executeLayOnHandsCure(featureState, condition)
      dispatch(result.featureAction)
      return result
    },
    [featureState, dispatch]
  )

  const canPaladinSmiteFreeVal = canExecutePaladinSmiteFree(featureState)

  const paladinSmiteFreeCb = useCallback((): BridgeResult | null => {
    const result = executePaladinSmiteFree()
    dispatch(result.featureAction)
    return result
  }, [dispatch])

  // TODO: chaMod and isConscious should come from caller state
  const auraBonus = getAuraOfProtectionBonus(level, 0)
  const canAura = getCanUseAuraOfProtection(level, true)
  const divineHealth = getHasDivineHealth(level)
  const radiantDice = getRadiantStrikesDice({ paladinLevel: level, isMeleeOrUnarmed: true })

  return {
    canFlurryOfBlows: canFlurryOfBlowsVal,
    flurryOfBlows: flurryOfBlowsCb,
    canPatientDefenseFree: canPatientDefenseFreeVal,
    patientDefenseFree: patientDefenseFreeCb,
    canPatientDefenseFocus: canPatientDefenseFocusVal,
    patientDefenseFocus: patientDefenseFocusCb,
    canStepOfTheWindFree: canStepOfTheWindFreeVal,
    stepOfTheWindFree: stepOfTheWindFreeCb,
    canStepOfTheWindFocus: canStepOfTheWindFocusVal,
    stepOfTheWindFocus: stepOfTheWindFocusCb,
    canStunningStrike: canStunningStrikeVal,
    stunningStrike: stunningStrikeCb,
    canUncannyMetabolism: canUncannyMetabolismVal,
    uncannyMetabolism: uncannyMetabolismCb,
    martialArtsDie: martialArtsDieVal,
    bonusUnarmedStrikeEligible: bonusUnarmedStrikeEligibleVal,
    canLayOnHandsHeal: canLayOnHandsHealVal,
    layOnHandsHeal: layOnHandsHealCb,
    canLayOnHandsCure: canLayOnHandsCureCb,
    layOnHandsCure: layOnHandsCureCb,
    canPaladinSmiteFree: canPaladinSmiteFreeVal,
    paladinSmiteFree: paladinSmiteFreeCb,
    divineSmiteDamage: getDivineSmiteDamage,
    auraOfProtectionBonus: auraBonus,
    canUseAuraOfProtection: canAura,
    hasDivineHealth: divineHealth,
    radiantStrikesDice: radiantDice
  }
}
