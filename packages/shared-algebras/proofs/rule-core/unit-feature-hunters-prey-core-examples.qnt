// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.hunters-prey

module unitFeatureHuntersPreyCoreExamples {
  import unitFeatureHuntersPreyCore.* from "./unit-feature-hunters-prey-core"

  run test_hunters_prey_projects_colossus_slayer_and_horde_breaker_predicates = {
    all {
      assert(colossusSlayerDamageDice == 1),
      assert(colossusSlayerDamageDieSize == 8),
      assert(colossusSlayerApplies({
        selectedChoice: ColossusSlayerChoice,
        hitWithWeapon: true,
        targetMissingHitPoints: true,
        usedThisTurn: false,
      })),
      assert(not(colossusSlayerApplies({
        selectedChoice: ColossusSlayerChoice,
        hitWithWeapon: true,
        targetMissingHitPoints: false,
        usedThisTurn: false,
      }))),
      assert(hordeBreakerAttackAvailable({
        selectedChoice: HordeBreakerChoice,
        madeWeaponAttack: true,
        usedThisTurn: false,
        secondTargetDifferent: true,
        secondTargetWithinFiveFeetOfOriginal: true,
        secondTargetWithinWeaponRange: true,
        secondTargetNotAttackedThisTurn: true,
      })),
    }
  }
}
