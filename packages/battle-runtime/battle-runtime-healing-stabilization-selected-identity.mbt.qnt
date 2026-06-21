// -*- mode: Bluespec; -*-

module battleRuntimeHealingStabilizationSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type HealingStabilizationSelectedIdentityScenarioOutcome = | Init | Resolved

  type HealingStabilizationSelectedIdentityWitnessState = {
    qTargetHp: int,
    qTargetStable: bool,
    qTargetUnconscious: bool,
    qTargetDeathSuccesses: int,
    qTargetDeathFailures: int,
    qActionAvailable: bool,
    qScenarioOutcome: HealingStabilizationSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: HealingStabilizationSelectedIdentityWitnessState

  pure def qTargetHp: int = qState.qTargetHp
  pure def qTargetStable: bool = qState.qTargetStable
  pure def qTargetUnconscious: bool = qState.qTargetUnconscious
  pure def qTargetDeathSuccesses: int = qState.qTargetDeathSuccesses
  pure def qTargetDeathFailures: int = qState.qTargetDeathFailures
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def scenarioOutcome: HealingStabilizationSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def healingStabilizationSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: HealingStabilizationSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(
    targetHp: int,
    targetStable: bool,
    targetUnconscious: bool,
    targetDeathSuccesses: int,
    targetDeathFailures: int,
    actionAvailable: bool,
    lastResult: HealingStabilizationSelectedIdentityScenarioOutcome,
  ): bool = all {
    qState' = {
      qTargetHp: targetHp,
      qTargetStable: targetStable,
      qTargetUnconscious: targetUnconscious,
      qTargetDeathSuccesses: targetDeathSuccesses,
      qTargetDeathFailures: targetDeathFailures,
      qActionAvailable: actionAvailable,
      qScenarioOutcome: lastResult,
      protocol: healingStabilizationSelectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(0, false, true, 2, 1, true, Init)

  action doResolveSpareTheDyingStable = all {
    scenarioOutcome == Init,
    recordProjection(0, true, true, 0, 0, false, Resolved),
  }

  action step = any {
    doResolveSpareTheDyingStable,
  }
}
