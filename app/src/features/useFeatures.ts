import { useCallback, useMemo, useReducer } from "react"

import { canCastWhileRaging } from "#/features/class-barbarian.ts"
import type { CunningActionChoice, StrikeEffect } from "#/features/class-rogue.ts"
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
import { useFighterExtras } from "#/features/useFighterExtras.ts"
import { useMonkPaladinFeatures } from "#/features/useMonkPaladinFeatures.ts"
import { useRogueFeatures } from "#/features/useRogueFeatures.ts"
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
  readonly canTacticalMind: (checkFailed: boolean) => boolean
  readonly tacticalMind: () => BridgeResult | null
  readonly canIndomitable: boolean
  readonly indomitable: () => BridgeResult | null
  // Champion
  readonly championCritRange: number
  readonly hasRemarkableAthlete: boolean
  readonly remarkableAthleteCritMovement: (effectiveSpeed: number) => number
  readonly heroicWarriorInspiration: (hasHeroicInspiration: boolean) => boolean
  readonly survivorDefyDeathAdvantage: boolean
  readonly survivorHeroicRally: (currentHp: number, maxHp: number, conMod: number) => number
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
  // Rogue
  readonly sneakAttackDice: number
  readonly canSneakAttack: (params: {
    readonly hasAdvantage: boolean
    readonly hasDisadvantage: boolean
    readonly allyAdjacentAndNotIncapacitated: boolean
    readonly isFinesse: boolean
    readonly isRanged: boolean
  }) => boolean
  readonly sneakAttack: () => BridgeResult | null
  readonly canCunningAction: boolean
  readonly cunningAction: (choice: CunningActionChoice) => BridgeResult | null
  readonly canSteadyAim: boolean
  readonly steadyAim: () => BridgeResult | null
  readonly canCunningStrike: (sneakAttackDiceUsed: number, effect: StrikeEffect) => boolean
  readonly canStrokeOfLuck: boolean
  readonly strokeOfLuck: () => BridgeResult | null
  readonly reliableTalent: (d20Roll: number, isProficient: boolean) => number
  readonly hasSlipperyMind: boolean
  readonly elusiveCancelsAdvantage: (isIncapacitated: boolean) => boolean
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

  // Fighter extras (Tactical Mind, Indomitable, Champion)
  const fighterExtras = useFighterExtras(featureState, config.level, config.championLevel ?? 0, dispatch)

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

  // Monk + Paladin (extracted to useMonkPaladinFeatures)
  const monkPaladin = useMonkPaladinFeatures(featureState, ctx, config.level, dispatch)

  // Rogue (extracted to useRogueFeatures)
  const rogueFeatures = useRogueFeatures(featureState, ctx, config.level, dispatch)

  const resetToInitial = useCallback(() => {
    dispatch({ type: "RESET" })
  }, [])

  return {
    featureState,
    canSecondWind,
    canActionSurge,
    secondWind,
    actionSurge,
    canTacticalMind: fighterExtras.canTacticalMind,
    tacticalMind: fighterExtras.tacticalMind,
    canIndomitable: fighterExtras.canIndomitable,
    indomitable: fighterExtras.indomitable,
    championCritRange: fighterExtras.championCritRange,
    hasRemarkableAthlete: fighterExtras.hasRemarkableAthlete,
    remarkableAthleteCritMovement: fighterExtras.remarkableAthleteCritMovement,
    heroicWarriorInspiration: fighterExtras.heroicWarriorInspiration,
    survivorDefyDeathAdvantage: fighterExtras.survivorDefyDeathAdvantage,
    survivorHeroicRally: fighterExtras.survivorHeroicRally,
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
    canFlurryOfBlows: monkPaladin.canFlurryOfBlows,
    flurryOfBlows: monkPaladin.flurryOfBlows,
    canPatientDefenseFree: monkPaladin.canPatientDefenseFree,
    patientDefenseFree: monkPaladin.patientDefenseFree,
    canPatientDefenseFocus: monkPaladin.canPatientDefenseFocus,
    patientDefenseFocus: monkPaladin.patientDefenseFocus,
    canStepOfTheWindFree: monkPaladin.canStepOfTheWindFree,
    stepOfTheWindFree: monkPaladin.stepOfTheWindFree,
    canStepOfTheWindFocus: monkPaladin.canStepOfTheWindFocus,
    stepOfTheWindFocus: monkPaladin.stepOfTheWindFocus,
    canStunningStrike: monkPaladin.canStunningStrike,
    stunningStrike: monkPaladin.stunningStrike,
    canUncannyMetabolism: monkPaladin.canUncannyMetabolism,
    uncannyMetabolism: monkPaladin.uncannyMetabolism,
    martialArtsDie: monkPaladin.martialArtsDie,
    bonusUnarmedStrikeEligible: monkPaladin.bonusUnarmedStrikeEligible,
    canLayOnHandsHeal: monkPaladin.canLayOnHandsHeal,
    layOnHandsHeal: monkPaladin.layOnHandsHeal,
    canLayOnHandsCure: monkPaladin.canLayOnHandsCure,
    layOnHandsCure: monkPaladin.layOnHandsCure,
    canPaladinSmiteFree: monkPaladin.canPaladinSmiteFree,
    paladinSmiteFree: monkPaladin.paladinSmiteFree,
    divineSmiteDamage: monkPaladin.divineSmiteDamage,
    auraOfProtectionBonus: monkPaladin.auraOfProtectionBonus,
    canUseAuraOfProtection: monkPaladin.canUseAuraOfProtection,
    hasDivineHealth: monkPaladin.hasDivineHealth,
    radiantStrikesDice: monkPaladin.radiantStrikesDice,
    sneakAttackDice: rogueFeatures.sneakAttackDice,
    canSneakAttack: rogueFeatures.canSneakAttack,
    sneakAttack: rogueFeatures.sneakAttack,
    canCunningAction: rogueFeatures.canCunningAction,
    cunningAction: rogueFeatures.cunningAction,
    canSteadyAim: rogueFeatures.canSteadyAim,
    steadyAim: rogueFeatures.steadyAim,
    canCunningStrike: rogueFeatures.canCunningStrike,
    canStrokeOfLuck: rogueFeatures.canStrokeOfLuck,
    strokeOfLuck: rogueFeatures.strokeOfLuck,
    reliableTalent: rogueFeatures.reliableTalent,
    hasSlipperyMind: rogueFeatures.hasSlipperyMind,
    elusiveCancelsAdvantage: rogueFeatures.elusiveCancelsAdvantage,
    notify,
    resetToInitial,
    dispatch
  }
}
