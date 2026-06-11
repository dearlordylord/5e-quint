// -*- mode: Bluespec; -*-

module battleRuntimeLightningBoltSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type LightningBoltSelectedIdentityScenarioOutcome = | Init | LightningBoltSaveGatedDamage

  type LightningBoltSelectedIdentityWitnessState = {
    qScenarioOutcome: LightningBoltSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: LightningBoltSelectedIdentityWitnessState

  pure def qLastResult: LightningBoltSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: LightningBoltSelectedIdentityScenarioOutcome,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(lastResult: LightningBoltSelectedIdentityScenarioOutcome): bool = all {
    qState' = {

      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init = recordProjection(Init)

  action doDiscoverLightningBoltSaveGatedDamage = all {
    qLastResult == Init,
    recordProjection(LightningBoltSaveGatedDamage),
  }

  action step = any {
    doDiscoverLightningBoltSaveGatedDamage,
  }
}
