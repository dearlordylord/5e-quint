// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.open-hand-technique
module battleRuntimeOpenHandTechniqueTests {
  import battleRuntimeOpenHandTechnique.* from "./battle-runtime-open-hand-technique"

  run test_open_hand_technique_addle_denies_opportunity_attacks = all {
    val result = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandAddle, OpenHandSaveSucceeded, 0)
    all {
      assert(result.targetOpportunityAttackDenied),
      assert(not(result.targetProne)),
      assert(result.pushDistanceFeet == 0),
      assert(not(result.rejected)),
    }
  }

  run test_open_hand_technique_push_requires_failed_strength_save = all {
    val failed = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandPush, OpenHandSaveFailed, 10)
    val succeeded = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandPush, OpenHandSaveSucceeded, 10)
    all {
      assert(failed.pushDistanceFeet == 10),
      assert(succeeded.pushDistanceFeet == 0),
      assert(not(failed.targetProne)),
      assert(not(succeeded.targetProne)),
    }
  }

  run test_open_hand_technique_push_rejects_distance_beyond_fifteen_feet = all {
    val tooFar = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandPush, OpenHandSaveFailed, 20)
    all {
      assert(tooFar.rejected),
      assert(tooFar.pushDistanceFeet == 0),
    }
  }

  run test_open_hand_technique_topple_requires_failed_dexterity_save = all {
    val failed = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandTopple, OpenHandSaveFailed, 0)
    val succeeded = openHandTechniqueAfterHit(initialOpenHandTechniqueState, OpenHandTopple, OpenHandSaveSucceeded, 0)
    all {
      assert(failed.targetProne),
      assert(not(succeeded.targetProne)),
      assert(failed.pushDistanceFeet == 0),
      assert(succeeded.pushDistanceFeet == 0),
    }
  }

  run test_open_hand_technique_rejects_stale_or_non_flurry_hits = all {
    val nonFlurry = openHandTechniqueAfterHit({ ...initialOpenHandTechniqueState, flurryHitWindow: false }, OpenHandAddle, OpenHandSaveSucceeded, 0)
    val staleTarget = openHandTechniqueAfterHit({ ...initialOpenHandTechniqueState, targetPresent: false }, OpenHandTopple, OpenHandSaveFailed, 0)
    val unselected = openHandTechniqueAfterHit({ ...initialOpenHandTechniqueState, selectedProfile: false }, OpenHandPush, OpenHandSaveFailed, 10)
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
