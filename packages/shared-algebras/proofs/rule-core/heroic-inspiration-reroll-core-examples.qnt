// -*- mode: Bluespec; -*-

module heroicInspirationRerollCoreExamples {
  import unitFeatureD20TestNaturalOneRerollCore.* from "./unit-feature-d20-test-natural-one-reroll-core"
  import heroicInspirationRerollCore.* from "./heroic-inspiration-reroll-core"

  pure val inspiredRoll: HeroicInspirationRerollFacts = {
    playerCharacter: true,
    inspiration: HeroicInspirationAvailable,
    original: { naturalD20: 4, total: 9 },
    rolledD20s: OneD20,
    decision: HeroicInspirationRerollDeclined,
    otherRerollTaken: false,
  }

  run test_reroll_uses_new_roll_and_spends_heroic_inspiration = {
    val result = resolveHeroicInspirationReroll({
      ...inspiredRoll,
      decision: HeroicInspirationRerollSelected({
        replacement: { naturalD20: 17, total: 22 },
      }),
    })
    all {
      assert(result.admitted),
      assert(not(result.invalid)),
      assert(result.effective == { naturalD20: 17, total: 22 }),
      assert(result.inspirationAfter == NoHeroicInspiration),
    }
  }

  run test_lower_new_roll_must_still_be_used = {
    val result = resolveHeroicInspirationReroll({
      ...inspiredRoll,
      original: { naturalD20: 15, total: 20 },
      decision: HeroicInspirationRerollSelected({
        replacement: { naturalD20: 2, total: 7 },
      }),
    })
    all {
      assert(result.admitted),
      assert(result.effective == { naturalD20: 2, total: 7 }),
      assert(result.inspirationAfter == NoHeroicInspiration),
    }
  }

  run test_decline_keeps_roll_and_heroic_inspiration = {
    val result = resolveHeroicInspirationReroll(inspiredRoll)
    all {
      assert(not(result.admitted)),
      assert(not(result.invalid)),
      assert(result.effective == inspiredRoll.original),
      assert(result.inspirationAfter == HeroicInspirationAvailable),
    }
  }

  run test_reroll_needs_a_player_character_with_heroic_inspiration = {
    val reroll = HeroicInspirationRerollSelected({
      replacement: { naturalD20: 17, total: 22 },
    })
    val without = resolveHeroicInspirationReroll({
      ...inspiredRoll,
      inspiration: NoHeroicInspiration,
      decision: reroll,
    })
    val monster = resolveHeroicInspirationReroll({
      ...inspiredRoll,
      playerCharacter: false,
      decision: reroll,
    })
    all {
      assert(without.invalid),
      assert(without.effective == inspiredRoll.original),
      assert(without.inspirationAfter == NoHeroicInspiration),
      assert(monster.invalid),
      assert(monster.effective == inspiredRoll.original),
    }
  }

  run test_one_reroll_per_roll = {
    val result = resolveHeroicInspirationReroll({
      ...inspiredRoll,
      otherRerollTaken: true,
      decision: HeroicInspirationRerollSelected({
        replacement: { naturalD20: 17, total: 22 },
      }),
    })
    val declined = resolveHeroicInspirationReroll({
      ...inspiredRoll,
      otherRerollTaken: true,
    })
    all {
      assert(result.invalid),
      assert(result.effective == inspiredRoll.original),
      assert(result.inspirationAfter == HeroicInspirationAvailable),
      assert(not(declined.invalid)),
    }
  }

  run test_advantage_replaces_one_chosen_die_of_any_face = {
    val advantage = {
      ...inspiredRoll,
      original: { naturalD20: 4, total: 9 },
      rolledD20s: TwoD20s({
        first: 2,
        second: 4,
        rollMode: AdvantageD20TestRoll,
      }),
    }
    val replacedLow = resolveHeroicInspirationReroll({
      ...advantage,
      decision: HeroicInspirationRolledDieRerollSelected({
        die: FirstD20,
        replacement: 18,
      }),
    })
    val replacedHigh = resolveHeroicInspirationReroll({
      ...advantage,
      decision: HeroicInspirationRolledDieRerollSelected({
        die: SecondD20,
        replacement: 1,
      }),
    })
    val wholeRoll = resolveHeroicInspirationReroll({
      ...advantage,
      decision: HeroicInspirationRerollSelected({
        replacement: { naturalD20: 18, total: 23 },
      }),
    })
    all {
      assert(replacedLow.admitted),
      assert(replacedLow.effective == { naturalD20: 18, total: 23 }),
      assert(replacedHigh.admitted),
      assert(replacedHigh.effective == { naturalD20: 2, total: 7 }),
      assert(wholeRoll.invalid),
      assert(wholeRoll.effective == advantage.original),
    }
  }

  run test_disadvantage_keeps_the_lower_die_after_replacement = {
    val result = resolveHeroicInspirationReroll({
      ...inspiredRoll,
      original: { naturalD20: 3, total: 8 },
      rolledD20s: TwoD20s({
        first: 3,
        second: 12,
        rollMode: DisadvantageD20TestRoll,
      }),
      decision: HeroicInspirationRolledDieRerollSelected({
        die: FirstD20,
        replacement: 19,
      }),
    })
    all {
      assert(result.admitted),
      assert(result.effective == { naturalD20: 12, total: 17 }),
      assert(result.inspirationAfter == NoHeroicInspiration),
    }
  }
}
