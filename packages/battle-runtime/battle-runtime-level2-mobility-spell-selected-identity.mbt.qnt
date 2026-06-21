// -*- mode: Bluespec; -*-

module battleRuntimeLevel2MobilitySpellSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level2MobilitySpellSelectedIdentityScenarioOutcome = | Init | AlterSelfTransformationMode | FlySpeedGrant | MistyStepSelfTeleport | SpiderClimbSpeedGrant

  type Level2MobilitySpellSelectedIdentityWitnessState = {
    qScenarioOutcome: Level2MobilitySpellSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: Level2MobilitySpellSelectedIdentityWitnessState

  pure def scenarioOutcome: Level2MobilitySpellSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def level2MobilitySpellSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: Level2MobilitySpellSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: Level2MobilitySpellSelectedIdentityScenarioOutcome): bool = all {
    qState' = {
      qScenarioOutcome: lastResult,
      protocol: level2MobilitySpellSelectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(Init)

  action doDiscoverAlterSelfTransformationMode = all {
    scenarioOutcome == Init,
    recordProjection(AlterSelfTransformationMode),
  }

  action doDiscoverFlySpeedGrant = all {
    scenarioOutcome == Init,
    recordProjection(FlySpeedGrant),
  }

  action doDiscoverMistyStepSelfTeleport = all {
    scenarioOutcome == Init,
    recordProjection(MistyStepSelfTeleport),
  }

  action doDiscoverSpiderClimbSpeedGrant = all {
    scenarioOutcome == Init,
    recordProjection(SpiderClimbSpeedGrant),
  }

  action step = any {
    doDiscoverAlterSelfTransformationMode,
    doDiscoverFlySpeedGrant,
    doDiscoverMistyStepSelfTeleport,
    doDiscoverSpiderClimbSpeedGrant,
  }
}
