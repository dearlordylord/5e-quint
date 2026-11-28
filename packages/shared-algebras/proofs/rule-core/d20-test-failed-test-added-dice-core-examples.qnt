// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.bardic-inspiration-failed-d20-test unit-feature.failed-ability-check-resource-boost

module d20TestFailedTestAddedDiceCoreExamples {
  import d20TestFailedTestAddedDiceCore.* from "./d20-test-failed-test-added-dice-core"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"

  // A Fighter's Stealth check of 13 against DC 15, holding a d8 Bardic
  // Inspiration die and with one use of Second Wind left.
  pure val failedCheck: AddedDiceFacts = {
    test: AbilityCheckTest({ total: 13, dc: 15 }),
    bardicInspirationDieSize: 8,
    resourceBoostDieSize: 10,
    resourceBoostUsesRemaining: 1,
    decisions: [],
  }

  // A failed saving throw by a creature holding a d6 Bardic Inspiration die.
  pure val failedSave: AddedDiceFacts = {
    test: RuledSavingThrow({ succeeded: false }),
    bardicInspirationDieSize: 6,
    resourceBoostDieSize: 10,
    resourceBoostUsesRemaining: 1,
    decisions: [],
  }

  pure def rolled(source: AddedDieSource, dieRoll: int): AddedDieDecision =
    { source: source, choice: AddedDieRolled({ dieRoll: dieRoll, ruledSucceeded: false }) }

  pure def declined(source: AddedDieSource): AddedDieDecision =
    { source: source, choice: AddedDieDeclined }

  run test_failed_check_offers_both_dice = {
    val result = resolveAddedDice(failedCheck)
    all {
      assert(not(result.invalid)),
      assert(result.bardicInspirationOffered),
      assert(result.resourceBoostOffered),
      assert(not(result.succeeded)),
    }
  }

  run test_boost_that_turns_the_check_spends_its_use = {
    val result = resolveAddedDice({
      ...failedCheck,
      decisions: [rolled(FailedAbilityCheckResourceBoost, 3)],
    })
    all {
      assert(not(result.invalid)),
      assert(result.succeeded),
      assert(result.test == AbilityCheckTest({ total: 16, dc: 15 })),
      assert(result.resourceBoostUsesRemainingAfter == 0),
      assert(not(result.bardicInspirationOffered)),
    }
  }

  run test_boost_on_a_check_that_still_fails_keeps_its_use = {
    val result = resolveAddedDice({
      ...failedCheck,
      bardicInspirationDieSize: 0,
      decisions: [rolled(FailedAbilityCheckResourceBoost, 1)],
    })
    all {
      assert(not(result.invalid)),
      assert(not(result.succeeded)),
      assert(result.test == AbilityCheckTest({ total: 14, dc: 15 })),
      assert(result.resourceBoostUsesRemainingAfter == 1),
    }
  }

  run test_bardic_die_after_a_boost_that_fell_short_spends_both = {
    val result = resolveAddedDice({
      ...failedCheck,
      decisions: [
        rolled(FailedAbilityCheckResourceBoost, 1),
        rolled(BardicInspirationDie, 2),
      ],
    })
    all {
      assert(not(result.invalid)),
      assert(result.succeeded),
      assert(result.bardicInspirationDieExpended),
      assert(result.resourceBoostUsesRemainingAfter == 0),
    }
  }

  run test_boost_after_a_bardic_die_that_fell_short_spends_both = {
    val result = resolveAddedDice({
      ...failedCheck,
      decisions: [
        rolled(BardicInspirationDie, 1),
        rolled(FailedAbilityCheckResourceBoost, 1),
      ],
    })
    all {
      assert(not(result.invalid)),
      assert(result.succeeded),
      assert(result.bardicInspirationDieExpended),
      assert(result.resourceBoostUsesRemainingAfter == 0),
    }
  }

  run test_bardic_die_is_expended_even_when_the_check_still_fails = {
    val result = resolveAddedDice({
      ...failedCheck,
      resourceBoostUsesRemaining: 0,
      decisions: [rolled(BardicInspirationDie, 1)],
    })
    all {
      assert(not(result.invalid)),
      assert(not(result.succeeded)),
      assert(result.bardicInspirationDieExpended),
      assert(not(result.bardicInspirationOffered)),
    }
  }

