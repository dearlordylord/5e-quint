// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.open-hand-technique

module unitFeatureOpenHandTechniqueCoreExamples {
  import unitFeatureOpenHandTechniqueCore.* from "./unit-feature-open-hand-technique-core"

  run test_open_hand_technique_projects_flurry_gate_save_abilities_and_push_cap = {
    all {
      assert(openHandTechniqueAvailable(true, true)),
      assert(not(openHandTechniqueAvailable(true, false))),
      assert(openHandPushDistanceValid(15)),
      assert(not(openHandPushDistanceValid(20))),
      assert(openHandSaveRequirement(OpenHandPush) == OpenHandStrengthSave),
      assert(openHandSaveRequirement(OpenHandTopple) == OpenHandDexteritySave),
      assert(openHandSaveRequirement(OpenHandAddle) == OpenHandNoSave),
    }
  }
}
