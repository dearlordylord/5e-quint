// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE

module battleRuntimeFallingCreatureMitigationReaction {
  pure val fallingCreatureMitigationDurationTicks = 10
  pure val fallingCreatureMitigationDescentRateCapFeetPerRound = 60
  pure val fallingCreatureMitigationMaximumTargets = 5
  pure val fallingCreatureMitigationTriggerRangeFeet = 60

  type FallingCreatureMitigationTriggerWitness[a] =
    | ReactorFalls({ reactor: a })
    | VisibleCreatureFalls({
        reactor: a,
        fallingCreature: a,
        distanceFeet: int,
      })

  pure def fallingCreatureMitigationTriggerReactor(
    witness: FallingCreatureMitigationTriggerWitness[a],
  ): a =
    match witness {
      | ReactorFalls(data) => data.reactor
      | VisibleCreatureFalls(data) => data.reactor
    }

  pure def fallingCreatureMitigationTriggerAdmitted(
    witness: FallingCreatureMitigationTriggerWitness[a],
    triggeringFallingCreature: a,
  ): bool =
    match witness {
      | ReactorFalls(data) => data.reactor == triggeringFallingCreature
      | VisibleCreatureFalls(data) =>
          data.fallingCreature == triggeringFallingCreature and
            data.distanceFeet >= 0 and
            data.distanceFeet <= fallingCreatureMitigationTriggerRangeFeet
    }

  pure def fallingCreatureMitigationReactionAdmitted(
    triggerWitness: FallingCreatureMitigationTriggerWitness[a],
    triggeringFallingCreature: a,
    reactorCanReact: bool,
    reactorCanExpendSpellSlot: bool,
    selectedTargetCount: int,
    suppliedTargetCount: int,
    everySelectedTargetIsFalling: bool,
  ): bool =
    fallingCreatureMitigationTriggerAdmitted(
      triggerWitness,
      triggeringFallingCreature,
    ) and
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