  run test_decline_is_asked_again_after_another_die = {
    val result = resolveAddedDice({
      ...failedCheck,
      decisions: [
        declined(BardicInspirationDie),
        rolled(FailedAbilityCheckResourceBoost, 1),
      ],
    })
    all {
      assert(not(result.invalid)),
      assert(result.bardicInspirationOffered),
      assert(not(result.resourceBoostOffered)),
    }
  }

  run test_no_die_is_offered_on_a_check_that_succeeds = {
    val result = resolveAddedDice({
      ...failedCheck,
      test: AbilityCheckTest({ total: 15, dc: 15 }),
    })
    all {
      assert(not(result.bardicInspirationOffered)),
      assert(not(result.resourceBoostOffered)),
      assert(result.succeeded),
    }
  }

  run test_any_decision_on_a_check_that_succeeds_is_invalid = {
    val result = resolveAddedDice({
      ...failedCheck,
      test: AbilityCheckTest({ total: 15, dc: 15 }),
      decisions: [declined(BardicInspirationDie)],
    })
    assert(result.invalid)
  }

  run test_a_die_after_the_check_succeeded_is_invalid = {
    val result = resolveAddedDice({
      ...failedCheck,
      decisions: [
        rolled(FailedAbilityCheckResourceBoost, 5),
        rolled(BardicInspirationDie, 1),
      ],
    })
    all {
      assert(result.invalid),
      assert(not(result.bardicInspirationDieExpended)),
      assert(result.resourceBoostUsesRemainingAfter == 1),
    }
  }

  run test_boost_without_a_use_is_not_offered_and_is_invalid = {
    val noUse = { ...failedCheck, resourceBoostUsesRemaining: 0 }
    all {
      assert(not(resolveAddedDice(noUse).resourceBoostOffered)),
      assert(resolveAddedDice({
        ...noUse,
        decisions: [rolled(FailedAbilityCheckResourceBoost, 3)],
      }).invalid),
    }
  }

  run test_roll_outside_the_die_is_invalid = {
    val result = resolveAddedDice({
      ...failedCheck,
      decisions: [rolled(BardicInspirationDie, 9)],
    })
    assert(result.invalid)
  }

  run test_source_cannot_add_its_die_twice = {
    val result = resolveAddedDice({
      ...failedCheck,
      decisions: [
        rolled(BardicInspirationDie, 1),
        rolled(BardicInspirationDie, 1),
      ],
    })
    assert(result.invalid)
  }

  run test_save_takes_the_table_ruling_with_the_bardic_die = {
    val result = resolveAddedDice({
      ...failedSave,
      decisions: [{
        source: BardicInspirationDie,
        choice: AddedDieRolled({ dieRoll: 4, ruledSucceeded: true }),
      }],
    })
    all {
      assert(not(result.invalid)),
      assert(result.succeeded),
      assert(result.bardicInspirationDieExpended),
    }
  }

  run test_save_is_not_offered_the_resource_boost = {
    val result = resolveAddedDice(failedSave)
    all {
      assert(result.bardicInspirationOffered),
      assert(not(result.resourceBoostOffered)),
      assert(resolveAddedDice({
        ...failedSave,
        decisions: [rolled(FailedAbilityCheckResourceBoost, 3)],
      }).invalid),
    }
  }

  run test_without_a_bardic_die_nothing_is_offered_on_a_save = {
    val result = resolveAddedDice({ ...failedSave, bardicInspirationDieSize: 0 })
    all {
      assert(not(result.bardicInspirationOffered)),
      assert(resolveAddedDice({
        ...failedSave,
        bardicInspirationDieSize: 0,
        decisions: [declined(BardicInspirationDie)],
      }).invalid),
    }
  }

  // A failed Death Saving Throw of 6 by a creature holding a d6 Bardic
  // Inspiration die.
  pure val failedDeathSave: AddedDiceFacts = {
    ...failedSave,
    test: RolledDeathSavingThrow(unmodifiedDeathSavingThrowRoll(6)),
  }

  run test_failed_death_save_offers_only_the_bardic_die = {
    val result = resolveAddedDice(failedDeathSave)
    all {
      assert(result.bardicInspirationOffered),
      assert(not(result.resourceBoostOffered)),
      assert(not(result.succeeded)),
    }
  }

  run test_the_die_counts_toward_10_on_a_death_save = {
    val result = resolveAddedDice({
      ...failedDeathSave,
      decisions: [rolled(BardicInspirationDie, 4)],
    })
    all {
      assert(not(result.invalid)),
      assert(result.succeeded),
      assert(result.test == RolledDeathSavingThrow({ naturalD20: 6, bonus: 4 })),
      assert(result.bardicInspirationDieExpended),
    }
  }

