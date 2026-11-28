// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.d20-test-die-minimum
// KERNEL-COVERAGE: qnt-owner BATTLE.D20_TEST.DIE_MINIMUM

module unitFeatureD20TestDieMinimumCore {
  // RAW anchors:
  // - classes.md: Rogue, Reliable Talent. "Whenever you make an ability
  //   check that uses one of your skill or tool proficiencies, you can treat
  //   a d20 roll of 9 or lower as a 10."
  // - playing-the-game.md: D20 Tests. Roll the d20, add modifiers, compare
  //   the total to the target: the minimum changes the d20 before the total.
  // - playing-the-game.md: Advantage and Disadvantage. The roll uses one of
  //   the two d20s; the minimum applies to that d20.
  // - ASSUMPTIONS.md A55: rerolls replace the die as it stands.
  // - ASSUMPTIONS.md A67: the minimum applies to whichever d20 stands, so
  //   every reported total counts it.
  import unitFeatureD20TestNaturalOneRerollCore.* from "./unit-feature-d20-test-natural-one-reroll-core"

  type D20TestKind = AttackRollKind | SavingThrowKind | AbilityCheckKind

  // What the feature applies to: today one closed predicate.
  type D20TestDieMinimumScope = | AbilityCheckUsingOwnProficiency

  type D20TestDieMinimumFeature = {
    scope: D20TestDieMinimumScope,
    minimumDieFace: int,
  }

  type D20TestDieMinimumTest = {
    kind: D20TestKind,
    // Whether the test uses one of the roller's own skill or tool
    // proficiencies.
    usesOwnProficiency: bool,
  }

  type D20TestDieMinimumDecision =
    | D20TestDieMinimumNotDecided
    | D20TestDieMinimumUsed
    | D20TestDieMinimumDeclined

  type D20TestDieMinimumFacts = {
    features: List[D20TestDieMinimumFeature],
    test: D20TestDieMinimumTest,
    decision: D20TestDieMinimumDecision,
  }

  // The minimum offered, or 0 when none is.
  type D20TestDieMinimumResolution = {
    invalid: bool,
    offeredMinimum: int,
    countedMinimum: int,
  }

  pure def featureApplies(
    feature: D20TestDieMinimumFeature,
    test: D20TestDieMinimumTest,
  ): bool =
    match feature.scope {
      | AbilityCheckUsingOwnProficiency =>
          test.kind == AbilityCheckKind and test.usesOwnProficiency
    }

  // The highest minimum any applicable feature offers, or 0 for none.
  pure def offeredDieMinimum(
    features: List[D20TestDieMinimumFeature],
    test: D20TestDieMinimumTest,
  ): int =
    features.foldl(0, (best, feature) =>
      if (featureApplies(feature, test) and feature.minimumDieFace > best)
        feature.minimumDieFace
      else
        best
    )

  // The roll offers the minimum exactly when one applies, and the fill must
  // then decide; a fill may not decide on a minimum it was not offered.
  pure def resolveD20TestDieMinimum(
    facts: D20TestDieMinimumFacts,
  ): D20TestDieMinimumResolution =
    val offered = offeredDieMinimum(facts.features, facts.test)
    val decided = facts.decision != D20TestDieMinimumNotDecided
    {
      invalid: (offered > 0) != decided,
      offeredMinimum: offered,
      countedMinimum:
        if (offered > 0 and facts.decision == D20TestDieMinimumUsed) offered
        else 0,
    }

  // The d20 face a total counts: the selected d20, raised to the counted
  // minimum (0 counts nothing).
  pure def countedD20(naturalD20: int, countedMinimum: int): int =
    if (naturalD20 < countedMinimum) countedMinimum else naturalD20

  // A reroll replaces only the d20: each total counts its d20 under the same
  // minimum, so both keep the same modifiers.
  pure def rerollKeepsModifiersUnderMinimum(
    original: D20TestRoll,
    replacement: D20TestRoll,
    countedMinimum: int,
  ): bool =
    replacement.total - countedD20(replacement.naturalD20, countedMinimum) ==
      original.total - countedD20(original.naturalD20, countedMinimum)

  // Raising the selected d20 of two equals selecting from the two raised
  // d20s, under Advantage and Disadvantage alike.
  pure def minimumCommutesWithSelection(
    dice: D20TestRolledDice,
    countedMinimum: int,
  ): bool =
    countedD20(selectedNaturalD20ForRollMode(dice), countedMinimum) ==
      selectedNaturalD20ForRollMode({
        first: countedD20(dice.first, countedMinimum),
        second: countedD20(dice.second, countedMinimum),
        rollMode: dice.rollMode,
      })
}
