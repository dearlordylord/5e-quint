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

  run test_reroll_must_keep_the_original_modifiers = {
    val result = resolveHeroicInspirationReroll({
      ...inspiredRoll,
      decision: HeroicInspirationRerollSelected({
        replacement: { naturalD20: 3, total: 30 },
      }),
    })
    all {
      assert(not(result.admitted)),
      assert(result.invalid),
      assert(result.effective == inspiredRoll.original),
      assert(result.inspirationAfter == HeroicInspirationAvailable),
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

  // A55: Heroic Inspiration may reroll the die another source just rerolled.
  run test_rerolls_the_roll_another_source_left = {
    val luck = resolveD20TestNaturalOneReroll({
      hasFeature: true,
      original: { naturalD20: 1, total: 6 },
      decision: D20TestNaturalOneRerollSelected({
        replacement: { naturalD20: 3, total: 8 },
      }),
    })
    val inspired = resolveHeroicInspirationReroll({
      ...inspiredRoll,
      original: luck.effective,
      decision: HeroicInspirationRerollSelected({
        replacement: { naturalD20: 17, total: 22 },
      }),
    })
    val changedModifiers = resolveHeroicInspirationReroll({
      ...inspiredRoll,
      original: luck.effective,
      decision: HeroicInspirationRerollSelected({
        replacement: { naturalD20: 17, total: 23 },
      }),
    })
    all {
      assert(luck.admitted),
      assert(inspired.admitted),
      assert(inspired.effective == { naturalD20: 17, total: 22 }),
      assert(inspired.inspirationAfter == NoHeroicInspiration),
      assert(changedModifiers.invalid),
      assert(changedModifiers.effective == luck.effective),
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

  pure val inspiredSave: HeroicInspirationD20RerollFacts = {
    playerCharacter: true,
    inspiration: HeroicInspirationAvailable,
    originalD20: 6,
    rolledD20s: OneD20,
    decision: HeroicInspirationD20RerollDeclined,
  }

  run test_saving_throw_reroll_uses_the_new_d20 = {
    val result = resolveHeroicInspirationD20Reroll({
      ...inspiredSave,
      decision: HeroicInspirationD20RerollSelected({ replacementD20: 18 }),
    })
    all {
      assert(result.admitted),
      assert(not(result.invalid)),
      assert(result.effectiveD20 == 18),
      assert(result.inspirationAfter == NoHeroicInspiration),
    }
  }

  run test_death_saving_throw_reroll_can_roll_a_20 = {
    val result = resolveHeroicInspirationD20Reroll({
      ...inspiredSave,
      decision: HeroicInspirationD20RerollSelected({ replacementD20: 20 }),
    })
    all {
      assert(result.admitted),
      assert(result.effectiveD20 == 20),
      assert(result.inspirationAfter == NoHeroicInspiration),
    }
  }

  run test_saving_throw_decline_keeps_d20_and_heroic_inspiration = {
    val result = resolveHeroicInspirationD20Reroll(inspiredSave)
    all {
      assert(not(result.admitted)),
      assert(not(result.invalid)),
      assert(result.effectiveD20 == 6),
      assert(result.inspirationAfter == HeroicInspirationAvailable),
    }
  }

  run test_saving_throw_reroll_needs_heroic_inspiration_and_a_d20_face = {
    val without = resolveHeroicInspirationD20Reroll({
      ...inspiredSave,
      inspiration: NoHeroicInspiration,
      decision: HeroicInspirationD20RerollSelected({ replacementD20: 18 }),
    })
    val offFace = resolveHeroicInspirationD20Reroll({
      ...inspiredSave,
      decision: HeroicInspirationD20RerollSelected({ replacementD20: 21 }),
    })
    all {
      assert(without.invalid),
      assert(without.effectiveD20 == 6),
      assert(without.inspirationAfter == NoHeroicInspiration),
      assert(offFace.invalid),
      assert(offFace.effectiveD20 == 6),
      assert(offFace.inspirationAfter == HeroicInspirationAvailable),
    }
  }

  // Disadvantage on the save: 6 and 15 stand as a 6. Rerolling the 6 into a
  // 17 leaves 15 and 17, so the 15 stands.
  pure val disadvantagedSave: HeroicInspirationD20RerollFacts = {
    ...inspiredSave,
    rolledD20s: TwoD20s({
      first: 6,
      second: 15,
      rollMode: DisadvantageD20TestRoll,
    }),
  }

  run test_saving_throw_reroll_with_disadvantage_replaces_one_d20 = {
    val result = resolveHeroicInspirationD20Reroll({
      ...disadvantagedSave,
      decision: HeroicInspirationD20RolledDieRerollSelected({
        die: FirstD20,
        replacementD20: 17,
      }),
    })
    all {
      assert(result.admitted),
      assert(result.effectiveD20 == 15),
      assert(result.inspirationAfter == NoHeroicInspiration),
    }
  }

  run test_saving_throw_reroll_with_disadvantage_must_name_its_d20 = {
    val whole = resolveHeroicInspirationD20Reroll({
      ...disadvantagedSave,
      decision: HeroicInspirationD20RerollSelected({ replacementD20: 17 }),
    })
    val single = resolveHeroicInspirationD20Reroll({
      ...inspiredSave,
      decision: HeroicInspirationD20RolledDieRerollSelected({
        die: FirstD20,
        replacementD20: 17,
      }),
    })
    all {
      assert(whole.invalid),
      assert(whole.effectiveD20 == 6),
      assert(whole.inspirationAfter == HeroicInspirationAvailable),
      assert(single.invalid),
      assert(single.effectiveD20 == 6),
    }
  }
}
