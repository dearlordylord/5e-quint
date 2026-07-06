// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.enemy-zero-hit-point-temporary-hit-points

module unitFeatureDarkOnesBlessingCoreExamples {
  import unitFeatureDarkOnesBlessingCore.* from "./unit-feature-dark-ones-blessing-core"

  run test_dark_ones_blessing_projects_trigger_range_and_minimum_temporary_hit_points = {
    all {
      assert(darkOnesBlessingRangeFeet == 10),
      assert(darkOnesBlessingTriggerEligible({
        enemyReducedToZeroHitPoints: true,
        reducedByBeneficiary: true,
        reducedByOtherWithinTenFeet: false,
      })),
      assert(darkOnesBlessingTriggerEligible({
        enemyReducedToZeroHitPoints: true,
        reducedByBeneficiary: false,
        reducedByOtherWithinTenFeet: true,
      })),
      assert(not(darkOnesBlessingTriggerEligible({
        enemyReducedToZeroHitPoints: true,
        reducedByBeneficiary: false,
        reducedByOtherWithinTenFeet: false,
      }))),
      assert(darkOnesBlessingTemporaryHitPoints(3, 3) == 6),
      assert(darkOnesBlessingTemporaryHitPoints(-2, 1) == 1),
    }
  }
}
