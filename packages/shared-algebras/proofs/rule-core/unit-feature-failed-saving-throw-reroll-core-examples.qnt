// -*- mode: Bluespec; -*-

module unitFeatureFailedSavingThrowRerollCoreExamples {
  import unitFeatureD20TestNaturalOneRerollCore.* from "./unit-feature-d20-test-natural-one-reroll-core"
  import unitFeatureFailedSavingThrowRerollCore.* from "./unit-feature-failed-saving-throw-reroll-core"
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"

  pure val failedSave: FailedSavingThrowRerollFacts = {
    hasFeature: true,
    usesRemaining: 1,
    classLevel: 9,
    original: { naturalD20: 4, succeeded: false },
    rolledD20s: FailedSavingThrowOneD20,
    decision: FailedSavingThrowRerollDeclined,
  }

  run test_failed_save_offers_the_reroll_with_the_class_level = {
    val result = resolveFailedSavingThrowReroll(failedSave)
    all {
      assert(result.offered),
      assert(result.offeredBonus == 9),
    }
  }

  run test_successful_new_roll_stands_and_spends_a_use = {
    val result = resolveFailedSavingThrowReroll({
      ...failedSave,
      decision: FailedSavingThrowRerollSelected({
        replacement: { naturalD20: 6, succeeded: true },
      }),
    })
    all {
      assert(result.admitted),
      assert(not(result.invalid)),
      assert(result.effective == { naturalD20: 6, succeeded: true }),
      assert(result.usesRemainingAfter == 0),
    }
  }

  run test_failed_new_roll_must_still_be_used = {
    val result = resolveFailedSavingThrowReroll({
      ...failedSave,
      decision: FailedSavingThrowRerollSelected({
        replacement: { naturalD20: 1, succeeded: false },
      }),
    })
    all {
      assert(result.admitted),
      assert(result.effective == { naturalD20: 1, succeeded: false }),
      assert(result.usesRemainingAfter == 0),
    }
  }

  run test_decline_keeps_the_failed_roll_and_the_use = {
    val result = resolveFailedSavingThrowReroll(failedSave)
    all {
      assert(not(result.admitted)),
      assert(not(result.invalid)),
      assert(result.effective == failedSave.original),
      assert(result.usesRemainingAfter == 1),
    }
  }

  run test_successful_save_is_not_offered_and_refuses_a_reroll = {
    val result = resolveFailedSavingThrowReroll({
      ...failedSave,
      original: { naturalD20: 15, succeeded: true },
      decision: FailedSavingThrowRerollSelected({
        replacement: { naturalD20: 2, succeeded: false },
      }),
    })
    all {
      assert(not(result.offered)),
      assert(result.invalid),
      assert(result.effective == { naturalD20: 15, succeeded: true }),
      assert(result.usesRemainingAfter == 1),
    }
  }

  run test_no_use_left_is_not_offered_and_refuses_a_reroll = {
    val result = resolveFailedSavingThrowReroll({
      ...failedSave,
      usesRemaining: 0,
      decision: FailedSavingThrowRerollSelected({
        replacement: { naturalD20: 6, succeeded: true },
      }),
    })
    all {
      assert(not(result.offered)),
      assert(result.invalid),
      assert(result.effective == failedSave.original),
      assert(result.usesRemainingAfter == 0),
    }
  }

  run test_decline_is_refused_on_a_successful_save = {
    val result = resolveFailedSavingThrowReroll({
      ...failedSave,
      original: { naturalD20: 15, succeeded: true },
    })
    all {
      assert(not(result.offered)),
      assert(result.invalid),
      assert(result.effective == { naturalD20: 15, succeeded: true }),
      assert(result.usesRemainingAfter == 1),
    }
  }

  run test_decline_is_refused_without_a_use_left = {
    val result = resolveFailedSavingThrowReroll({
      ...failedSave,
      usesRemaining: 0,
    })
    all {
      assert(result.invalid),
      assert(result.effective == failedSave.original),
      assert(result.usesRemainingAfter == 0),
    }
  }

  run test_without_the_feature_nothing_is_offered = {
    val result = resolveFailedSavingThrowReroll({
      ...failedSave,
      hasFeature: false,
    })
    assert(not(result.offered))
  }

