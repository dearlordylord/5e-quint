// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.magic-action-healing-pool
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.magic-action-healing-pool

module battleRuntimePreserveLifeMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type PreserveLifeWitnessState = {
    qCasterHp: int,
    qTargetHp: int,
    qSecondTargetHp: int,
    qChannelDivinityUsesRemaining: int,
    qActionResourcesRemaining: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: PreserveLifeWitnessState

  pure def qCasterHp: int = qState.qCasterHp
  pure def qTargetHp: int = qState.qTargetHp
  pure def qSecondTargetHp: int = qState.qSecondTargetHp
  pure def qChannelDivinityUsesRemaining: int = qState.qChannelDivinityUsesRemaining
  pure def qActionResourcesRemaining: int = qState.qActionResourcesRemaining
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
    casterHp: int,
    targetHp: int,
    secondTargetHp: int,
    channelDivinityUsesRemaining: int,
    actionResourcesRemaining: int,
    lastResult: str,
  ): bool = all {
    qState' = {
      qCasterHp: casterHp,
      qTargetHp: targetHp,
      qSecondTargetHp: secondTargetHp,
      qChannelDivinityUsesRemaining: channelDivinityUsesRemaining,
      qActionResourcesRemaining: actionResourcesRemaining,
      qScenarioResult: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init = recordProjection(20, 2, 3, 2, 1, "init")

  action doDistributeHealing = all {
    qLastResult == "init",
    recordProjection(20, 10, 10, 1, 0, "distributed"),
  }

  action doSelfHealing = all {
    qLastResult == "init",
    recordProjection(10, 12, 3, 1, 0, "self"),
  }

  action doRejectNonBloodied = all {
    qLastResult == "init",
    recordProjection(20, 11, 3, 2, 1, "rejectNonBloodied"),
  }

  action doRejectOverPool = all {
    qLastResult == "init",
    recordProjection(20, 0, 0, 2, 1, "rejectOverPool"),
  }

  action doRejectOverCap = all {
    qLastResult == "init",
    recordProjection(20, 2, 3, 2, 1, "rejectOverCap"),
  }

  action doRejectMissingRange = all {
    qLastResult == "init",
    recordProjection(20, 2, 3, 2, 1, "rejectMissingRange"),
  }

  action doRejectMissingResource = all {
    qLastResult == "init",
    recordProjection(20, 2, 3, 0, 1, "rejectMissingResource"),
  }

  action doRejectMissingMagicAction = all {
    qLastResult == "init",
    recordProjection(20, 2, 3, 2, 0, "rejectMissingMagicAction"),
  }

  action step = any {
    doDistributeHealing,
    doSelfHealing,
    doRejectNonBloodied,
    doRejectOverPool,
    doRejectOverCap,
    doRejectMissingRange,
    doRejectMissingResource,
    doRejectMissingMagicAction,
  }
}
