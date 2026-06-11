// -*- mode: Bluespec; -*-

module battleRuntimeLevel2MobilitySpellSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level2MobilitySpellSelectedIdentityWitnessState = {
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: Level2MobilitySpellSelectedIdentityWitnessState

  pure def qLastResult: str = qState.qScenarioResult

  pure def level2MobilitySpellSelectedIdentityProtocolForProjection(
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
      protocol: level2MobilitySpellSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection("init")

  action doDiscoverAlterSelfTransformationMode = all {
    qLastResult == "init",
    recordProjection("alterSelfTransformationMode"),
  }

  action doDiscoverFlySpeedGrant = all {
    qLastResult == "init",
    recordProjection("flySpeedGrant"),
  }

  action doDiscoverMistyStepSelfTeleport = all {
    qLastResult == "init",
    recordProjection("mistyStepSelfTeleport"),
  }

  action doDiscoverSpiderClimbSpeedGrant = all {
    qLastResult == "init",
    recordProjection("spiderClimbSpeedGrant"),
  }

  action step = any {
    doDiscoverAlterSelfTransformationMode,
    doDiscoverFlySpeedGrant,
    doDiscoverMistyStepSelfTeleport,
    doDiscoverSpiderClimbSpeedGrant,
  }
}
