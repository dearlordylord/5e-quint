// -*- mode: Bluespec; -*-

module battleRuntimeStunningStrikeMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type StunningStrikeScenarioOutcome = | Init | FailedSave | SuccessfulSave | Decline | SecondUseGate

  type StunningStrikeWitnessState = {
    qTargetStunned: bool,
    qTargetSpeedHalved: bool,
    qTargetAttackAdvantage: bool,
    qFocusUsesRemaining: int,
    qUsedThisTurn: bool,
    qScenarioOutcome: StunningStrikeScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: StunningStrikeWitnessState

  pure def qTargetStunned: bool = qState.qTargetStunned
  pure def qTargetSpeedHalved: bool = qState.qTargetSpeedHalved
  pure def qTargetAttackAdvantage: bool = qState.qTargetAttackAdvantage
  pure def qFocusUsesRemaining: int = qState.qFocusUsesRemaining
  pure def qUsedThisTurn: bool = qState.qUsedThisTurn
  pure def scenarioOutcome: StunningStrikeScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: StunningStrikeScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    targetStunned: bool,
    targetSpeedHalved: bool,
    targetAttackAdvantage: bool,
    focusUsesRemaining: int,
    usedThisTurn: bool,
    lastResult: StunningStrikeScenarioOutcome,
  ): bool = all {
    qState' = {
      qTargetStunned: targetStunned,
      qTargetSpeedHalved: targetSpeedHalved,
      qTargetAttackAdvantage: targetAttackAdvantage,
      qFocusUsesRemaining: focusUsesRemaining,
      qUsedThisTurn: usedThisTurn,
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(false, false, false, 2, false, Init)

  action doFailedSave = all {
    scenarioOutcome == Init,
    recordProjection(true, false, false, 1, true, FailedSave),
  }

  action doSuccessfulSave = all {
    scenarioOutcome == Init,
    recordProjection(false, true, true, 1, true, SuccessfulSave),
  }

  action doDecline = all {
    scenarioOutcome == Init,
    recordProjection(false, false, false, 2, false, Decline),
  }

  action doSecondUseGate = all {
    scenarioOutcome == Init,
    recordProjection(false, false, false, 1, true, SecondUseGate),
  }

  action step = any {
    doFailedSave,
    doSuccessfulSave,
    doDecline,
    doSecondUseGate,
  }
}
