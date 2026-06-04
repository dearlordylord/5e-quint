// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.open-hand-technique
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.open-hand-technique

module battleRuntimeOpenHandTechniqueMbt {
  var qTargetOpportunityAttackDenied: bool
  var qTargetProne: bool
  var qPushDistanceFeet: int
  var qLastResult: str
  var qLastInvalidReason: str

  action recordProjection(
    targetOpportunityAttackDenied: bool,
    targetProne: bool,
    pushDistanceFeet: int,
    lastResult: str,
    lastInvalidReason: str,
  ): bool = all {
    qTargetOpportunityAttackDenied' = targetOpportunityAttackDenied,
    qTargetProne' = targetProne,
    qPushDistanceFeet' = pushDistanceFeet,
    qLastResult' = lastResult,
    qLastInvalidReason' = lastInvalidReason,
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