  run test_under_advantage_the_reroll_replaces_one_chosen_d20 = {
    val dice = { first: 4, second: 3, rollMode: AdvantageD20TestRoll }
    val result = resolveFailedSavingThrowReroll({
      ...failedSave,
      rolledD20s: FailedSavingThrowTwoD20s(dice),
      decision: FailedSavingThrowRolledDieRerollSelected({
        die: SecondD20,
        replacementD20: 18,
        succeeded: true,
      }),
    })
    all {
      assert(result.admitted),
      assert(result.effective == { naturalD20: 18, succeeded: true }),
      assert(result.usesRemainingAfter == 0),
    }
  }

  run test_under_disadvantage_the_lower_d20_still_stands = {
    val dice = { first: 4, second: 12, rollMode: DisadvantageD20TestRoll }
    val result = resolveFailedSavingThrowReroll({
      ...failedSave,
      rolledD20s: FailedSavingThrowTwoD20s(dice),
      decision: FailedSavingThrowRolledDieRerollSelected({
        die: SecondD20,
        replacementD20: 17,
        succeeded: false,
      }),
    })
    all {
      assert(result.admitted),
      assert(result.effective == { naturalD20: 4, succeeded: false }),
      assert(result.usesRemainingAfter == 0),
    }
  }

  run test_whole_roll_reroll_is_refused_under_advantage = {
    val result = resolveFailedSavingThrowReroll({
      ...failedSave,
      rolledD20s: FailedSavingThrowTwoD20s({
        first: 4,
        second: 3,
        rollMode: AdvantageD20TestRoll,
      }),
      decision: FailedSavingThrowRerollSelected({
        replacement: { naturalD20: 18, succeeded: true },
      }),
    })
    all {
      assert(not(result.admitted)),
      assert(result.invalid),
      assert(result.usesRemainingAfter == 1),
    }
  }

  run test_a_chosen_d20_reroll_is_refused_on_a_single_roll = {
    val result = resolveFailedSavingThrowReroll({
      ...failedSave,
      decision: FailedSavingThrowRolledDieRerollSelected({
        die: FirstD20,
        replacementD20: 18,
        succeeded: true,
      }),
    })
    all {
      assert(not(result.admitted)),
      assert(result.invalid),
    }
  }

  pure val failedDeathSave: DeathSavingThrowRerollFacts = {
    hasFeature: true,
    usesRemaining: 1,
    classLevel: 9,
    original: unmodifiedDeathSavingThrowRoll(6),
    decision: DeathSavingThrowRerollDeclined,
  }

  pure val dyingVitals: CreatureVitals = {
    kind: PlayerCharacter,
    hitPoints: 0,
    hitPointMaximum: 12,
    temporaryHitPoints: 0,
    dead: false,
    unconscious: true,
  }

  pure val dyingWithOneSuccess: DeathSavingThrowLifecycle =
    Dying({ successes: 1, failures: 0 })

  pure def deathSaveAfterReroll(replacementD20: int): ZeroHitPointLifecycleResult = {
    val result = resolveDeathSavingThrowReroll({
      ...failedDeathSave,
      decision: DeathSavingThrowRerollSelected({ replacementD20: replacementD20 }),
    })
    resolveStartTurnDeathSavingThrow(dyingVitals, dyingWithOneSuccess, result.effective)
  }

  run test_failed_death_save_offers_the_reroll = {
    val result = resolveDeathSavingThrowReroll(failedDeathSave)
    all {
      assert(result.offered),
      assert(not(result.invalid)),
      assert(result.effective == failedDeathSave.original),
      assert(result.usesRemainingAfter == 1),
    }
  }

  run test_the_class_level_counts_toward_10_on_the_new_d20 = {
    val result = resolveDeathSavingThrowReroll({
      ...failedDeathSave,
      decision: DeathSavingThrowRerollSelected({ replacementD20: 2 }),
    })
    all {
      assert(result.admitted),
      assert(result.effective == { naturalD20: 2, bonus: 9 }),
      assert(not(deathSavingThrowRollFails(result.effective))),
      assert(result.usesRemainingAfter == 0),
      assert(deathSaveAfterReroll(2).deathSavingThrows == Dying({ successes: 2, failures: 0 })),
    }
  }

