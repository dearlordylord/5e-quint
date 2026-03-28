// --- Monk + Paladin hook sections ---
// Extracted from useFeatures.ts to stay under eslint max-lines (420).

import { useCallback } from "react"

import type { AbjureFoesResult } from "#/features/class-paladin.ts"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import {
  canExecuteAbjureFoes,
  canExecuteDeflectAttacks,
  canExecuteDisciplinedSurvivorReroll,
  canExecuteFaithfulSteed,
  canExecuteFlurryOfBlows,
  canExecuteLayOnHandsCure,
  canExecuteLayOnHandsHeal,
  canExecutePaladinSmiteFree,
  canExecutePatientDefenseFocus,
  canExecutePatientDefenseFree,
  canExecuteQuiveringPalm,
  canExecuteRestoringTouch,
  canExecuteSlowFall,
  canExecuteStepOfTheWindFocus,
  canExecuteStepOfTheWindFree,
  canExecuteStunningStrike,
  canExecuteSuperiorDefense,
  canExecuteUncannyMetabolism,
  canExecuteWholenessOfBody,
  canSelfRestore,
  executeAbjureFoes,
  executeDeflectAttacks,
  executeDisciplinedSurvivorReroll,
  executeFaithfulSteed,
  executeFlurryOfBlows,
  executeLayOnHandsCure,
  executeLayOnHandsHeal,
  executePaladinSmiteFree,
  executePatientDefenseFocus,
  executePatientDefenseFree,
  executeQuiveringPalm,
  executeRestoringTouch,
  executeSlowFall,
  executeStepOfTheWindFocus,
  executeStepOfTheWindFree,
  executeStunningStrike,
  executeSuperiorDefense,
  executeTriggerQuiveringPalm,
  executeUncannyMetabolism,
  executeWholenessOfBody,
  getAbjureFoesResult,
  getAuraOfCourageRange,
  getAuraOfProtectionBonus,
  getAuraOfProtectionRange,
  getBonusUnarmedStrikeEligible,
  getCanUseAuraOfCourage,
  getCanUseAuraOfProtection,
  getDivineSmiteDamage,
  getMartialArtsDie,
  getRadiantStrikesDice,
  hasDeflectEnergy,
  hasDisciplinedSurvivor,
  hasFleetStep,
  hasFocusEmpoweredStrikes,
  selfRestorationConditions,
  unarmoredMovementBonus
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
  // Monk passives
  readonly unarmoredMovementBonus: number
  readonly hasFocusEmpoweredStrikes: boolean
  readonly canSelfRestore: boolean
  readonly selfRestorationConditions: ReadonlyArray<Condition>
  readonly hasDeflectEnergy: boolean
  readonly hasDisciplinedSurvivor: boolean
  readonly hasFleetStep: boolean
  // Monk active features
  readonly canDeflectAttacks: boolean
  readonly deflectAttacks: () => BridgeResult | null
  readonly canSlowFall: boolean
  readonly slowFall: () => BridgeResult | null
  readonly canSuperiorDefense: boolean
  readonly superiorDefense: () => BridgeResult | null
  readonly canWholenessOfBody: boolean
  readonly wholenessOfBody: (martialArtsDieRoll: number, wisMod: number) => BridgeResult | null
  readonly canQuiveringPalm: boolean
  readonly quiveringPalm: () => BridgeResult | null
  readonly triggerQuiveringPalm: () => BridgeResult | null
  readonly canDisciplinedSurvivorReroll: boolean
  readonly disciplinedSurvivorReroll: () => BridgeResult | null
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
  readonly radiantStrikesDice: number
  // Paladin passives
  readonly canUseAuraOfCourage: boolean
  readonly auraOfCourageRange: number
  readonly auraOfProtectionRange: number
  readonly canFaithfulSteed: boolean
  readonly faithfulSteed: () => BridgeResult | null
  readonly canAbjureFoes: boolean
  readonly abjureFoes: () => BridgeResult | null
  readonly abjureFoesResult: (targetSavePassed: boolean) => AbjureFoesResult
  readonly canRestoringTouch: boolean
  readonly restoringTouch: () => BridgeResult | null
}

