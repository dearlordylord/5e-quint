// -*- mode: Bluespec; -*-

module battleRuntimeHeatMetalObjectContactMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type HeatMetalObjectContactScenarioOutcome = | Init | CastNoContact | CastContactDamage | RepeatBlocked | EndCasterTurn | EndTargetTurn | RepeatContactDamage | ConcentrationBroken

  type HeatMetalObjectContactWitnessState = {
    qCurrentTurnRole: str,
    qActionAvailable: bool,
    qBonusActionAvailable: bool,
    qSpellAvailable: bool,
    qRepeatAvailable: bool,
    qObjectContactEffectActive: bool,
    qCasterConcentrating: bool,
    qTargetHp: int,
    qScenarioOutcome: HeatMetalObjectContactScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: HeatMetalObjectContactWitnessState

  pure def qCurrentTurnRole: str = qState.qCurrentTurnRole
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qRepeatAvailable: bool = qState.qRepeatAvailable
  pure def qObjectContactEffectActive: bool = qState.qObjectContactEffectActive
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qTargetHp: int = qState.qTargetHp
  pure def scenarioOutcome: HeatMetalObjectContactScenarioOutcome = qState.qScenarioOutcome

  pure def heatMetalObjectContactProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: HeatMetalObjectContactScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val initialTargetHp: int = 40
  pure val castDamage: int = 7
  pure val repeatDamage: int = 5

  action recordHeatMetalState(
    currentTurnRole: str,
    actionAvailable: bool,
    bonusActionAvailable: bool,
    spellAvailable: bool,
    repeatAvailable: bool,
    objectContactEffectActive: bool,
    casterConcentrating: bool,
    targetHp: int,
    lastResult: HeatMetalObjectContactScenarioOutcome,
  ): bool = all {
    qState' = {
      qCurrentTurnRole: currentTurnRole,
      qActionAvailable: actionAvailable,
      qBonusActionAvailable: bonusActionAvailable,
      qSpellAvailable: spellAvailable,
      qRepeatAvailable: repeatAvailable,
      qObjectContactEffectActive: objectContactEffectActive,
      qCasterConcentrating: casterConcentrating,
      qTargetHp: targetHp,
      qScenarioOutcome: lastResult,
      protocol: heatMetalObjectContactProtocolForProjection(Set(), lastResult),
    },
  }

  action init = all {
    recordHeatMetalState(
      casterTurnRole,
      true,
      true,
      true,
      false,
      false,
      false,
      initialTargetHp,
      Init,
    ),
  }

  action doCastNoContact = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qSpellAvailable,
    not(qObjectContactEffectActive),
    recordHeatMetalState(
      casterTurnRole,
      false,
      qBonusActionAvailable,
      false,
      false,
      true,
      true,
      qTargetHp,
      CastNoContact,
    ),
  }

  action doCastContactDamage = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qSpellAvailable,
    not(qObjectContactEffectActive),
    recordHeatMetalState(
      casterTurnRole,
      false,
      qBonusActionAvailable,
      false,
      false,
      true,
      true,
      qTargetHp - castDamage,
      CastContactDamage,
    ),
  }

  action doTrySameTurnRepeatBlocked = all {
    qCurrentTurnRole == casterTurnRole,
    qObjectContactEffectActive,
    qBonusActionAvailable,
    not(qRepeatAvailable),
    recordHeatMetalState(
      casterTurnRole,
      qActionAvailable,
      qBonusActionAvailable,
      qSpellAvailable,
      false,
      true,
      true,
      qTargetHp,
      RepeatBlocked,
    ),
  }

  action doEndCasterTurn = all {
    qCurrentTurnRole == casterTurnRole,
    qObjectContactEffectActive,
    qCasterConcentrating,
    recordHeatMetalState(
      targetTurnRole,
      true,
      true,
      false,
      false,
      true,
      true,
      qTargetHp,
      EndCasterTurn,
    ),
  }

  action doEndTargetTurn = all {
    qCurrentTurnRole == targetTurnRole,
    qObjectContactEffectActive,
    qCasterConcentrating,
    recordHeatMetalState(
      casterTurnRole,
      true,
      true,
      false,
      true,
      true,
      true,
      qTargetHp,
      EndTargetTurn,
    ),
  }

  action doRepeatContactDamage = all {
    qCurrentTurnRole == casterTurnRole,
    qRepeatAvailable,
    qObjectContactEffectActive,
    qCasterConcentrating,
    qBonusActionAvailable,
    recordHeatMetalState(
      casterTurnRole,
      qActionAvailable,
      false,
      false,
      false,
      true,
      true,
      qTargetHp - repeatDamage,
      RepeatContactDamage,
    ),
  }

  action doBreakConcentration = all {
    qObjectContactEffectActive,
    qCasterConcentrating,
    recordHeatMetalState(
      qCurrentTurnRole,
      qActionAvailable,
      qBonusActionAvailable,
      qSpellAvailable,
      false,
      false,
      false,
      qTargetHp,
      ConcentrationBroken,
    ),
  }

  action step = any {
    doCastNoContact,
    doCastContactDamage,
    doTrySameTurnRepeatBlocked,
    doEndCasterTurn,
    doEndTargetTurn,
    doRepeatContactDamage,
    doBreakConcentration,
  }
}
