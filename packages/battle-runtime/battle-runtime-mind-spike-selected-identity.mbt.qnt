// -*- mode: Bluespec; -*-

module battleRuntimeMindSpikeSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type MindSpikeSelectedIdentityScenarioOutcome = | Init | MindSpikeFailedSaveConcentrationDuration | MindSpikeSuccessfulSaveHalfDamage

  type MindSpikeSelectedIdentityWitnessState = {
    qLevel2SlotsRemaining: int,
    qTargetHp: int,
    qCasterConcentratingOnMindSpike: bool,
    qMindSpikeDurationActive: bool,
    qMindSpikeDurationCleanedUp: bool,
    qTargetActiveEffectCount: int,
    qScenarioOutcome: MindSpikeSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: MindSpikeSelectedIdentityWitnessState

  pure def qLevel2SlotsRemaining: int = qState.qLevel2SlotsRemaining
  pure def qTargetHp: int = qState.qTargetHp
  pure def qCasterConcentratingOnMindSpike: bool = qState.qCasterConcentratingOnMindSpike
  pure def qMindSpikeDurationActive: bool = qState.qMindSpikeDurationActive
  pure def qMindSpikeDurationCleanedUp: bool = qState.qMindSpikeDurationCleanedUp
  pure def qTargetActiveEffectCount: int = qState.qTargetActiveEffectCount
  pure def scenarioOutcome: MindSpikeSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: MindSpikeSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    level2SlotsRemaining: int,
    targetHp: int,
    casterConcentratingOnMindSpike: bool,
    mindSpikeDurationActive: bool,
    mindSpikeDurationCleanedUp: bool,
    targetActiveEffectCount: int,
    lastResult: MindSpikeSelectedIdentityScenarioOutcome,
  ): bool = all {
    qState' = {
      qLevel2SlotsRemaining: level2SlotsRemaining,
      qTargetHp: targetHp,
      qCasterConcentratingOnMindSpike: casterConcentratingOnMindSpike,
      qMindSpikeDurationActive: mindSpikeDurationActive,
      qMindSpikeDurationCleanedUp: mindSpikeDurationCleanedUp,
      qTargetActiveEffectCount: targetActiveEffectCount,
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }
  action init = recordProjection(1, 30, false, false, false, 0, Init)

  action doResolveMindSpikeFailedSaveConcentrationDuration = all {
    scenarioOutcome == Init,
    recordProjection(
      0,
      18,
      true,
      true,
      true,
      0,
      MindSpikeFailedSaveConcentrationDuration,
    ),
  }

  action doResolveMindSpikeSuccessfulSaveHalfDamage = all {
    scenarioOutcome == Init,
    recordProjection(
      0,
      24,
      false,
      false,
      false,
      0,
      MindSpikeSuccessfulSaveHalfDamage,
    ),
  }

  action step = any {
    doResolveMindSpikeFailedSaveConcentrationDuration,
    doResolveMindSpikeSuccessfulSaveHalfDamage,
  }
}
