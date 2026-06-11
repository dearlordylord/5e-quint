// -*- mode: Bluespec; -*-

module battleRuntimeLightningBoltSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type LightningBoltSelectedIdentityWitnessState = {
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: LightningBoltSelectedIdentityWitnessState

  pure def qLastResult: str = qState.qScenarioResult

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(lastResult: str): bool = all {
    qState' = {

      qScenarioResult: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init = recordProjection("init")

  action doDiscoverLightningBoltSaveGatedDamage = all {
    qLastResult == "init",
    recordProjection("lightningBoltSaveGatedDamage"),
  }

  action step = any {
    doDiscoverLightningBoltSaveGatedDamage,
  }
}
