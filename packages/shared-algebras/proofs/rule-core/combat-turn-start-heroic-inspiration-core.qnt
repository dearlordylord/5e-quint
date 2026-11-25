// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.COMBAT_TURN_START_HEROIC_INSPIRATION
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.combat-turn-start-heroic-inspiration

module combatTurnStartHeroicInspirationCore {
  // RAW anchors:
  // - classes.md: Champion, Level 10: Heroic Warrior. "During combat, you
  //   can give yourself Heroic Inspiration whenever you start your turn
  //   without it."
  // - rules-glossary.md: Simultaneous Effects. "If two effects occur at the
  //   start of a player character's turn, the player decides which of the
  //   effects happens first."
  // "Can" makes taking it the creature's choice.
  import heroicInspirationRerollCore.* from "./heroic-inspiration-reroll-core"

  type TurnStartHeroicInspirationChoice =
    | GiveHeroicInspiration
    | DeclineHeroicInspiration

  type TurnStartHeroicInspirationFacts = {
    hasFeature: bool,
    inCombat: bool,
    inspirationAtTurnStart: HeroicInspiration,
  }

  pure def turnStartHeroicInspirationOffered(
    facts: TurnStartHeroicInspirationFacts,
  ): bool =
    facts.hasFeature
      and facts.inCombat
      and facts.inspirationAtTurnStart == NoHeroicInspiration

  pure def heroicInspirationAfterTurnStartChoice(
    facts: TurnStartHeroicInspirationFacts,
    choice: TurnStartHeroicInspirationChoice,
  ): HeroicInspiration =
    if (turnStartHeroicInspirationOffered(facts))
      match choice {
        | GiveHeroicInspiration => HeroicInspirationAvailable
        | DeclineHeroicInspiration => facts.inspirationAtTurnStart
      }
    else
      facts.inspirationAtTurnStart
}
