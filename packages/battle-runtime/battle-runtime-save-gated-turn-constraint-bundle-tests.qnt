// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-slow-active-penalties

module battleRuntimeSaveGatedTurnConstraintBundleTests {
  import battleRuntimeSaveGatedTurnConstraintBundle.* from "./battle-runtime-save-gated-turn-constraint-bundle"

  run saveGatedTurnConstraintCoversCostAttackSomaticAndEscapeBoundariesTest = {
    val admitted = {
      speedNumerator: 1,
      speedDenominator: 2,
      armorClassDelta: -2,
      dexteritySaveDelta: -2,
      reactionsAllowed: false,
      maximumAttackActionAttacks: 1,
      somaticSpellFailurePercent: 25,
    }
    all {
      assert(turnConstraintBundleIsAdmitted(admitted)),
      assert(turnCostsAreMutuallyExclusive(true, false)),
      assert(turnCostsAreMutuallyExclusive(false, true)),
      assert(not(turnCostsAreMutuallyExclusive(true, true))),
      assert(somaticSpellFails(25, admitted.somaticSpellFailurePercent)),
      assert(not(somaticSpellFails(26, admitted.somaticSpellFailurePercent))),
      assert(repeatSaveKeepsConstraint(false)),
      assert(not(repeatSaveKeepsConstraint(true))),
    }
  }
}
