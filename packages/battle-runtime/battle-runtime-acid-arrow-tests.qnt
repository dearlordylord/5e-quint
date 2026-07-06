// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-acid-arrow-attack-timing

module battleRuntimeAcidArrowTests {
  import battleRuntimeAcidArrow.* from "./battle-runtime-acid-arrow"

  run test_acid_arrow_base_profile_facts = {
    all {
      assert(acidArrowInitialDamageDice(2) == 4),
      assert(acidArrowLaterDamageDice(2) == 2),
      assert(acidArrowLaterDamageAnchor == AcidArrowTargetEndOfNextTurn),
      assert(acidArrowDelayedDamageTiming(true) == AcidArrowDelayedDamageAt(AcidArrowTargetEndOfNextTurn)),
      assert(acidArrowDelayedDamageTiming(false) == NoAcidArrowDelayedDamage),
    }
  }

  run test_acid_arrow_upcast_increases_initial_and_later_damage = {
    all {
      assert(acidArrowInitialDamageDice(3) == 5),
      assert(acidArrowLaterDamageDice(3) == 3),
    }
  }

  run test_acid_arrow_miss_halves_initial_damage_only = {
    all {
      assert(acidArrowMissDamage(16) == 8),
      assert(acidArrowMissDamage(15) == 7),
      assert(not(acidArrowDelayedDamageIsActive(NoAcidArrowDelayedDamage))),
      assert(acidArrowDelayedDamageIsActive(AcidArrowDelayedDamageAt(AcidArrowTargetEndOfNextTurn))),
    }
  }
}
