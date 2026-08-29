// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE

module battleRuntimeFallingCreatureMitigationReaction {
  pure val fallingCreatureMitigationDurationTicks = 10
  pure val fallingCreatureMitigationDescentRateCapFeetPerRound = 60
  pure val fallingCreatureMitigationMaximumTargets = 5

  pure def fallingCreatureMitigationReactionAdmitted(
    reactorCanReact: bool,
    reactorCanExpendSpellSlot: bool,
    selectedTargetCount: int,
    suppliedTargetCount: int,
    everySelectedTargetIsFalling: bool,
  ): bool =
    reactorCanReact and
      reactorCanExpendSpellSlot and
      selectedTargetCount >= 1 and
      selectedTargetCount == suppliedTargetCount and
      selectedTargetCount <= fallingCreatureMitigationMaximumTargets and
      everySelectedTargetIsFalling

  pure def fallingCreatureMitigationDescentRateCap(
    mitigationActive: bool,
  ): int =
    if (mitigationActive)
      fallingCreatureMitigationDescentRateCapFeetPerRound
    else
      0

  pure def fallingCreatureLandingPreventsFallConsequences(
    mitigationActive: bool,
  ): bool =
    mitigationActive
}
