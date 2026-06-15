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
  pure def qLastResult: SlowFallSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: SlowFallSelectedIdentityScenarioOutcome,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
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
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection(
    true,
    0,
    false,
    Init,
  )

  action doSlowFallReduceDamage = all {
    qLastResult == Init,
    recordProjection(
      false,
      3,
      true,
      ReducedDamage,
    ),
  }

  action doSlowFallPreventDamage = all {
    qLastResult == Init,
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
