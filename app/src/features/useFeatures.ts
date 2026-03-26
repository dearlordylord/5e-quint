import { useCallback, useMemo, useReducer } from "react"

import { canCastWhileRaging } from "#/features/class-barbarian.ts"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import {
  canExecuteActionSurge,
  canExecuteDeclareReckless,
  canExecuteEndRage,
  canExecuteEnterRage,
  canExecuteExtendRageBA,
  canExecuteFlurryOfBlows,
  canExecuteFrenzy,
  canExecuteIntimidatingPresence,
  canExecuteLayOnHandsCure,
  canExecuteLayOnHandsHeal,
  canExecutePaladinSmiteFree,
  canExecutePatientDefenseFocus,
  canExecutePatientDefenseFree,
  canExecuteRetaliation,
  canExecuteSecondWind,
  canExecuteStepOfTheWindFocus,
  canExecuteStepOfTheWindFree,
  canExecuteStunningStrike,
  canExecuteUncannyMetabolism,
  executeActionSurge,
  executeDeclareReckless,
  executeEndRage,
  executeEnterRage,
  executeEnterRageWithMindlessRage,
  executeExtendRageBA,
  executeFlurryOfBlows,
  executeFrenzy,
  executeIntimidatingPresence,
  executeLayOnHandsCure,
  executeLayOnHandsHeal,
  executePaladinSmiteFree,
  executePatientDefenseFocus,
  executePatientDefenseFree,
  executeRetaliation,
  executeSecondWind,
  executeStepOfTheWindFocus,
  executeStepOfTheWindFree,
  executeStunningStrike,
  executeUncannyMetabolism,
  getAuraOfProtectionBonus,
  getBonusUnarmedStrikeEligible,
  getCanUseAuraOfProtection,
  getDivineSmiteDamage,
  getFrenzyDamageDice,
  getHasDivineHealth,
  getIntimidatingPresenceDC,
  getIsRaging,
  getMartialArtsDie,
  getMindlessRageImmunities,
  getRadiantStrikesDice,
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
  // Monk
  readonly canFlurryOfBlows: boolean
  readonly flurryOfBlows: () => BridgeResult | null
  readonly canPatientDefenseFree: boolean
  readonly patientDefenseFree: () => BridgeResult | null
  readonly canPatientDefenseFocus: boolean
  readonly patientDefenseFocus: (twoMartialArtsDieRollsTotal: number) => BridgeResult | null
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

  // Monk
  const canFlurryOfBlowsVal = ctx ? canExecuteFlurryOfBlows(featureState, ctx) : false

  const flurryOfBlowsCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeFlurryOfBlows(featureState, config.level)
    dispatch(result.featureAction)
    return result
  }, [featureState, ctx, config.level])

  const canPatientDefenseFreeVal = ctx ? canExecutePatientDefenseFree(featureState, ctx) : false

  const patientDefenseFreeCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executePatientDefenseFree()
    dispatch(result.featureAction)
    return result
  }, [ctx])

  const canPatientDefenseFocusVal = ctx ? canExecutePatientDefenseFocus(featureState, ctx) : false

  const patientDefenseFocusCb = useCallback(
    (twoMartialArtsDieRollsTotal: number): BridgeResult | null => {
      if (!ctx) return null
      const result = executePatientDefenseFocus(featureState, config.level, twoMartialArtsDieRollsTotal)
      dispatch(result.featureAction)
      return result
    },
    [featureState, ctx, config.level]
  )

  const canStepOfTheWindFreeVal = ctx ? canExecuteStepOfTheWindFree(featureState, ctx) : false

  const stepOfTheWindFreeCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeStepOfTheWindFree()
    dispatch(result.featureAction)
    return result
  }, [ctx])

  const canStepOfTheWindFocusVal = ctx ? canExecuteStepOfTheWindFocus(featureState, ctx) : false

  const stepOfTheWindFocusCb = useCallback((): BridgeResult | null => {
    if (!ctx) return null
    const result = executeStepOfTheWindFocus(featureState, config.level)
    dispatch(result.featureAction)
    return result
  }, [featureState, ctx, config.level])

  // Stunning Strike: defaults to unarmed, not used this turn
  const canStunningStrikeVal = canExecuteStunningStrike(featureState, config.level, false, "unarmed")

  const stunningStrikeCb = useCallback(
    (targetSavePassed: boolean): BridgeResult | null => {
      if (!ctx) return null
      const result = executeStunningStrike(featureState, targetSavePassed)
      dispatch(result.featureAction)
      return result
    },
    [featureState, ctx]
  )

  const canUncannyMetabolismVal = canExecuteUncannyMetabolism(featureState, config.level)

  const uncannyMetabolismCb = useCallback(
    (d8Roll: number): BridgeResult | null => {
      if (!ctx) return null
      const result = executeUncannyMetabolism(featureState, config.level, d8Roll)
      dispatch(result.featureAction)
      return result
    },
    [featureState, ctx, config.level]
  )

  const martialArtsDieVal = getMartialArtsDie(config.level)
  // Default: no attack action, unarmed, no armor, no shield
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
    [featureState, ctx]
  )

  const canLayOnHandsCureCb = useCallback(
    (condition: Condition, currentConditions: ReadonlyArray<Condition>): boolean =>
      canExecuteLayOnHandsCure(featureState, condition, config.level, currentConditions),
    [featureState, config.level]
  )

  const layOnHandsCureCb = useCallback(
    (condition: Condition): BridgeResult | null => {
      const result = executeLayOnHandsCure(featureState, condition)
      dispatch(result.featureAction)
      return result
    },
    [featureState]
  )

  const canPaladinSmiteFreeVal = canExecutePaladinSmiteFree(featureState)

  const paladinSmiteFreeCb = useCallback((): BridgeResult | null => {
    const result = executePaladinSmiteFree()
    dispatch(result.featureAction)
    return result
  }, [])

  const auraBonus = getAuraOfProtectionBonus(config.level, 0) // caller provides actual chaMod via config or UI
  const canAura = getCanUseAuraOfProtection(config.level, true) // defaults to conscious
  const divineHealth = getHasDivineHealth(config.level)
  const radiantDice = getRadiantStrikesDice({ paladinLevel: config.level, isMeleeOrUnarmed: true })

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
    radiantStrikesDice: radiantDice,
    notify,
    resetToInitial,
    dispatch
  }
}
