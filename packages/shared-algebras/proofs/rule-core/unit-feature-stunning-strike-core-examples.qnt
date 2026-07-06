// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.stunning-strike

module unitFeatureStunningStrikeCoreExamples {
  import unitFeatureStunningStrikeCore.* from "./unit-feature-stunning-strike-core"

  run test_stunning_strike_projects_hit_gate_focus_cost_and_save_outcomes = {
    all {
      assert(stunningStrikeFocusCost == 1),
      assert(stunningStrikeAttemptAvailable(StunningStrikeUnarmedStrikeHit, false, 2)),
      assert(stunningStrikeAttemptAvailable(StunningStrikeMonkWeaponHit, false, 1)),
      assert(not(stunningStrikeAttemptAvailable(StunningStrikeOtherHit, false, 2))),
      assert(not(stunningStrikeAttemptAvailable(StunningStrikeUnarmedStrikeHit, true, 2))),
      assert(stunningStrikeAppliesStunned(StunningStrikeFailedSave)),
      assert(stunningStrikeHalvesSpeed(StunningStrikeSuccessfulSave)),
      assert(stunningStrikeNextAttackAdvantage(StunningStrikeSuccessfulSave)),
    }
  }
}
