// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE

module battleRuntimeFallingCreatureMitigationReaction {
  pure val fallingCreatureMitigationDurationTicks = 10
  pure val fallingCreatureMitigationDescentRateCapFeetPerRound = 60
  pure val fallingCreatureMitigationMaximumTargets = 5
  pure val fallingCreatureMitigationTriggerRangeFeet = 60

  type FallingCreatureMitigationTriggerKind =
    | ReactorFalls
    | VisibleCreatureFalls({ distanceFeet: int })

  type FallingCreatureMitigationTriggerWitness[a] = {
    kind: FallingCreatureMitigationTriggerKind,
    reactor: a,
    fallingCreature: a,
  }

  pure def fallingCreatureMitigationTriggerReactor(
    witness: FallingCreatureMitigationTriggerWitness[a],
  ): a = witness.reactor

  pure def fallingCreatureMitigationTriggerAdmitted(
    witness: FallingCreatureMitigationTriggerWitness[a],
    triggeringFallingCreature: a,
  ): bool =
    match witness.kind {
      | ReactorFalls =>
          witness.reactor == triggeringFallingCreature and
            witness.fallingCreature == triggeringFallingCreature
      | VisibleCreatureFalls(data) =>
          witness.fallingCreature == triggeringFallingCreature and
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
