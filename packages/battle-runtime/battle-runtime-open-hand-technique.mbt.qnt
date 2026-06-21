// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.open-hand-technique
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.open-hand-technique

module battleRuntimeOpenHandTechniqueMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type OpenHandTechniqueScenarioOutcome = | Init | Addle | PushSaveSucceeded | PushSaveFailed | ToppleSaveSucceeded | ToppleSaveFailed | RejectNonFlurry | RejectPushTooFar | RejectTopplePushDisposition


  type OpenHandTechniqueWitnessState = {
    qTargetOpportunityAttackDenied: bool,
    qTargetProne: bool,
    qPushDistanceFeet: int,
    qScenarioOutcome: OpenHandTechniqueScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: OpenHandTechniqueWitnessState

  pure def qTargetOpportunityAttackDenied: bool = qState.qTargetOpportunityAttackDenied
  pure def qTargetProne: bool = qState.qTargetProne
  pure def qPushDistanceFeet: int = qState.qPushDistanceFeet
  pure def scenarioOutcome: OpenHandTechniqueScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: OpenHandTechniqueScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (scenarioOutcome.in(Set(RejectNonFlurry, RejectPushTooFar, RejectTopplePushDisposition))) witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    targetOpportunityAttackDenied: bool,
    targetProne: bool,
    pushDistanceFeet: int,
    lastResult: OpenHandTechniqueScenarioOutcome,
  ): bool = all {
    qState' = {
      qTargetOpportunityAttackDenied: targetOpportunityAttackDenied,
      qTargetProne: targetProne,
      qPushDistanceFeet: pushDistanceFeet,
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }
  action init = recordProjection(false, false, 0, Init)

  action doAddle = all {
    scenarioOutcome == Init,
    recordProjection(true, false, 0, Addle),
  }

  action doPushSaveSucceeded = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 0, PushSaveSucceeded),
  }

  action doPushSaveFailed = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 10, PushSaveFailed),
  }

  action doToppleSaveSucceeded = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 0, ToppleSaveSucceeded),
  }

  action doToppleSaveFailed = all {
    scenarioOutcome == Init,
    recordProjection(false, true, 0, ToppleSaveFailed),
  }

  action doRejectNonFlurry = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 0, RejectNonFlurry),
  }

  action doRejectPushTooFar = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 0, RejectPushTooFar),
  }

  action doRejectTopplePushDisposition = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 0, RejectTopplePushDisposition),
  }

  action step = any {
    doAddle,
    doPushSaveSucceeded,
    doPushSaveFailed,
    doToppleSaveSucceeded,
    doToppleSaveFailed,
    doRejectNonFlurry,
    doRejectPushTooFar,
    doRejectTopplePushDisposition,
  }
}
