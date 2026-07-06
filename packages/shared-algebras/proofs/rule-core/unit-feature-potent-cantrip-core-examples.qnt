// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.potent-cantrip

module unitFeaturePotentCantripCoreExamples {
  import unitFeaturePotentCantripCore.* from "./unit-feature-potent-cantrip-core"

  run test_potent_cantrip_halves_damage_for_creature_miss_or_success_and_suppresses_effects = {
    all {
      assert(potentCantripDamage({
        targetIsCreature: true,
        isCantrip: true,
        trigger: MissedCantripAttackRoll,
        normalDamage: 5,
      }) == 2),
      assert(potentCantripDamage({
        targetIsCreature: true,
        isCantrip: true,
        trigger: SuccessfulCantripSavingThrow,
        normalDamage: 5,
      }) == 2),
      assert(not(potentCantripAdditionalEffectsApply({
        targetIsCreature: true,
        isCantrip: true,
        trigger: MissedCantripAttackRoll,
        normalDamage: 5,
      }))),
      assert(potentCantripDamage({
        targetIsCreature: false,
        isCantrip: true,
        trigger: MissedCantripAttackRoll,
        normalDamage: 5,
      }) == 0),
    }
  }
}
