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

  type D20TestRolledDie = FirstD20 | SecondD20

  type D20TestRollMode = AdvantageD20TestRoll | DisadvantageD20TestRoll

  type D20TestRolledDice = {
    first: int,
    second: int,
    selected: D20TestRolledDie,
    rollMode: D20TestRollMode,
  }

  type D20TestNaturalOneRolledDieRerollDecision =
    | D20TestNaturalOneRolledDieRerollDeclined
    | D20TestNaturalOneRolledDieRerollSelected({
        die: D20TestRolledDie,
        replacement: int,
      })

  type D20TestNaturalOneRolledDieRerollFacts = {
    hasFeature: bool,
    original: D20TestRoll,
    rolledDice: D20TestRolledDice,
    decision: D20TestNaturalOneRolledDieRerollDecision,
  }

  pure def legalD20(d20: int): bool =
    d20 >= 1 and d20 <= 20

  pure def legalD20TestRoll(roll: D20TestRoll): bool =
    legalD20(roll.naturalD20)

  pure def rolledD20Face(
    rolledDice: D20TestRolledDice,
    die: D20TestRolledDie,
  ): int =
    match die {
      | FirstD20 => rolledDice.first
      | SecondD20 => rolledDice.second
    }

  pure def selectedRolledD20Face(rolledDice: D20TestRolledDice): int =
    rolledD20Face(rolledDice, rolledDice.selected)

  pure def selectedNaturalD20ForRollMode(
    rolledDice: D20TestRolledDice,
  ): int =
    match rolledDice.rollMode {
      | AdvantageD20TestRoll =>
          if (rolledDice.first >= rolledDice.second)
            rolledDice.first
          else
            rolledDice.second
      | DisadvantageD20TestRoll =>
          if (rolledDice.first <= rolledDice.second)
            rolledDice.first
          else
            rolledDice.second
    }

  pure def legalD20TestRolledDice(
    original: D20TestRoll,
    rolledDice: D20TestRolledDice,
  ): bool =
    all {
      legalD20(rolledDice.first),
      legalD20(rolledDice.second),
      selectedRolledD20Face(rolledDice) == original.naturalD20,
      selectedNaturalD20ForRollMode(rolledDice) == original.naturalD20,
    }

  pure def replaceRolledD20(
    rolledDice: D20TestRolledDice,
    die: D20TestRolledDie,
    replacement: int,
  ): D20TestRolledDice =
    match die {
      | FirstD20 => {
          first: replacement,
          second: rolledDice.second,
          selected: rolledDice.selected,
          rollMode: rolledDice.rollMode,
        }
      | SecondD20 => {
          first: rolledDice.first,
          second: replacement,
          selected: rolledDice.selected,
          rollMode: rolledDice.rollMode,
        }
    }

  pure def projectedRollAfterRolledDieReroll(
    original: D20TestRoll,
    rolledDice: D20TestRolledDice,
    die: D20TestRolledDie,
    replacement: int,
  ): D20TestRoll = {
    val replaced = replaceRolledD20(rolledDice, die, replacement)
    val selected = selectedNaturalD20ForRollMode(replaced)
    {
      naturalD20: selected,
      total: original.total - original.naturalD20 + selected,
    }
  }

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

  pure def d20TestNaturalOneRolledDieRerollAdmitted(
    facts: D20TestNaturalOneRolledDieRerollFacts,
  ): bool =
    match facts.decision {
      | D20TestNaturalOneRolledDieRerollDeclined => false
      | D20TestNaturalOneRolledDieRerollSelected(choice) => all {
        facts.hasFeature,
        legalD20TestRoll(facts.original),
        legalD20TestRolledDice(facts.original, facts.rolledDice),
        rolledD20Face(facts.rolledDice, choice.die) == 1,
        legalD20(choice.replacement),
      }
    }

  pure def d20TestNaturalOneRolledDieRerollInvalid(
    facts: D20TestNaturalOneRolledDieRerollFacts,
  ): bool =
    match facts.decision {
      | D20TestNaturalOneRolledDieRerollDeclined => false
      | D20TestNaturalOneRolledDieRerollSelected(_) =>
          not(d20TestNaturalOneRolledDieRerollAdmitted(facts))
    }

  pure def d20TestNaturalOneRolledDieRerollEffectiveRoll(
    facts: D20TestNaturalOneRolledDieRerollFacts,
  ): D20TestRoll =
    match facts.decision {
      | D20TestNaturalOneRolledDieRerollDeclined => facts.original
      | D20TestNaturalOneRolledDieRerollSelected(choice) =>
          if (d20TestNaturalOneRolledDieRerollAdmitted(facts))
            projectedRollAfterRolledDieReroll(
              facts.original,
              facts.rolledDice,
              choice.die,
              choice.replacement,
            )
          else facts.original
    }

  pure def resolveD20TestNaturalOneRolledDieReroll(
    facts: D20TestNaturalOneRolledDieRerollFacts,
  ): D20TestNaturalOneRerollResult = {
    val admitted = d20TestNaturalOneRolledDieRerollAdmitted(facts)
    {
      admitted: admitted,
      invalid: d20TestNaturalOneRolledDieRerollInvalid(facts),
      effective: if (admitted)
        d20TestNaturalOneRolledDieRerollEffectiveRoll(facts)
      else facts.original,
    }
  }
}
