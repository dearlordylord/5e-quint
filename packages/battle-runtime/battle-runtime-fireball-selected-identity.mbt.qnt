// -*- mode: Bluespec; -*-

module battleRuntimeFireballSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type FireballSelectedIdentityWitnessState = {
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: FireballSelectedIdentityWitnessState

  pure def qLastResult: str = qState.qScenarioResult

  pure def fireballSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: str): bool = all {
    qState' = {
      qScenarioResult: lastResult,
      protocol: fireballSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection("init")

  action doDiscoverFireballSaveGatedDamage = all {
    qLastResult == "init",
    recordProjection("fireballSaveGatedDamage"),
  }

  action step = any {
    doDiscoverFireballSaveGatedDamage,
  }
}
