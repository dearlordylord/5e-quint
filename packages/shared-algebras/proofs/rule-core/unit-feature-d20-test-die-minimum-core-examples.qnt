// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.d20-test-die-minimum

module unitFeatureD20TestDieMinimumCoreExamples {
  import unitFeatureD20TestNaturalOneRerollCore.* from "./unit-feature-d20-test-natural-one-reroll-core"
  import unitFeatureD20TestDieMinimumCore.* from "./unit-feature-d20-test-die-minimum-core"

  pure val minimumTen = {
    scope: AbilityCheckUsingOwnProficiency,
    minimumDieFace: 10,
  }

  pure val proficientCheck = {
    kind: AbilityCheckKind,
    usesOwnProficiency: true,
  }

  run test_used_minimum_counts_a_low_d20_as_ten = {
    val resolution = resolveD20TestDieMinimum({
      features: [minimumTen],
      test: proficientCheck,
      decision: D20TestDieMinimumUsed,
    })
    all {
      assert(not(resolution.invalid)),
      assert(resolution.offeredMinimum == 10),
      assert(resolution.countedMinimum == 10),
      assert(countedD20(3, resolution.countedMinimum) == 10),
      assert(countedD20(9, resolution.countedMinimum) == 10),
      assert(countedD20(10, resolution.countedMinimum) == 10),
      assert(countedD20(17, resolution.countedMinimum) == 17),
    }
  }

  run test_declined_minimum_counts_the_natural_d20 = {
    val resolution = resolveD20TestDieMinimum({
      features: [minimumTen],
      test: proficientCheck,
      decision: D20TestDieMinimumDeclined,
    })
    all {
      assert(not(resolution.invalid)),
      assert(resolution.countedMinimum == 0),
      assert(countedD20(3, resolution.countedMinimum) == 3),
    }
  }

  run test_minimum_is_offered_only_on_proficient_ability_checks = {
    val unproficient = resolveD20TestDieMinimum({
      features: [minimumTen],
      test: { kind: AbilityCheckKind, usesOwnProficiency: false },
      decision: D20TestDieMinimumNotDecided,
    })
    val attack = resolveD20TestDieMinimum({
      features: [minimumTen],
      test: { kind: AttackRollKind, usesOwnProficiency: true },
      decision: D20TestDieMinimumNotDecided,
    })
    val save = resolveD20TestDieMinimum({
      features: [minimumTen],
      test: { kind: SavingThrowKind, usesOwnProficiency: true },
      decision: D20TestDieMinimumNotDecided,
    })
    val withoutFeature = resolveD20TestDieMinimum({
      features: [],
      test: proficientCheck,
      decision: D20TestDieMinimumNotDecided,
    })
    all {
      assert(unproficient.offeredMinimum == 0 and not(unproficient.invalid)),
      assert(attack.offeredMinimum == 0 and not(attack.invalid)),
      assert(save.offeredMinimum == 0 and not(save.invalid)),
      assert(withoutFeature.offeredMinimum == 0 and not(withoutFeature.invalid)),
    }
  }

  run test_decision_is_required_exactly_when_offered = {
    val missing = resolveD20TestDieMinimum({
      features: [minimumTen],
      test: proficientCheck,
      decision: D20TestDieMinimumNotDecided,
    })
    val unoffered = resolveD20TestDieMinimum({
      features: [minimumTen],
      test: { kind: AbilityCheckKind, usesOwnProficiency: false },
      decision: D20TestDieMinimumUsed,
    })
    all {
      assert(missing.invalid),
      assert(unoffered.invalid),
      assert(unoffered.countedMinimum == 0),
    }
  }

  run test_reroll_keeps_modifiers_under_the_minimum = {
    // Natural 1 counted as 10 with +7 is 17; the reroll's natural 15 is 22.
    all {
      assert(rerollKeepsModifiersUnderMinimum(
        { naturalD20: 1, total: 17 },
        { naturalD20: 15, total: 22 },
        10,
      )),
      // A total that ignores the minimum does not keep the modifiers.
      assert(not(rerollKeepsModifiersUnderMinimum(
        { naturalD20: 1, total: 8 },
        { naturalD20: 15, total: 22 },
        10,
      ))),
      // Without a minimum, the natural faces count.
      assert(rerollKeepsModifiersUnderMinimum(
        { naturalD20: 1, total: 8 },
        { naturalD20: 15, total: 22 },
        0,
      )),
    }
  }

  run test_minimum_applies_to_the_selected_d20_under_advantage_or_disadvantage = {
    all {
      assert(minimumCommutesWithSelection(
        { first: 4, second: 7, rollMode: AdvantageD20TestRoll },
        10,
      )),
      assert(minimumCommutesWithSelection(
        { first: 4, second: 17, rollMode: DisadvantageD20TestRoll },
        10,
      )),
      assert(countedD20(
        selectedNaturalD20ForRollMode({
          first: 4,
          second: 17,
          rollMode: DisadvantageD20TestRoll,
        }),
        10,
      ) == 10),
    }
  }

  run test_the_highest_offered_minimum_counts = {
    all {
      assert(offeredDieMinimum(
        [{ scope: AbilityCheckUsingOwnProficiency, minimumDieFace: 8 }, minimumTen],
        proficientCheck,
      ) == 10),
    }
  }
}
