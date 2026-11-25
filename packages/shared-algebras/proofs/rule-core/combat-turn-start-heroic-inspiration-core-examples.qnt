// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.combat-turn-start-heroic-inspiration

module combatTurnStartHeroicInspirationCoreExamples {
  import heroicInspirationRerollCore.* from "./heroic-inspiration-reroll-core"
  import combatTurnStartHeroicInspirationCore.* from "./combat-turn-start-heroic-inspiration-core"

  pure val startsTurnWithout: TurnStartHeroicInspirationFacts = {
    hasFeature: true,
    inCombat: true,
    inspirationAtTurnStart: NoHeroicInspiration,
  }

  run test_offered_when_the_turn_starts_without_it = {
    assert(turnStartHeroicInspirationOffered(startsTurnWithout))
  }

  run test_giving_it_sets_heroic_inspiration = {
    assert(
      heroicInspirationAfterTurnStartChoice(
        startsTurnWithout,
        GiveHeroicInspiration,
      ) == HeroicInspirationAvailable
    )
  }

  run test_declining_leaves_the_creature_without_it = {
    assert(
      heroicInspirationAfterTurnStartChoice(
        startsTurnWithout,
        DeclineHeroicInspiration,
      ) == NoHeroicInspiration
    )
  }

  run test_not_offered_when_the_turn_starts_with_it = {
    val withIt = {
      ...startsTurnWithout,
      inspirationAtTurnStart: HeroicInspirationAvailable,
    }
    all {
      assert(not(turnStartHeroicInspirationOffered(withIt))),
      assert(
        heroicInspirationAfterTurnStartChoice(withIt, GiveHeroicInspiration)
          == HeroicInspirationAvailable
      ),
    }
  }

  run test_not_offered_without_the_feature = {
    val withoutFeature = { ...startsTurnWithout, hasFeature: false }
    all {
      assert(not(turnStartHeroicInspirationOffered(withoutFeature))),
      assert(
        heroicInspirationAfterTurnStartChoice(
          withoutFeature,
          GiveHeroicInspiration,
        ) == NoHeroicInspiration
      ),
    }
  }

  run test_not_offered_outside_combat = {
    val outsideCombat = { ...startsTurnWithout, inCombat: false }
    assert(not(turnStartHeroicInspirationOffered(outsideCombat)))
  }
}
