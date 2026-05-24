// -*- mode: Bluespec; -*-

module shoveOutcomeExamples {
  import shoveOutcome.* from "./shove-outcome"

  run test_save_success_is_noop = {
    val result = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveSucceeded))
    all {
      assert(result.accepted),
      assert(not(result.targetProne)),
      assert(not(result.pushEmitted)),
      assert(not(result.actionAvailable)),
    }
  }

  run test_failed_save_can_apply_prone = {
    val result = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveFailed({ failedEffect: ShoveProne })))
    all {
      assert(result.accepted),
      assert(result.targetProne),
      assert(not(result.pushEmitted)),
      assert(not(result.actionAvailable)),
    }
  }

  run test_failed_save_can_emit_legal_push_disposition = {
    val result = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveFailed({
      failedEffect: ShovePushAway(ShovePushed({ distanceFeet: 5 })),
    })))
    all {
      assert(result.accepted),
      assert(not(result.targetProne)),
      assert(result.pushEmitted),
      assert(result.pushDispositionKind == "pushed"),
      assert(result.pushBlockedReason == "none"),
      assert(result.pushDistanceFeet == 5),
      assert(not(result.pushProvokesOpportunityAttacks)),
      assert(not(result.actionAvailable)),
    }
  }

  run test_failed_save_can_emit_blocked_push_disposition = {
    val blocked = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveFailed({
      failedEffect: ShovePushAway(ShoveBlocked({ distanceFeet: 5, reason: ShovePushBlocked })),
    })))
    val noLegalDestination = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveFailed({
      failedEffect: ShovePushAway(ShoveBlocked({ distanceFeet: 5, reason: ShovePushNoLegalDestination })),
    })))
    all {
      assert(blocked.accepted),
      assert(blocked.pushEmitted),
      assert(blocked.pushDispositionKind == "blocked"),
      assert(blocked.pushBlockedReason == "blocked"),
      assert(noLegalDestination.accepted),
      assert(noLegalDestination.pushEmitted),
      assert(noLegalDestination.pushDispositionKind == "blocked"),
      assert(noLegalDestination.pushBlockedReason == "noLegalDestination"),
    }
  }

  run test_invalid_push_disposition_rejected = {
    val wrongDistance = projectShoveOutcomeResult(applyShoveOutcome(false, ShoveSaveFailed({
      failedEffect: ShovePushAway(ShovePushed({ distanceFeet: 10 })),
    })))
    all {
      assert(not(wrongDistance.accepted)),
      assert(not(wrongDistance.pushEmitted)),
      assert(wrongDistance.actionAvailable),
    }
  }
}
