// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.open-hand-technique
module battleRuntimeOpenHandTechniqueTests {
  import battleRuntimeOpenHandTechnique.* from "./battle-runtime-open-hand-technique"

  run test_open_hand_technique_decline_is_no_op = all {
    val result = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandDecline, OpenHandSaveSucceeded, 0)
    all {
      assert(not(result.targetOpportunityAttackDenied)),
      assert(not(result.targetProne)),
      assert(result.pushDistanceFeet == 0),
      assert(not(result.rejected)),
    }
  }

  run test_open_hand_technique_addle_denies_opportunity_attacks = all {
    val result = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandDenyOpportunityAttacks, OpenHandSaveSucceeded, 0)
    all {
      assert(result.targetOpportunityAttackDenied),
      assert(not(result.targetProne)),
      assert(result.pushDistanceFeet == 0),
      assert(not(result.rejected)),
    }
  }

  run test_open_hand_technique_push_requires_failed_strength_save = all {
    val failed = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandPushAwayOnFailedStrengthSave, OpenHandSaveFailed, 10)
    val succeeded = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandPushAwayOnFailedStrengthSave, OpenHandSaveSucceeded, 10)
    all {
      assert(failed.pushDistanceFeet == 10),
      assert(succeeded.pushDistanceFeet == 0),
      assert(not(failed.targetProne)),
      assert(not(succeeded.targetProne)),
    }
  }

  run test_open_hand_technique_push_rejects_distance_beyond_fifteen_feet = all {
    val tooFar = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandPushAwayOnFailedStrengthSave, OpenHandSaveFailed, 20)
    all {
      assert(tooFar.rejected),
      assert(tooFar.pushDistanceFeet == 0),
    }
  }

  run test_open_hand_technique_topple_requires_failed_dexterity_save = all {
    val failed = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandApplyProneOnFailedDexteritySave, OpenHandSaveFailed, 0)
    val succeeded = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandApplyProneOnFailedDexteritySave, OpenHandSaveSucceeded, 0)
    all {
      assert(failed.targetProne),
      assert(not(succeeded.targetProne)),
      assert(failed.pushDistanceFeet == 0),
      assert(succeeded.pushDistanceFeet == 0),
    }
  }

  run test_open_hand_technique_rejects_stale_or_non_flurry_hits = all {
    val nonFlurry = openHandTechniqueAfterHit({ ...initialOpenHandTechniqueState, flurryHitWindow: false }, OpenHandDenyOpportunityAttacks, OpenHandSaveSucceeded, 0)
    val staleTarget = openHandTechniqueAfterHit({ ...initialOpenHandTechniqueState, targetPresent: false }, OpenHandApplyProneOnFailedDexteritySave, OpenHandSaveFailed, 0)
    val unselected = openHandTechniqueAfterHit({ ...initialOpenHandTechniqueState, selectedProfile: false }, OpenHandPushAwayOnFailedStrengthSave, OpenHandSaveFailed, 10)
    all {
      assert(nonFlurry.rejected),
      assert(staleTarget.rejected),
      assert(unselected.rejected),
      assert(not(nonFlurry.targetOpportunityAttackDenied)),
      assert(not(staleTarget.targetProne)),
      assert(unselected.pushDistanceFeet == 0),
    }
  }
}
