// -*- mode: Bluespec; -*-

module hitPointMaximumExamples {
  import hitPointMaximum.* from "./hit-point-maximum"

  pure def fighterLevelTwoFacts(gain: HigherLevelHitPointGain, constitutionModifier: int): HitPointMaximumFacts =
    {
      startingHitPointDie: 10,
      constitutionModifier: constitutionModifier,
      higherLevelHitPointGains: [gain],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    }

  run test_fixed_higher_level_gain_adds_half_the_die_plus_one_and_constitution = {
    val facts = fighterLevelTwoFacts(fixedHigherLevelHitPointGainFor(10), 2)
    all {
      assert(legalHitPointMaximumFacts(facts)),
      assert(normalHitPointMaximum(facts) == 12 + 8),
    }
  }

  run test_rolled_higher_level_gain_adds_the_roll_and_constitution = {
    val facts = fighterLevelTwoFacts(rolledHigherLevelHitPointGainFor(10, 10), 2)
    all {
      assert(legalHitPointMaximumFacts(facts)),
      assert(normalHitPointMaximum(facts) == 12 + 12),
    }
  }

  run test_rolled_higher_level_gain_can_be_below_the_fixed_value = {
    val facts = fighterLevelTwoFacts(rolledHigherLevelHitPointGainFor(10, 2), 0)
    all {
      assert(legalHitPointMaximumFacts(facts)),
      assert(normalHitPointMaximum(facts) == 10 + 2),
    }
  }

  run test_rolled_higher_level_gain_is_at_least_one = {
    val facts = {
      startingHitPointDie: 6,
      constitutionModifier: -3,
      higherLevelHitPointGains: [rolledHigherLevelHitPointGainFor(6, 1)],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    }
    all {
      assert(legalHitPointMaximumFacts(facts)),
      assert(normalHitPointMaximum(facts) == 3 + 1),
    }
  }

  run test_constitution_increase_adds_one_per_level_to_rolled_gains = {
    val gains = [
      rolledHigherLevelHitPointGainFor(10, 7),
      fixedHigherLevelHitPointGainFor(10),
      rolledHigherLevelHitPointGainFor(10, 3),
    ]
    val before = {
      startingHitPointDie: 10,
      constitutionModifier: 1,
      higherLevelHitPointGains: gains,
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    }
    val after = { ...before, constitutionModifier: 2 }
    all {
      assert(normalHitPointMaximum(before) == 11 + 8 + 7 + 4),
      assert(normalHitPointMaximum(after) == normalHitPointMaximum(before) + 4),
    }
  }

  run test_rolled_higher_level_gain_above_the_hit_die_is_illegal = {
    val facts = fighterLevelTwoFacts(rolledHigherLevelHitPointGainFor(10, 11), 0)
    assert(not(legalHitPointMaximumFacts(facts)))
  }

  run test_rolled_higher_level_gain_below_one_is_illegal = {
    val facts = fighterLevelTwoFacts(rolledHigherLevelHitPointGainFor(10, 0), 0)
    assert(not(legalHitPointMaximumFacts(facts)))
  }
}
