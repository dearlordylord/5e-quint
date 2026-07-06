// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.magic-action-healing-pool

module unitFeaturePreserveLifeCoreExamples {
  import unitFeaturePreserveLifeCore.* from "./unit-feature-preserve-life-core"

  run test_preserve_life_projects_pool_range_bloodied_gate_and_half_hp_cap = {
    all {
      assert(preserveLifeRangeFeet == 30),
      assert(preserveLifeHealingPool(3) == 15),
      assert(preserveLifeTargetEligible({ bloodied: true, withinThirtyFeet: true })),
      assert(not(preserveLifeTargetEligible({ bloodied: false, withinThirtyFeet: true }))),
      assert(preserveLifeTargetHealingCap(21) == 10),
    }
  }
}
