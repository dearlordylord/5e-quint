// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.open-hand-technique
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.open-hand-technique

module battleRuntimeOpenHandTechniqueMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type OpenHandTechniqueScenarioOutcome =
    | Init
    | Decline
    | DenyOpportunityAttacks
    | PushAwaySaveSucceeded
    | PushAwaySaveFailed
    | ApplyProneSaveSucceeded
    | ApplyProneSaveFailed
    | RejectNonFlurry
    | RejectPushTooFar
    | RejectApplyPronePushDisposition


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
    else if (scenarioOutcome.in(Set(RejectNonFlurry, RejectPushTooFar, RejectApplyPronePushDisposition))) witnessInvalid(WitnessProtocolHole, WInvalidFill)
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

  action doDecline = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 0, Decline),
  }

  action doDenyOpportunityAttacks = all {
    scenarioOutcome == Init,
    recordProjection(true, false, 0, DenyOpportunityAttacks),
  }

  action doPushAwaySaveSucceeded = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 0, PushAwaySaveSucceeded),
  }

  action doPushAwaySaveFailed = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 10, PushAwaySaveFailed),
  }

  action doApplyProneSaveSucceeded = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 0, ApplyProneSaveSucceeded),
  }

  action doApplyProneSaveFailed = all {
    scenarioOutcome == Init,
    recordProjection(false, true, 0, ApplyProneSaveFailed),
  }

  action doRejectNonFlurry = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 0, RejectNonFlurry),
  }

  action doRejectPushTooFar = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 0, RejectPushTooFar),
  }

  action doRejectApplyPronePushDisposition = all {
    scenarioOutcome == Init,
    recordProjection(false, false, 0, RejectApplyPronePushDisposition),
  }

  action step = any {
    doDecline,
    doDenyOpportunityAttacks,
    doPushAwaySaveSucceeded,
    doPushAwaySaveFailed,
    doApplyProneSaveSucceeded,
    doApplyProneSaveFailed,
    doRejectNonFlurry,
    doRejectPushTooFar,
    doRejectApplyPronePushDisposition,
  }
}
