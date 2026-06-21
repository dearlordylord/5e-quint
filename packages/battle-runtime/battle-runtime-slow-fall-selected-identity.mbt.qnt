// -*- mode: Bluespec; -*-

module battleRuntimeSlowFallSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type SlowFallSelectedIdentityScenarioOutcome = | Init | ReducedDamage | PreventedDamage

  type SlowFallSelectedIdentityWitnessState = {
    qReactionAvailable: bool,
    qEffectiveFallDamage: int,
    qFallingProne: bool,
    qScenarioOutcome: SlowFallSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: SlowFallSelectedIdentityWitnessState

  pure def qReactionAvailable: bool = qState.qReactionAvailable
  pure def qEffectiveFallDamage: int = qState.qEffectiveFallDamage
  pure def qFallingProne: bool = qState.qFallingProne
  pure def scenarioOutcome: SlowFallSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: SlowFallSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    reactionAvailable: bool,
    effectiveFallDamage: int,
    fallingProne: bool,
    lastResult: SlowFallSelectedIdentityScenarioOutcome,
  ): bool = all {
    qState' = {
      qReactionAvailable: reactionAvailable,
      qEffectiveFallDamage: effectiveFallDamage,
      qFallingProne: fallingProne,
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(
    true,
    0,
    false,
    Init,
  )

  action doSlowFallReduceDamage = all {
    scenarioOutcome == Init,
    recordProjection(
      false,
      3,
      true,
      ReducedDamage,
    ),
  }

  action doSlowFallPreventDamage = all {
    scenarioOutcome == Init,
    recordProjection(
      false,
      0,
      false,
      PreventedDamage,
    ),
  }

  action step = any {
    doSlowFallReduceDamage,
    doSlowFallPreventDamage,
  }
}
