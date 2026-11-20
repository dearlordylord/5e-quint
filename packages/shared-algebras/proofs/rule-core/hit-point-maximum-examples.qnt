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
    val facts = fighterLevelTwoFacts(fixedHigherLevelHitPointGainFor(10, 2), 2)
    all {
      assert(legalHitPointMaximumFacts(facts)),
      assert(normalHitPointMaximum(facts) == 12 + 8),
    }
  }

  run test_rolled_higher_level_gain_adds_the_roll_and_constitution = {
    val facts = fighterLevelTwoFacts(rolledHigherLevelHitPointGainFor(10, 10, 2), 2)
    all {
      assert(legalHitPointMaximumFacts(facts)),
      assert(normalHitPointMaximum(facts) == 12 + 12),
    }
  }

  run test_rolled_higher_level_gain_can_be_below_the_fixed_value = {
    val facts = fighterLevelTwoFacts(rolledHigherLevelHitPointGainFor(10, 2, 0), 0)
    all {
      assert(legalHitPointMaximumFacts(facts)),
      assert(normalHitPointMaximum(facts) == 10 + 2),
    }
  }

  run test_rolled_higher_level_gain_is_at_least_one = {
    val facts = {
      startingHitPointDie: 6,
      constitutionModifier: -3,
      higherLevelHitPointGains: [rolledHigherLevelHitPointGainFor(6, 1, -3)],
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
      rolledHigherLevelHitPointGainFor(10, 7, 1),
      fixedHigherLevelHitPointGainFor(10, 1),
      rolledHigherLevelHitPointGainFor(10, 3, 1),
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

  // A level whose gain was raised to the minimum of 1 still gains 1 for each
  // later +1 to the modifier.
  run test_constitution_increase_adds_one_to_a_minimum_gain = {
    val before = {
      startingHitPointDie: 6,
      constitutionModifier: -1,
      higherLevelHitPointGains: [rolledHigherLevelHitPointGainFor(6, 1, -1)],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    }
    val after = { ...before, constitutionModifier: 0 }
    all {
      assert(legalHitPointMaximumFacts(before)),
      assert(normalHitPointMaximum(before) == 5 + 1),
      assert(legalHitPointMaximumFacts(after)),
      assert(normalHitPointMaximum(after) == normalHitPointMaximum(before) + 2),
    }
  }

  // The Level Advancement example: Constitution 17 to 18 at level 8. Level 8
  // gains its Hit Points at +3, then every level gains 1.
  run test_constitution_increase_at_a_level_counts_that_level_once = {
    val earlierGains = [
      fixedHigherLevelHitPointGainFor(10, 3),
      fixedHigherLevelHitPointGainFor(10, 3),
      fixedHigherLevelHitPointGainFor(10, 3),
      fixedHigherLevelHitPointGainFor(10, 3),
      fixedHigherLevelHitPointGainFor(10, 3),
      fixedHigherLevelHitPointGainFor(10, 3),
    ]
    val levelSeven = {
      startingHitPointDie: 10,
      constitutionModifier: 3,
      higherLevelHitPointGains: earlierGains,
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    }
    val levelEight = {
      ...levelSeven,
      constitutionModifier: 4,
      higherLevelHitPointGains: earlierGains.append(fixedHigherLevelHitPointGainFor(10, 3)),
    }
    all {
      assert(legalHitPointMaximumFacts(levelEight)),
      assert(normalHitPointMaximum(levelEight) == normalHitPointMaximum(levelSeven) + (6 + 3) + 8),
    }
  }

  run test_a_level_recording_a_modifier_above_the_current_is_illegal = {
    val facts = fighterLevelTwoFacts(fixedHigherLevelHitPointGainFor(10, 1), 0)
    assert(not(legalHitPointMaximumFacts(facts)))
  }

  run test_a_level_recording_a_modifier_below_the_lowest_is_illegal = {
    val facts = fighterLevelTwoFacts(rolledHigherLevelHitPointGainFor(10, 1, -6), 2)
    assert(not(legalHitPointMaximumFacts(facts)))
  }

  run test_a_level_recording_a_modifier_below_an_earlier_level_is_illegal = {
    val facts = {
      ...fighterLevelTwoFacts(fixedHigherLevelHitPointGainFor(10, 2), 2),
      higherLevelHitPointGains: [
        fixedHigherLevelHitPointGainFor(10, 2),
        rolledHigherLevelHitPointGainFor(10, 1, 1),
      ],
    }
    assert(not(legalHitPointMaximumFacts(facts)))
  }

  run test_rolled_higher_level_gain_above_the_hit_die_is_illegal = {
    val facts = fighterLevelTwoFacts(rolledHigherLevelHitPointGainFor(10, 11, 0), 0)
    assert(not(legalHitPointMaximumFacts(facts)))
  }

  run test_rolled_higher_level_gain_below_one_is_illegal = {
    val facts = fighterLevelTwoFacts(rolledHigherLevelHitPointGainFor(10, 0, 0), 0)
    assert(not(legalHitPointMaximumFacts(facts)))
  }
}
