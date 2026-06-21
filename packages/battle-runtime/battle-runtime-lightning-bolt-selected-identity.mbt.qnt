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

  pure def scenarioOutcome: LightningBoltSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: LightningBoltSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(lastResult: LightningBoltSelectedIdentityScenarioOutcome): bool = all {
    qState' = {

      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }
  action init = recordProjection(Init)

  action doDiscoverLightningBoltSaveGatedDamage = all {
    scenarioOutcome == Init,
    recordProjection(LightningBoltSaveGatedDamage),
  }

  action step = any {
    doDiscoverLightningBoltSaveGatedDamage,
  }
}
