// -*- mode: Bluespec; -*-

module unitFeatureFailedSavingThrowRerollCoreExamples {
  import unitFeatureD20TestNaturalOneRerollCore.* from "./unit-feature-d20-test-natural-one-reroll-core"
  import unitFeatureFailedSavingThrowRerollCore.* from "./unit-feature-failed-saving-throw-reroll-core"

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
}
