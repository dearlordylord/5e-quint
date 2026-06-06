// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-acid-arrow-attack-timing
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-acid-arrow-attack-timing
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING

module battleRuntimeAcidArrow {
  pure def acidArrowInitialDamageDice(slotLevel: int): int =
    4 + (slotLevel - 2)

  pure def acidArrowLaterDamageDice(slotLevel: int): int =
    2 + (slotLevel - 2)

  pure def acidArrowMissDamage(initialDamageRoll: int): int =
    initialDamageRoll / 2

  pure def acidArrowLaterDamageAnchor: str = "targetEndOfNextTurn"

  run test_acid_arrow_base_profile_facts = {
    all {
      assert(acidArrowInitialDamageDice(2) == 4),
      assert(acidArrowLaterDamageDice(2) == 2),
      assert(acidArrowLaterDamageAnchor == "targetEndOfNextTurn"),
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
    }
  }
}
