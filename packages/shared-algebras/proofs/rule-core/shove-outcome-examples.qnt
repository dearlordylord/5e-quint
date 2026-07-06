// -*- mode: Bluespec; -*-

module shoveOutcomeExamples {
  import shoveOutcome.* from "./shove-outcome"

  run test_save_success_is_noop = {
    val result = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveSucceeded))
    match result {
      | ShoveOutcomeAcceptedWithoutEffectProjection(data) => all {
        assert(not(data.targetProne)),
      }
      | _ => false
    }
  }

  run test_failed_save_can_apply_prone = {
    val result = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveFailed({ failedEffect: ShoveProne })))
    match result {
      | ShoveOutcomeAcceptedToppleProjection => true
      | _ => false
    }
  }

  run test_failed_save_can_emit_legal_push_disposition = {
    val result = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveFailed({
      failedEffect: ShovePushAway(ShovePushed({ distanceFeet: 5 })),
    })))
    match result {
      | ShoveOutcomeAcceptedPushProjection(data) =>
        match data.push {
          | ShovePushCompletedProjection => all {
            assert(not(data.targetProne)),
          }
          | _ => false
        }
      | _ => false
    }
  }

  run test_failed_save_can_emit_blocked_push_disposition = {
    val blocked = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveFailed({
      failedEffect: ShovePushAway(ShoveBlocked({ distanceFeet: 5, reason: ShovePushBlocked })),
    })))
    val noLegalDestination = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveFailed({
      failedEffect: ShovePushAway(ShoveBlocked({ distanceFeet: 5, reason: ShovePushNoLegalDestination })),
    })))
    match blocked {
      | ShoveOutcomeAcceptedPushProjection(blockedData) =>
        match blockedData.push {
          | ShovePushBlockedProjection(blockedPush) =>
            match noLegalDestination {
              | ShoveOutcomeAcceptedPushProjection(noLegalDestinationData) =>
                match noLegalDestinationData.push {
                  | ShovePushBlockedProjection(noLegalDestinationPush) => all {
                    assert(blockedPush.reason == ShovePushBlocked),
                    assert(noLegalDestinationPush.reason == ShovePushNoLegalDestination),
                  }
                  | _ => false
                }
              | _ => false
            }
          | _ => false
        }
      | _ => false
    }
  }

  run test_invalid_push_disposition_rejected = {
    val wrongDistance = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveFailed({
      failedEffect: ShovePushAway(ShovePushed({ distanceFeet: 10 })),
    })))
    match wrongDistance {
      | ShoveOutcomeRejectedProjection(data) => all {
        assert(not(data.targetProne)),
      }
      | _ => false
    }
  }
}
