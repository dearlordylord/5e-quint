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

  pure def scenarioOutcome: FireballSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def fireballSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: FireballSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: FireballSelectedIdentityScenarioOutcome): bool = all {
    qState' = {
      qScenarioOutcome: lastResult,
      protocol: fireballSelectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(Init)

  action doDiscoverFireballSaveGatedDamage = all {
    scenarioOutcome == Init,
    recordProjection(FireballSaveGatedDamage),
  }

  action step = any {
    doDiscoverFireballSaveGatedDamage,
  }
}
