// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.failed-saving-throw-reroll
// KERNEL-COVERAGE: qnt-owner BATTLE.D20_TEST.FAILED_SAVING_THROW_REROLL

module unitFeatureFailedSavingThrowRerollCore {
  // RAW anchors:
  // - classes.md: Fighter, Level 9: Indomitable. "If you fail a saving throw,
  //   you can reroll it with a bonus equal to your Fighter level. You must use
  //   the new roll, and you can't use this feature again until you finish a
  //   Long Rest." Uses rise at Fighter levels 13 and 17.
  // - playing-the-game.md: Interactions with Rerolls. With Advantage or
  //   Disadvantage, a reroll replaces only one of the two d20s, chosen by
  //   the roller.
  // - ASSUMPTIONS.md A55: a different source may reroll a rerolled die, so
  //   the roll here is the roll as it stands, after any other source's
  //   reroll, and it may be rerolled again after this one.
  //
  // The table rules whether a Saving Throw succeeds, so the roll carries its
  // ruling: the reroll is offered only on a roll that stands failed, and the
  // new roll states the table's ruling with the bonus added. The bonus is the
  // level of the class the feature names.
  //
  // A decision answers an offer, so a decline is invalid too when nothing was
  // offered: on a roll that stands succeeded, or without a use left. The uses
  // are those the roller had when the offer was made; a decline made then
  // still stands after another roll spends the last use.
  import unitFeatureD20TestNaturalOneRerollCore.* from "./unit-feature-d20-test-natural-one-reroll-core"

  // One d20, or both d20s of a roll with Advantage or Disadvantage.
  type FailedSavingThrowRolledD20s =
    | FailedSavingThrowOneD20
    | FailedSavingThrowTwoD20s(D20TestRolledDice)

  type FailedSavingThrowRoll = {
    // The d20 that stands: the roll mode's pick when two d20s were rolled.
    naturalD20: int,
    succeeded: bool,
  }

  type FailedSavingThrowRerollDecision =
    | FailedSavingThrowRerollDeclined
    | FailedSavingThrowRerollSelected({ replacement: FailedSavingThrowRoll })
    | FailedSavingThrowRolledDieRerollSelected({
        die: D20TestRolledDie,
        replacementD20: int,
        succeeded: bool,
      })

  type FailedSavingThrowRerollFacts = {
    hasFeature: bool,
    usesRemaining: int,
    classLevel: int,
    original: FailedSavingThrowRoll,
    rolledD20s: FailedSavingThrowRolledD20s,
    decision: FailedSavingThrowRerollDecision,
  }

  type FailedSavingThrowRerollResult = {
    offered: bool,
    offeredBonus: int,
    admitted: bool,
    invalid: bool,
    effective: FailedSavingThrowRoll,
    usesRemainingAfter: int,
  }

  pure def failedSavingThrowRerollAvailable(
    facts: FailedSavingThrowRerollFacts,
  ): bool =
    facts.hasFeature and facts.usesRemaining > 0

  pure def failedSavingThrowRerollOffered(
    facts: FailedSavingThrowRerollFacts,
  ): bool =
    failedSavingThrowRerollAvailable(facts) and not(facts.original.succeeded)

  pure def failedSavingThrowRerollTaken(
    decision: FailedSavingThrowRerollDecision,
  ): bool =
    match decision {
      | FailedSavingThrowRerollDeclined => false
      | FailedSavingThrowRerollSelected(_) => true
      | FailedSavingThrowRolledDieRerollSelected(_) => true
    }

  pure def failedSavingThrowRerollAdmitted(
    facts: FailedSavingThrowRerollFacts,
  ): bool =
    all {
      failedSavingThrowRerollOffered(facts),
      legalD20(facts.original.naturalD20),
      match facts.decision {
        | FailedSavingThrowRerollDeclined => false
        | FailedSavingThrowRerollSelected(choice) => all {
          facts.rolledD20s == FailedSavingThrowOneD20,
          legalD20(choice.replacement.naturalD20),
        }
        | FailedSavingThrowRolledDieRerollSelected(choice) =>
            match facts.rolledD20s {
              | FailedSavingThrowOneD20 => false
              | FailedSavingThrowTwoD20s(dice) => all {
                legalD20(dice.first),
                legalD20(dice.second),
                selectedNaturalD20ForRollMode(dice) == facts.original.naturalD20,
                legalD20(choice.replacementD20),
              }
            }
      },
    }

  // The new roll is used whether it succeeds or fails.
  pure def failedSavingThrowRerollEffectiveRoll(
    facts: FailedSavingThrowRerollFacts,
  ): FailedSavingThrowRoll =
    match facts.decision {
      | FailedSavingThrowRerollDeclined => facts.original
      | FailedSavingThrowRerollSelected(choice) => choice.replacement
      | FailedSavingThrowRolledDieRerollSelected(choice) =>
          match facts.rolledD20s {
            | FailedSavingThrowOneD20 => facts.original
            | FailedSavingThrowTwoD20s(dice) => {
                naturalD20: selectedNaturalD20ForRollMode(
                  replaceRolledD20(dice, choice.die, choice.replacementD20),
                ),
                succeeded: choice.succeeded,
              }
          }
    }

  pure def resolveFailedSavingThrowReroll(
    facts: FailedSavingThrowRerollFacts,
  ): FailedSavingThrowRerollResult = {
    val admitted = failedSavingThrowRerollAdmitted(facts)
    {
      offered: failedSavingThrowRerollOffered(facts),
      offeredBonus: facts.classLevel,
      admitted: admitted,
      invalid: if (failedSavingThrowRerollTaken(facts.decision))
        not(admitted)
      else not(failedSavingThrowRerollOffered(facts)),
      effective: if (admitted)
        failedSavingThrowRerollEffectiveRoll(facts)
      else facts.original,
      usesRemainingAfter: if (admitted)
        facts.usesRemaining - 1
      else facts.usesRemaining,
    }
  }
}
