// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.grappler

module unitFeatureGrapplerCoreExamples {
  import creatureSizeOrder.* from "./creature-size-order"
  import unitFeatureGrapplerCore.* from "./unit-feature-grappler-core"

  run test_grappler_projects_punch_grab_advantage_and_fast_wrestler_size_gate = {
    all {
      assert(grapplerPunchAndGrabAvailable({
        hitWithUnarmedStrike: true,
        partOfAttackActionOnTurn: true,
        usedThisTurn: false,
      })),
      assert(not(grapplerPunchAndGrabAvailable({
        hitWithUnarmedStrike: true,
        partOfAttackActionOnTurn: true,
        usedThisTurn: true,
      }))),
      assert(grapplerAttackAdvantageApplies(true)),
      assert(grapplerFastWrestlerAvoidsExtraMovement(MediumSize, SmallSize)),
      assert(grapplerFastWrestlerAvoidsExtraMovement(MediumSize, MediumSize)),
      assert(not(grapplerFastWrestlerAvoidsExtraMovement(MediumSize, LargeSize))),
    }
  }
}
