// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.d20-test-natural-one-reroll
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureD20TestNaturalOneRerollCore {
  // RAW anchors:
  // - Character-Origins.md: Halfling Luck.
  // - UBIQUITOUS_LANGUAGE.md: D20 Test, Attack Roll, Ability Check, and
  //   Saving Throw.

  type D20TestRoll = {
    naturalD20: int,
    total: int,
  }

  type D20TestNaturalOneRerollDecision =
    | D20TestNaturalOneRerollDeclined
    | D20TestNaturalOneRerollSelected({ replacement: D20TestRoll })

  type D20TestNaturalOneRerollFacts = {
    hasFeature: bool,
    original: D20TestRoll,
    decision: D20TestNaturalOneRerollDecision,
  }

  type D20TestNaturalOneRerollResult = {
    admitted: bool,
    invalid: bool,
    effective: D20TestRoll,
  }

  pure def legalD20(d20: int): bool =
    d20 >= 1 and d20 <= 20

  pure def legalD20TestRoll(roll: D20TestRoll): bool =
    legalD20(roll.naturalD20)

  pure def d20TestNaturalOneRerollAdmitted(
    facts: D20TestNaturalOneRerollFacts,
  ): bool =
    match facts.decision {
      | D20TestNaturalOneRerollDeclined => false
      | D20TestNaturalOneRerollSelected(choice) => all {
        facts.hasFeature,
        legalD20TestRoll(facts.original),
        legalD20TestRoll(choice.replacement),
        facts.original.naturalD20 == 1,
      }
    }

  pure def d20TestNaturalOneRerollInvalid(
    facts: D20TestNaturalOneRerollFacts,
  ): bool =
    match facts.decision {
      | D20TestNaturalOneRerollDeclined => false
      | D20TestNaturalOneRerollSelected(choice) => not(all {
        facts.hasFeature,
        legalD20TestRoll(facts.original),
        legalD20TestRoll(choice.replacement),
        facts.original.naturalD20 == 1,
      })
    }

  pure def d20TestNaturalOneRerollEffectiveRoll(
    facts: D20TestNaturalOneRerollFacts,
  ): D20TestRoll =
    match facts.decision {
      | D20TestNaturalOneRerollDeclined => facts.original
      | D20TestNaturalOneRerollSelected(choice) =>
          if (d20TestNaturalOneRerollAdmitted(facts))
            choice.replacement
          else facts.original
    }

  pure def resolveD20TestNaturalOneReroll(
    facts: D20TestNaturalOneRerollFacts,
  ): D20TestNaturalOneRerollResult = {
    val admitted = d20TestNaturalOneRerollAdmitted(facts)
    {
      admitted: admitted,
      invalid: d20TestNaturalOneRerollInvalid(facts),
      effective: if (admitted)
        d20TestNaturalOneRerollEffectiveRoll(facts)
      else facts.original,
    }
  }
}
