// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES
module battleRuntimeAbilityCheckSearch {
  // RAW trace:
  // - .references/srd-5.2.1/Playing-the-Game.md#Ability Checks:
  //   an Ability Check compares the total to a Difficulty Class.
  // - .references/srd-5.2.1/Rules-Glossary.md#Search [Action]:
  //   Search is a Wisdom check to discern something that is not obvious.
  // - .references/srd-5.2.1/Rules-Glossary.md#Hide [Action]:
  //   a hidden creature notes its Hide total as the DC for a Wisdom
  //   (Perception) check to find it.
  // UBIQUITOUS_LANGUAGE.md: Ability Check, Skill, Action, Search.
  type AbilityCheckFacts = {
    total: int,
    dc: int,
  }

  type SearchHiddenTargetFacts = {
    total: int,
    dc: int,
  }

  type SearchHiddenTargetOutcome = SearchHiddenTargetFound | SearchHiddenTargetStillHidden

  pure def abilityCheckSucceeds(facts: AbilityCheckFacts): bool =
    facts.total >= facts.dc

  pure def resolveSearchHiddenTarget(facts: SearchHiddenTargetFacts): SearchHiddenTargetOutcome = {
    if (abilityCheckSucceeds({ total: facts.total, dc: facts.dc }))
      SearchHiddenTargetFound
    else
      SearchHiddenTargetStillHidden
  }

  pure def searchHiddenTargetStillHidden(outcome: SearchHiddenTargetOutcome): bool =
    match outcome {
      | SearchHiddenTargetFound => false
      | SearchHiddenTargetStillHidden => true
    }
}
