// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.magic-action-healing-pool
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.magic-action-healing-pool

module battleRuntimePreserveLifeMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type PreserveLifeScenarioOutcome = | Init | Distributed | Self | RejectNonBloodied | RejectOverPool | RejectOverCap | RejectMissingRange | RejectMissingResource | RejectMissingMagicAction


  type PreserveLifeWitnessState = {
    qCasterHp: int,
    qTargetHp: int,
    qSecondTargetHp: int,
    qChannelDivinityUsesRemaining: int,
    qActionResourcesRemaining: int,
    qScenarioOutcome: PreserveLifeScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: PreserveLifeWitnessState

  pure def qCasterHp: int = qState.qCasterHp
  pure def qTargetHp: int = qState.qTargetHp
  pure def qSecondTargetHp: int = qState.qSecondTargetHp
  pure def qChannelDivinityUsesRemaining: int = qState.qChannelDivinityUsesRemaining
  pure def qActionResourcesRemaining: int = qState.qActionResourcesRemaining
  pure def qLastResult: PreserveLifeScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: PreserveLifeScenarioOutcome,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    casterHp: int,
    targetHp: int,
    secondTargetHp: int,
    channelDivinityUsesRemaining: int,
    actionResourcesRemaining: int,
    lastResult: PreserveLifeScenarioOutcome,
  ): bool = all {
    qState' = {
      qCasterHp: casterHp,
      qTargetHp: targetHp,
      qSecondTargetHp: secondTargetHp,
      qChannelDivinityUsesRemaining: channelDivinityUsesRemaining,
      qActionResourcesRemaining: actionResourcesRemaining,
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init = recordProjection(20, 2, 3, 2, 1, Init)

  action doDistributeHealing = all {
    qLastResult == Init,
    recordProjection(20, 10, 10, 1, 0, Distributed),
  }

  action doSelfHealing = all {
    qLastResult == Init,
    recordProjection(10, 12, 3, 1, 0, Self),
  }

  action doRejectNonBloodied = all {
    qLastResult == Init,
    recordProjection(20, 11, 3, 2, 1, RejectNonBloodied),
  }

  action doRejectOverPool = all {
    qLastResult == Init,
    recordProjection(20, 0, 0, 2, 1, RejectOverPool),
  }

  action doRejectOverCap = all {
    qLastResult == Init,
    recordProjection(20, 2, 3, 2, 1, RejectOverCap),
  }

  action doRejectMissingRange = all {
    qLastResult == Init,
    recordProjection(20, 2, 3, 2, 1, RejectMissingRange),
  }

  action doRejectMissingResource = all {
    qLastResult == Init,
    recordProjection(20, 2, 3, 0, 1, RejectMissingResource),
  }

  action doRejectMissingMagicAction = all {
    qLastResult == Init,
    recordProjection(20, 2, 3, 2, 0, RejectMissingMagicAction),
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
