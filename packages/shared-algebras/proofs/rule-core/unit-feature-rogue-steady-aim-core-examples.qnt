// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.rogue-steady-aim

module unitFeatureRogueSteadyAimCoreExamples {
  import unitFeatureRogueSteadyAimCore.* from "./unit-feature-rogue-steady-aim-core"

  run test_rogue_steady_aim_projects_bonus_action_movement_gate_advantage_and_speed_zero = {
    all {
      assert(rogueSteadyAimAvailable({
        bonusActionAvailable: true,
        movedThisTurn: false,
        nextAttackAdvantageAlreadyActive: false,
      })),
      assert(not(rogueSteadyAimAvailable({
        bonusActionAvailable: true,
        movedThisTurn: true,
        nextAttackAdvantageAlreadyActive: false,
      }))),
      assert(rogueSteadyAimSpeedFeetAfterUse == 0),
      assert(rogueSteadyAimGrantsNextAttackAdvantage),
      assert(rogueSteadyAimEffectEndsAtEndOfCurrentTurn),
    }
  }
}
