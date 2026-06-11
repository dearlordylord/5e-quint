// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.open-hand-technique
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.open-hand-technique

module battleRuntimeOpenHandTechniqueMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type OpenHandTechniqueWitnessState = {
    qTargetOpportunityAttackDenied: bool,
    qTargetProne: bool,
    qPushDistanceFeet: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: OpenHandTechniqueWitnessState

  pure def qTargetOpportunityAttackDenied: bool = qState.qTargetOpportunityAttackDenied
  pure def qTargetProne: bool = qState.qTargetProne
  pure def qPushDistanceFeet: int = qState.qPushDistanceFeet
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
    targetOpportunityAttackDenied: bool,
    targetProne: bool,
    pushDistanceFeet: int,
    lastResult: str,
    lastInvalidReason: str,
  ): bool = all {
    qState' = {
      qTargetOpportunityAttackDenied: targetOpportunityAttackDenied,
      qTargetProne: targetProne,
      qPushDistanceFeet: pushDistanceFeet,
      qScenarioResult: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, lastInvalidReason),
    },
  }
  action init = recordProjection(false, false, 0, "init", "")

  action doAddle = all {
    qLastResult == "init",
    recordProjection(true, false, 0, "addle", ""),
  }

  action doPushSaveSucceeded = all {
    qLastResult == "init",
    recordProjection(false, false, 0, "pushSaveSucceeded", ""),
  }

  action doPushSaveFailed = all {
    qLastResult == "init",
    recordProjection(false, false, 10, "pushSaveFailed", ""),
  }

  action doToppleSaveSucceeded = all {
    qLastResult == "init",
    recordProjection(false, false, 0, "toppleSaveSucceeded", ""),
  }

  action doToppleSaveFailed = all {
    qLastResult == "init",
    recordProjection(false, true, 0, "toppleSaveFailed", ""),
  }

  action doRejectNonFlurry = all {
    qLastResult == "init",
    recordProjection(false, false, 0, "rejectNonFlurry", "invalidFill"),
  }

  action doRejectPushTooFar = all {
    qLastResult == "init",
    recordProjection(false, false, 0, "rejectPushTooFar", "invalidFill"),
  }

  action doRejectTopplePushDisposition = all {
    qLastResult == "init",
    recordProjection(false, false, 0, "rejectTopplePushDisposition", "invalidFill"),
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