  run test_a_1_on_the_new_d20_is_two_failures_whatever_the_bonus = {
    val result = deathSaveAfterReroll(1)
    all {
      assert(result.deathSavingThrows == Dying({ successes: 1, failures: 2 })),
      assert(result.deathSavingThrowOutcome == DeathSavingThrowNoHitPointRecovery),
    }
  }

  run test_a_20_on_the_new_d20_regains_a_hit_point = {
    val result = deathSaveAfterReroll(20)
    all {
      assert(result.vitals.hitPoints == 1),
      assert(result.deathSavingThrows == resetDeathSavingThrowLifecycle),
      assert(result.deathSavingThrowOutcome == DeathSavingThrowRegainedHitPoint),
    }
  }

  run test_a_low_class_level_can_leave_the_new_roll_failed = {
    val result = resolveDeathSavingThrowReroll({
      ...failedDeathSave,
      classLevel: 5,
      decision: DeathSavingThrowRerollSelected({ replacementD20: 3 }),
    })
    all {
      assert(result.admitted),
      assert(deathSavingThrowRollFails(result.effective)),
      assert(result.usesRemainingAfter == 0),
    }
  }

  run test_a_natural_1_death_save_is_offered_the_reroll = {
    val result = resolveDeathSavingThrowReroll({
      ...failedDeathSave,
      original: unmodifiedDeathSavingThrowRoll(1),
      decision: DeathSavingThrowRerollSelected({ replacementD20: 5 }),
    })
    all {
      assert(result.offered),
      assert(result.admitted),
      assert(not(deathSavingThrowRollFails(result.effective))),
    }
  }

  run test_a_later_reroll_of_the_d20_keeps_the_bonus = {
    val first = resolveDeathSavingThrowReroll({
      ...failedDeathSave,
      decision: DeathSavingThrowRerollSelected({ replacementD20: 1 }),
    })
    val later = deathSavingThrowRollAfterD20Reroll(first.effective, 2)
    val result = resolveStartTurnDeathSavingThrow(dyingVitals, dyingWithOneSuccess, later)
    all {
      assert(deathSavingThrowRollFails(first.effective)),
      assert(later == { naturalD20: 2, bonus: 9 }),
      assert(result.deathSavingThrows == Dying({ successes: 2, failures: 0 })),
    }
  }

  run test_a_d20_reroll_without_indomitable_keeps_no_bonus = {
    val later = deathSavingThrowRollAfterD20Reroll(unmodifiedDeathSavingThrowRoll(1), 2)
    val result = resolveStartTurnDeathSavingThrow(dyingVitals, dyingWithOneSuccess, later)
    all {
      assert(later == unmodifiedDeathSavingThrowRoll(2)),
      assert(result.deathSavingThrows == Dying({ successes: 1, failures: 1 })),
    }
  }

  run test_a_successful_death_save_is_not_offered_and_refuses_a_decision = {
    val rerolled = resolveDeathSavingThrowReroll({
      ...failedDeathSave,
      original: unmodifiedDeathSavingThrowRoll(12),
      decision: DeathSavingThrowRerollSelected({ replacementD20: 2 }),
    })
    val declined = resolveDeathSavingThrowReroll({
      ...failedDeathSave,
      original: unmodifiedDeathSavingThrowRoll(12),
    })
    all {
      assert(not(rerolled.offered)),
      assert(rerolled.invalid),
      assert(rerolled.effective == unmodifiedDeathSavingThrowRoll(12)),
      assert(rerolled.usesRemainingAfter == 1),
      assert(declined.invalid),
    }
  }

  run test_a_death_save_reroll_is_refused_without_a_use_left = {
    val result = resolveDeathSavingThrowReroll({
      ...failedDeathSave,
      usesRemaining: 0,
      decision: DeathSavingThrowRerollSelected({ replacementD20: 15 }),
    })
    all {
      assert(not(result.offered)),
      assert(result.invalid),
      assert(result.effective == failedDeathSave.original),
      assert(result.usesRemainingAfter == 0),
    }
  }

  run test_a_new_d20_outside_the_die_is_refused = {
    val result = resolveDeathSavingThrowReroll({
      ...failedDeathSave,
      decision: DeathSavingThrowRerollSelected({ replacementD20: 21 }),
    })
    all {
      assert(not(result.admitted)),
      assert(result.invalid),
      assert(result.usesRemainingAfter == 1),
    }
  }
}
