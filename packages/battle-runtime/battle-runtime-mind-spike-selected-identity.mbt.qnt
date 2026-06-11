// -*- mode: Bluespec; -*-

module battleRuntimeMindSpikeSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type MindSpikeSelectedIdentityWitnessState = {
    qLevel2SlotsRemaining: int,
    qTargetHp: int,
    qCasterConcentratingOnMindSpike: bool,
    qMindSpikeDurationActive: bool,
    qMindSpikeDurationCleanedUp: bool,
    qTargetActiveEffectCount: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: MindSpikeSelectedIdentityWitnessState

  pure def qLevel2SlotsRemaining: int = qState.qLevel2SlotsRemaining
  pure def qTargetHp: int = qState.qTargetHp
  pure def qCasterConcentratingOnMindSpike: bool = qState.qCasterConcentratingOnMindSpike
  pure def qMindSpikeDurationActive: bool = qState.qMindSpikeDurationActive
  pure def qMindSpikeDurationCleanedUp: bool = qState.qMindSpikeDurationCleanedUp
  pure def qTargetActiveEffectCount: int = qState.qTargetActiveEffectCount
  pure def qLastResult: str = qState.qScenarioResult

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    level2SlotsRemaining: int,
    targetHp: int,
    casterConcentratingOnMindSpike: bool,
    mindSpikeDurationActive: bool,
    mindSpikeDurationCleanedUp: bool,
    targetActiveEffectCount: int,
    lastResult: str,
  ): bool = all {
    qState' = {
      qLevel2SlotsRemaining: level2SlotsRemaining,
      qTargetHp: targetHp,
      qCasterConcentratingOnMindSpike: casterConcentratingOnMindSpike,
      qMindSpikeDurationActive: mindSpikeDurationActive,
      qMindSpikeDurationCleanedUp: mindSpikeDurationCleanedUp,
      qTargetActiveEffectCount: targetActiveEffectCount,
      qScenarioResult: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init = recordProjection(1, 30, false, false, false, 0, "init")

  action doResolveMindSpikeFailedSaveConcentrationDuration = all {
    qLastResult == "init",
    recordProjection(
      0,
      18,
      true,
      true,
      true,
      0,
      "mindSpikeFailedSaveConcentrationDuration",
    ),
  }

  action doResolveMindSpikeSuccessfulSaveHalfDamage = all {
    qLastResult == "init",
    recordProjection(
      0,
      24,
      false,
      false,
      false,
      0,
      "mindSpikeSuccessfulSaveHalfDamage",
    ),
  }

  action step = any {
    doResolveMindSpikeFailedSaveConcentrationDuration,
    doResolveMindSpikeSuccessfulSaveHalfDamage,
  }
}