export function useMonkPaladinFeatures(
  featureState: FeatureState,
  ctx: DndContext | null,
  level: number,
  dispatch: (action: FeatureAction) => void,
  isActing: boolean
): MonkPaladinHookResult {
  // Monk
  const canFlurryOfBlowsVal = isActing && ctx ? canExecuteFlurryOfBlows(featureState, ctx) : false

  const flurryOfBlowsCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeFlurryOfBlows()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  const canPatientDefenseFreeVal = isActing && ctx ? canExecutePatientDefenseFree(featureState, ctx) : false

  const patientDefenseFreeCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executePatientDefenseFree()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  const canPatientDefenseFocusVal = isActing && ctx ? canExecutePatientDefenseFocus(featureState, ctx) : false

  const patientDefenseFocusCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executePatientDefenseFocus()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  const canStepOfTheWindFreeVal = isActing && ctx ? canExecuteStepOfTheWindFree(featureState, ctx) : false

  const stepOfTheWindFreeCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeStepOfTheWindFree()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  const canStepOfTheWindFocusVal = isActing && ctx ? canExecuteStepOfTheWindFocus(featureState, ctx) : false

  const stepOfTheWindFocusCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeStepOfTheWindFocus()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  // TODO: stunningStrikeUsedThisTurn and weaponCategory should come from caller state
  const canStunningStrikeVal = isActing && canExecuteStunningStrike(featureState, level, false, "unarmed")

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

  // Monk passive queries
  const unarmoredMovementBonusVal = unarmoredMovementBonus(level)
  const hasFocusEmpoweredStrikesVal = hasFocusEmpoweredStrikes(level)
  const canSelfRestoreVal = canSelfRestore(level)
  const selfRestorationConditionsVal = selfRestorationConditions()
  const hasDeflectEnergyVal = hasDeflectEnergy(level)
  const hasDisciplinedSurvivorVal = hasDisciplinedSurvivor(level)
  const hasFleetStepVal = hasFleetStep(level)

  // Deflect Attacks (reaction) -- default isWeaponAttack=true, caller can check canDeflectAttacks separately
  const canDeflectAttacksVal = isActing && ctx ? canExecuteDeflectAttacks(featureState, ctx, level, true) : false

  const deflectAttacksCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeDeflectAttacks()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  // Slow Fall (reaction)
  const canSlowFallVal = isActing && ctx ? canExecuteSlowFall(featureState, ctx, level) : false

  const slowFallCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeSlowFall()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  // Superior Defense (action + 3 FP)
  const canSuperiorDefenseVal = isActing && ctx ? canExecuteSuperiorDefense(featureState, ctx, level) : false

  const superiorDefenseCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeSuperiorDefense()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  // Wholeness of Body (bonus action, charges)
  const canWholenessOfBodyVal = isActing && ctx ? canExecuteWholenessOfBody(featureState, ctx) : false

  const wholenessOfBodyCb = useCallback(
    (martialArtsDieRoll: number, wisMod: number): BridgeResult | null => {
      if (!ctx) return null
      const result = executeWholenessOfBody(featureState, martialArtsDieRoll, wisMod)
      dispatch(result.featureAction)
      return result
    },
    [featureState, ctx, dispatch]
  )

  // Quivering Palm (4 FP)
  const canQuiveringPalmVal = isActing && canExecuteQuiveringPalm(featureState, level)

  const quiveringPalmCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeQuiveringPalm()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  const triggerQuiveringPalmCb = useCallback((): BridgeResult | null => {
    const result = executeTriggerQuiveringPalm()
    dispatch(result.featureAction)
    return result
  }, [dispatch])

  // Disciplined Survivor Reroll (1 FP)
  const canDisciplinedSurvivorRerollVal = canExecuteDisciplinedSurvivorReroll(featureState, level)

  const disciplinedSurvivorRerollCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeDisciplinedSurvivorReroll()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  // Paladin
  const canLayOnHandsHealVal = isActing && ctx ? canExecuteLayOnHandsHeal(featureState, ctx) : false

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
      canExecuteLayOnHandsCure(featureState, condition, level, currentConditions, ctx?.bonusActionUsed ?? false),
    [featureState, level, ctx]
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

  const radiantDice = getRadiantStrikesDice({ paladinLevel: level, isMeleeOrUnarmed: true })

  // Paladin passives
  // For consciousness check, we approximate: unconscious means not conscious
  const isConscious = ctx ? !ctx.unconscious : true
  const canUseAuraOfCourageVal = getCanUseAuraOfCourage(level, isConscious)
  const auraOfCourageRangeVal = getAuraOfCourageRange(level)
  const auraOfProtectionRangeVal = getAuraOfProtectionRange(level)
  const canFaithfulSteedVal = canExecuteFaithfulSteed(featureState, level)
  const canAbjureFoesVal = isActing && ctx ? canExecuteAbjureFoes(featureState, ctx, level) : false
  const canRestoringTouchVal = canExecuteRestoringTouch(featureState, level)

  const faithfulSteedCb = useCallback((): BridgeResult | null => {
    const result = executeFaithfulSteed()
    dispatch(result.featureAction)
    return result
  }, [dispatch])

  const abjureFoesCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeAbjureFoes()
    dispatch(result.featureAction)
    return result
  }, [ctx, dispatch])

  const restoringTouchCb = useCallback((): BridgeResult | null => {
    const result = executeRestoringTouch(featureState)
    dispatch(result.featureAction)
    return result
  }, [featureState, dispatch])

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
    unarmoredMovementBonus: unarmoredMovementBonusVal,
    hasFocusEmpoweredStrikes: hasFocusEmpoweredStrikesVal,
    canSelfRestore: canSelfRestoreVal,
    selfRestorationConditions: selfRestorationConditionsVal,
    hasDeflectEnergy: hasDeflectEnergyVal,
    hasDisciplinedSurvivor: hasDisciplinedSurvivorVal,
    hasFleetStep: hasFleetStepVal,
    canDeflectAttacks: canDeflectAttacksVal,
    deflectAttacks: deflectAttacksCb,
    canSlowFall: canSlowFallVal,
    slowFall: slowFallCb,
    canSuperiorDefense: canSuperiorDefenseVal,
    superiorDefense: superiorDefenseCb,
    canWholenessOfBody: canWholenessOfBodyVal,
    wholenessOfBody: wholenessOfBodyCb,
    canQuiveringPalm: canQuiveringPalmVal,
    quiveringPalm: quiveringPalmCb,
    triggerQuiveringPalm: triggerQuiveringPalmCb,
    canDisciplinedSurvivorReroll: canDisciplinedSurvivorRerollVal,
    disciplinedSurvivorReroll: disciplinedSurvivorRerollCb,
    canLayOnHandsHeal: canLayOnHandsHealVal,
    layOnHandsHeal: layOnHandsHealCb,
    canLayOnHandsCure: canLayOnHandsCureCb,
    layOnHandsCure: layOnHandsCureCb,
    canPaladinSmiteFree: canPaladinSmiteFreeVal,
    paladinSmiteFree: paladinSmiteFreeCb,
    divineSmiteDamage: getDivineSmiteDamage,
    auraOfProtectionBonus: auraBonus,
    canUseAuraOfProtection: canAura,
    radiantStrikesDice: radiantDice,
    canUseAuraOfCourage: canUseAuraOfCourageVal,
    auraOfCourageRange: auraOfCourageRangeVal,
    auraOfProtectionRange: auraOfProtectionRangeVal,
    canFaithfulSteed: canFaithfulSteedVal,
    faithfulSteed: faithfulSteedCb,
    canAbjureFoes: canAbjureFoesVal,
    abjureFoes: abjureFoesCb,
    abjureFoesResult: getAbjureFoesResult,
    canRestoringTouch: canRestoringTouchVal,
    restoringTouch: restoringTouchCb
  }
}
