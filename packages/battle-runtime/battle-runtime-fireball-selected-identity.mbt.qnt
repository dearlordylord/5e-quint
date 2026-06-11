// -*- mode: Bluespec; -*-

module battleRuntimeFireballSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type FireballSelectedIdentityScenarioOutcome = | Init | FireballSaveGatedDamage

  type FireballSelectedIdentityWitnessState = {
    qScenarioOutcome: FireballSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: FireballSelectedIdentityWitnessState

  pure def qLastResult: FireballSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def fireballSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: FireballSelectedIdentityScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: FireballSelectedIdentityScenarioOutcome): bool = all {
    qState' = {
      qScenarioOutcome: lastResult,
      protocol: fireballSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection(Init)

  action doDiscoverFireballSaveGatedDamage = all {
    qLastResult == Init,
    recordProjection(FireballSaveGatedDamage),
  }

  action step = any {
    doDiscoverFireballSaveGatedDamage,
  }
}
