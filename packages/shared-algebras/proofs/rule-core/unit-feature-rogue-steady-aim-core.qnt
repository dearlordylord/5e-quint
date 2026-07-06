// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.rogue-steady-aim
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureRogueSteadyAimCore {
  // RAW anchors:
  // - .references/srd-5.2.1/Classes/Rogue.md:89-91: Steady Aim is a Bonus
  //   Action, requires no movement during the current turn, grants Advantage on
  //   the next attack roll on the current turn, and sets Speed to 0 until the
  //   current turn ends.
  // - UBIQUITOUS_LANGUAGE.md: Bonus Action, Advantage, Attack Roll, Speed, and
  //   Movement.

  type RogueSteadyAimFacts = {
    bonusActionAvailable: bool,
    movedThisTurn: bool,
    nextAttackAdvantageAlreadyActive: bool,
  }

  pure def rogueSteadyAimAvailable(facts: RogueSteadyAimFacts): bool =
    all {
      facts.bonusActionAvailable,
      not(facts.movedThisTurn),
      not(facts.nextAttackAdvantageAlreadyActive),
    }

  pure def rogueSteadyAimSpeedFeetAfterUse: int = 0

  pure def rogueSteadyAimGrantsNextAttackAdvantage: bool = true

  pure def rogueSteadyAimEffectEndsAtEndOfCurrentTurn: bool = true
}
