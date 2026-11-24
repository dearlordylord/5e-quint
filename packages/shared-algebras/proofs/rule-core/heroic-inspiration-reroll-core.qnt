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
  // - ASSUMPTIONS.md A55: a different source may reroll a rerolled die, so
  //   `original` is the roll as it stands, after any other source's reroll.
  // - "any die": the reroll applies to every D20 Test, not only to Attack
  //   Rolls. A roll with a total (an Attack Roll or an Ability Check) keeps
  //   its modifiers below; a Saving Throw whose success the table rules, and
  //   a Death Saving Throw, reroll the bare d20 (resolveHeroicInspirationD20Reroll).
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
      legalD20TestRoll(facts.original),
      match facts.decision {
        | HeroicInspirationRerollDeclined => false
        | HeroicInspirationRerollSelected(choice) => all {
          facts.rolledD20s == OneD20,
          legalD20TestRoll(choice.replacement),
          rerollKeepsModifiers(facts.original, choice.replacement),
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

  // A Saving Throw whose success the table rules on the roll that stands, or
  // a Death Saving Throw: the reroll replaces the d20, and the new d20 is used.
  // With Advantage or Disadvantage the reroll replaces one of the two d20s,
  // and the roll mode picks the d20 that stands from the pair.
  //
  // A decline is never invalid here: it changes nothing. Battle also refuses
  // a decline that no offer asked for, a check on the fill protocol rather
  // than on the rule.
  type HeroicInspirationD20RerollDecision =
    | HeroicInspirationD20RerollDeclined
    | HeroicInspirationD20RerollSelected({ replacementD20: int })
    | HeroicInspirationD20RolledDieRerollSelected({
        die: D20TestRolledDie,
        replacementD20: int,
      })

  type HeroicInspirationD20RerollFacts = {
    playerCharacter: bool,
    inspiration: HeroicInspiration,
    // The d20 that stands: the roll mode's pick when two d20s were rolled.
    originalD20: int,
    rolledD20s: D20TestRolledD20s,
    decision: HeroicInspirationD20RerollDecision,
  }

  type HeroicInspirationD20RerollResult = {
    admitted: bool,
    invalid: bool,
    effectiveD20: int,
    inspirationAfter: HeroicInspiration,
  }

  pure def heroicInspirationD20RerollAdmitted(
    facts: HeroicInspirationD20RerollFacts,
  ): bool =
    all {
      facts.playerCharacter,
      facts.inspiration == HeroicInspirationAvailable,
      legalD20(facts.originalD20),
      match facts.decision {
        | HeroicInspirationD20RerollDeclined => false
        | HeroicInspirationD20RerollSelected(choice) => all {
          facts.rolledD20s == OneD20,
          legalD20(choice.replacementD20),
        }
        | HeroicInspirationD20RolledDieRerollSelected(choice) =>
            match facts.rolledD20s {
              | OneD20 => false
              | TwoD20s(dice) => all {
                legalD20(dice.first),
                legalD20(dice.second),
                selectedNaturalD20ForRollMode(dice) == facts.originalD20,
                legalD20(choice.replacementD20),
              }
            }
      },
    }

  pure def heroicInspirationD20RerollEffectiveD20(
    facts: HeroicInspirationD20RerollFacts,
  ): int =
    match facts.decision {
      | HeroicInspirationD20RerollDeclined => facts.originalD20
      | HeroicInspirationD20RerollSelected(choice) => choice.replacementD20
      | HeroicInspirationD20RolledDieRerollSelected(choice) =>
          match facts.rolledD20s {
            | OneD20 => facts.originalD20
            | TwoD20s(dice) =>
                selectedNaturalD20ForRollMode(
                  replaceRolledD20(dice, choice.die, choice.replacementD20),
                )
          }
    }

  pure def resolveHeroicInspirationD20Reroll(
    facts: HeroicInspirationD20RerollFacts,
  ): HeroicInspirationD20RerollResult = {
    val taken = match facts.decision {
      | HeroicInspirationD20RerollDeclined => false
      | HeroicInspirationD20RerollSelected(_) => true
      | HeroicInspirationD20RolledDieRerollSelected(_) => true
    }
    val admitted = heroicInspirationD20RerollAdmitted(facts)
    {
      admitted: admitted,
      invalid: taken and not(admitted),
      effectiveD20: if (admitted)
        heroicInspirationD20RerollEffectiveD20(facts)
      else facts.originalD20,
      inspirationAfter: if (admitted)
        NoHeroicInspiration
      else facts.inspiration,
    }
  }
}
