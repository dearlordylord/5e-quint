// -*- mode: Bluespec; -*-

module ruleCoreShoveOutcomeMbt {
  import shoveOutcome.* from "../shared-algebras/proofs/rule-core/shove-outcome"

  var qLastScenario: str
  var qAccepted: bool
  var qTargetProne: bool
  var qPushEmitted: bool
  var qPushDispositionKind: str
  var qPushBlockedReason: str
  var qPushDistanceFeet: int
  var qPushProvokesOpportunityAttacks: bool
  var qActionAvailable: bool
  var qReplayIndex: int

  pure def saveSucceeds: str = "save-succeeds"
  pure def saveFailsProne: str = "save-fails-prone"
  pure def saveFailsPush: str = "save-fails-push"
  pure def saveFailsPushBlocked: str = "save-fails-push-blocked"
  pure def saveFailsPushNoLegalDestination: str = "save-fails-push-no-legal-destination"
  pure def invalidPushDistance: str = "invalid-push-distance"

  action recordShoveResult(scenario: str, result: ShoveOutcomeResult, nextReplayIndex: int): bool = {
    val projection = projectShoveOutcomeResult(result)
    all {
      qLastScenario' = scenario,
      qAccepted' = projection.accepted,
      qTargetProne' = projection.targetProne,
      qPushEmitted' = projection.pushEmitted,
      qPushDispositionKind' = projection.pushDispositionKind,
      qPushBlockedReason' = projection.pushBlockedReason,
      qPushDistanceFeet' = projection.pushDistanceFeet,
      qPushProvokesOpportunityAttacks' = projection.pushProvokesOpportunityAttacks,
      qActionAvailable' = projection.actionAvailable,
      qReplayIndex' = nextReplayIndex,
    }
  }

  action init = all {
    qLastScenario' = "init",
    qAccepted' = true,
    qTargetProne' = false,
    qPushEmitted' = false,
    qPushDispositionKind' = "none",
    qPushBlockedReason' = "none",
    qPushDistanceFeet' = 0,
    qPushProvokesOpportunityAttacks' = false,
    qActionAvailable' = true,
    qReplayIndex' = 0,
  }

  action doSaveSucceeds = all {
    qReplayIndex == 0,
    recordShoveResult(saveSucceeds, applyShoveOutcome(false, ShoveSaveSucceeded), 1),
  }

  action doSaveFailsProne = all {
    qReplayIndex == 1,
    recordShoveResult(
      saveFailsProne,
      applyShoveOutcome(false, ShoveSaveFailed({ failedEffect: ShoveProne })),
      2
    ),
  }

  action doSaveFailsPush = all {
    qReplayIndex == 2,
    recordShoveResult(
      saveFailsPush,
      applyShoveOutcome(false, ShoveSaveFailed({
        failedEffect: ShovePushAway(ShovePushed({ distanceFeet: 5 })),
      })),
      3
    ),
  }

  action doSaveFailsPushBlocked = all {
    qReplayIndex == 3,
    recordShoveResult(
      saveFailsPushBlocked,
      applyShoveOutcome(false, ShoveSaveFailed({
        failedEffect: ShovePushAway(ShoveBlocked({ distanceFeet: 5, reason: ShovePushBlocked })),
      })),
      4
    ),
  }

  action doSaveFailsPushNoLegalDestination = all {
    qReplayIndex == 4,
    recordShoveResult(
      saveFailsPushNoLegalDestination,
      applyShoveOutcome(false, ShoveSaveFailed({
        failedEffect: ShovePushAway(ShoveBlocked({ distanceFeet: 5, reason: ShovePushNoLegalDestination })),
      })),
      5
    ),
  }

  action doInvalidPushDistance = all {
    qReplayIndex == 5,
    recordShoveResult(
      invalidPushDistance,
      applyShoveOutcome(false, ShoveSaveFailed({
        failedEffect: ShovePushAway(ShovePushed({ distanceFeet: 10 })),
      })),
      6
    ),
  }

  action step = any {
    doSaveSucceeds,
    doSaveFailsProne,
    doSaveFailsPush,
    doSaveFailsPushBlocked,
    doSaveFailsPushNoLegalDestination,
    doInvalidPushDistance,
  }
}
