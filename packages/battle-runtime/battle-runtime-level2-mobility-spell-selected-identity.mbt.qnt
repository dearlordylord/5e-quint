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

  pure def qLastResult: Level2MobilitySpellSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def level2MobilitySpellSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: Level2MobilitySpellSelectedIdentityScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: Level2MobilitySpellSelectedIdentityScenarioOutcome): bool = all {
    qState' = {
      qScenarioOutcome: lastResult,
      protocol: level2MobilitySpellSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection(Init)

  action doDiscoverAlterSelfTransformationMode = all {
    qLastResult == Init,
    recordProjection(AlterSelfTransformationMode),
  }

  action doDiscoverFlySpeedGrant = all {
    qLastResult == Init,
    recordProjection(FlySpeedGrant),
  }

  action doDiscoverMistyStepSelfTeleport = all {
    qLastResult == Init,
    recordProjection(MistyStepSelfTeleport),
  }

  action doDiscoverSpiderClimbSpeedGrant = all {
    qLastResult == Init,
    recordProjection(SpiderClimbSpeedGrant),
  }

  action step = any {
    doDiscoverAlterSelfTransformationMode,
    doDiscoverFlySpeedGrant,
    doDiscoverMistyStepSelfTeleport,
    doDiscoverSpiderClimbSpeedGrant,
  }
}
