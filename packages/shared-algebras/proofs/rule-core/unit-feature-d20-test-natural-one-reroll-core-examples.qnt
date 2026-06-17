// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.d20-test-natural-one-reroll

module unitFeatureD20TestNaturalOneRerollCoreExamples {
  import unitFeatureD20TestNaturalOneRerollCore.* from "./unit-feature-d20-test-natural-one-reroll-core"

  run test_natural_one_d20_test_uses_replacement_roll = {
    val result = resolveD20TestNaturalOneReroll({
      hasFeature: true,
      original: { naturalD20: 1, total: 6 },
      decision: D20TestNaturalOneRerollSelected({
        replacement: { naturalD20: 17, total: 22 },
      }),
    })
    all {
      assert(result.admitted),
      assert(not(result.invalid)),
      assert(result.effective.naturalD20 == 17),
      assert(result.effective.total == 22),
    }
  }

  run test_replacement_natural_one_is_still_used = {
    val result = resolveD20TestNaturalOneReroll({
      hasFeature: true,
      original: { naturalD20: 1, total: 5 },
      decision: D20TestNaturalOneRerollSelected({
        replacement: { naturalD20: 1, total: 4 },
      }),
    })
    all {
      assert(result.admitted),
      assert(not(result.invalid)),
      assert(result.effective.naturalD20 == 1),
      assert(result.effective.total == 4),
    }
  }

  run test_declined_or_non_natural_one_keeps_original_roll = {
    val declined = resolveD20TestNaturalOneReroll({
      hasFeature: true,
      original: { naturalD20: 1, total: 6 },
      decision: D20TestNaturalOneRerollDeclined,
    })
    val notTriggered = resolveD20TestNaturalOneReroll({
      hasFeature: true,
      original: { naturalD20: 2, total: 7 },
      decision: D20TestNaturalOneRerollSelected({
        replacement: { naturalD20: 19, total: 24 },
      }),
    })
    all {
      assert(not(declined.admitted)),
      assert(not(declined.invalid)),
      assert(declined.effective.naturalD20 == 1),
      assert(declined.effective.total == 6),
      assert(not(notTriggered.admitted)),
      assert(notTriggered.invalid),
      assert(notTriggered.effective.naturalD20 == 2),
      assert(notTriggered.effective.total == 7),
    }
  }
}
