// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-slow-active-penalties

module battleRuntimeSaveGatedTurnConstraintBundle {
  type TurnConstraintBundle = {
    speedNumerator: int,
    speedDenominator: int,
    armorClassDelta: int,
    dexteritySaveDelta: int,
    reactionsAllowed: bool,
    maximumAttackActionAttacks: int,
    somaticSpellFailurePercent: int,
  }

  pure def turnConstraintBundleIsAdmitted(
    bundle: TurnConstraintBundle
  ): bool =
    all {
      bundle.speedNumerator == 1,
      bundle.speedDenominator == 2,
      bundle.armorClassDelta == -2,
      bundle.dexteritySaveDelta == -2,
      not(bundle.reactionsAllowed),
      bundle.maximumAttackActionAttacks == 1,
      bundle.somaticSpellFailurePercent == 25,
    }

  pure def turnCostsAreMutuallyExclusive(
    actionSpent: bool,
    bonusActionSpent: bool
  ): bool =
    not(actionSpent and bonusActionSpent)

  pure def repeatSaveKeepsConstraint(saveSucceeded: bool): bool =
    not(saveSucceeded)

  pure def somaticSpellFails(
    percentileRoll: int,
    somaticSpellFailurePercent: int
  ): bool =
    percentileRoll >= 1 and percentileRoll <= somaticSpellFailurePercent
}
