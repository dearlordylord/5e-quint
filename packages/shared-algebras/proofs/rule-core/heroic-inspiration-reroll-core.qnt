// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL

module heroicInspirationRerollCore {
  // RAW anchors:
  // - rules-glossary.md: Heroic Inspiration. "If you (a player character)
  //   have Heroic Inspiration, you can expend it to reroll any die
  //   immediately after rolling it, and you must use the new roll."
  // - playing-the-game.md: Interactions with Rerolls. With Advantage or
  //   Disadvantage, a reroll replaces only one of the two d20s, chosen by
  //   the roller.
  // - ASSUMPTIONS.md: one reroll per D20 Test roll, whatever its sources.
  import unitFeatureD20TestNaturalOneRerollCore.* from "./unit-feature-d20-test-natural-one-reroll-core"

  type HeroicInspiration = HeroicInspirationAvailable | NoHeroicInspiration

  type HeroicInspirationRerollDecision =
    | HeroicInspirationRerollDeclined
    | HeroicInspirationRerollSelected({ replacement: D20TestRoll })
    | HeroicInspirationRolledDieRerollSelected({
        die: D20TestRolledDie,
        replacement: int,
      })

  // One d20, or both d20s of a roll with Advantage or Disadvantage.
  type D20TestRolledD20s = OneD20 | TwoD20s(D20TestRolledDice)

  type HeroicInspirationRerollFacts = {
    playerCharacter: bool,
    inspiration: HeroicInspiration,
    original: D20TestRoll,
    rolledD20s: D20TestRolledD20s,
    decision: HeroicInspirationRerollDecision,
    // Another source (the natural-1 reroll, a Spell Attack reroll) takes the
    // reroll of this same roll.
    otherRerollTaken: bool,
  }

  type HeroicInspirationRerollResult = {
    admitted: bool,
    invalid: bool,
    effective: D20TestRoll,
    inspirationAfter: HeroicInspiration,
  }

  pure def heroicInspirationRerollAvailable(
    facts: HeroicInspirationRerollFacts,
  ): bool =
    facts.playerCharacter and facts.inspiration == HeroicInspirationAvailable

  pure def heroicInspirationRerollTaken(
    decision: HeroicInspirationRerollDecision,
  ): bool =
    match decision {
      | HeroicInspirationRerollDeclined => false
      | HeroicInspirationRerollSelected(_) => true
      | HeroicInspirationRolledDieRerollSelected(_) => true
    }

  pure def heroicInspirationRerollAdmitted(
    facts: HeroicInspirationRerollFacts,
  ): bool =
    all {
      heroicInspirationRerollAvailable(facts),
      not(facts.otherRerollTaken),
      legalD20TestRoll(facts.original),
      match facts.decision {
        | HeroicInspirationRerollDeclined => false
        | HeroicInspirationRerollSelected(choice) => all {
          facts.rolledD20s == OneD20,
          legalD20TestRoll(choice.replacement),
        }
        | HeroicInspirationRolledDieRerollSelected(choice) =>
            match facts.rolledD20s {
              | OneD20 => false
              | TwoD20s(dice) => all {
                legalD20TestRolledDice(facts.original, dice),
                legalD20(choice.replacement),
              }
            }
      },
    }

  pure def heroicInspirationRerollEffectiveRoll(
    facts: HeroicInspirationRerollFacts,
  ): D20TestRoll =
    match facts.decision {
      | HeroicInspirationRerollDeclined => facts.original
      | HeroicInspirationRerollSelected(choice) => choice.replacement
      | HeroicInspirationRolledDieRerollSelected(choice) =>
          match facts.rolledD20s {
            | OneD20 => facts.original
            | TwoD20s(dice) =>
                projectedRollAfterRolledDieReroll(
                  facts.original,
                  dice,
                  choice.die,
                  choice.replacement,
                )
          }
    }

  pure def resolveHeroicInspirationReroll(
    facts: HeroicInspirationRerollFacts,
  ): HeroicInspirationRerollResult = {
    val admitted = heroicInspirationRerollAdmitted(facts)
    {
      admitted: admitted,
      invalid: heroicInspirationRerollTaken(facts.decision) and not(admitted),
      effective: if (admitted)
        heroicInspirationRerollEffectiveRoll(facts)
      else facts.original,
      inspirationAfter: if (admitted)
        NoHeroicInspiration
      else facts.inspiration,
    }
  }
}