  run test_a_die_short_of_10_leaves_the_death_save_failed = {
    val result = resolveAddedDice({
      ...failedDeathSave,
      decisions: [rolled(BardicInspirationDie, 3)],
    })
    all {
      assert(not(result.invalid)),
      assert(not(result.succeeded)),
      assert(result.bardicInspirationDieExpended),
    }
  }

  run test_a_1_on_the_d20_still_fails_whatever_the_die_adds = {
    val result = resolveAddedDice({
      ...failedDeathSave,
      test: RolledDeathSavingThrow(unmodifiedDeathSavingThrowRoll(1)),
      decisions: [rolled(BardicInspirationDie, 6)],
    })
    all {
      assert(not(result.invalid)),
      assert(not(result.succeeded)),
      assert(result.bardicInspirationDieExpended),
    }
  }

  run test_a_successful_death_save_refuses_the_die = {
    val result = resolveAddedDice({
      ...failedDeathSave,
      test: RolledDeathSavingThrow(unmodifiedDeathSavingThrowRoll(12)),
      decisions: [declined(BardicInspirationDie)],
    })
    all {
      assert(result.invalid),
      assert(not(result.bardicInspirationOffered)),
      assert(not(result.bardicInspirationDieExpended)),
    }
  }

  run test_the_resource_boost_is_refused_on_a_death_save = {
    val result = resolveAddedDice({
      ...failedDeathSave,
      decisions: [rolled(FailedAbilityCheckResourceBoost, 5)],
    })
    assert(result.invalid)
  }

  // An attack roll of 14 (a 10 on the d20) against Armor Class 15, by an
  // attacker holding a d6 Bardic Inspiration die.
  pure def missedAttack(naturalD20: int, total: int): AddedDiceFacts = {
    ...failedSave,
    test: RolledAttackRoll({
      naturalD20: naturalD20,
      total: total,
      armorClass: 15,
      criticalThreshold: 20,
    }),
  }

  run test_a_missed_attack_roll_offers_only_the_bardic_die = {
    val result = resolveAddedDice(missedAttack(10, 14))
    all {
      assert(result.bardicInspirationOffered),
      assert(not(result.resourceBoostOffered)),
      assert(not(result.succeeded)),
    }
  }

  run test_the_die_can_turn_the_miss_into_a_hit = {
    val result = resolveAddedDice({
      ...missedAttack(10, 14),
      decisions: [rolled(BardicInspirationDie, 2)],
    })
    all {
      assert(not(result.invalid)),
      assert(result.succeeded),
      assert(result.test == missedAttack(10, 16).test),
      assert(result.bardicInspirationDieExpended),
    }
  }

  run test_a_die_that_falls_short_is_expended_and_the_attack_misses = {
    val result = resolveAddedDice({
      ...missedAttack(6, 10),
      decisions: [rolled(BardicInspirationDie, 3)],
    })
    all {
      assert(not(result.invalid)),
      assert(not(result.succeeded)),
      assert(result.bardicInspirationDieExpended),
    }
  }

  run test_a_1_on_the_d20_still_misses_whatever_the_die_adds = {
    val result = resolveAddedDice({
      ...missedAttack(1, 15),
      decisions: [rolled(BardicInspirationDie, 6)],
    })
    all {
      assert(not(result.invalid)),
      assert(not(result.succeeded)),
      assert(result.bardicInspirationDieExpended),
    }
  }

  run test_the_die_does_not_make_a_critical_hit = {
    val result = resolveAddedDice({
      ...missedAttack(13, 14),
      decisions: [rolled(BardicInspirationDie, 6)],
    })
    match result.test {
      | RolledAttackRoll(roll) => all {
          assert(result.succeeded),
          assert(not(attackRollOutcomeIsCriticalHit(resolveAttackRoll(roll)))),
        }
      | _ => assert(false)
    }
  }

  run test_a_hit_refuses_the_die = {
    val result = resolveAddedDice({
      ...missedAttack(15, 20),
      decisions: [declined(BardicInspirationDie)],
    })
    all {
      assert(result.invalid),
      assert(not(result.bardicInspirationOffered)),
      assert(not(result.bardicInspirationDieExpended)),
    }
  }

  run test_the_resource_boost_is_refused_on_an_attack_roll = {
    val result = resolveAddedDice({
      ...missedAttack(10, 14),
      decisions: [rolled(FailedAbilityCheckResourceBoost, 5)],
    })
    assert(result.invalid)
  }
}
