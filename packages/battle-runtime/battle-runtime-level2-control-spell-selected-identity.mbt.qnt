// -*- mode: Bluespec; -*-

module battleRuntimeLevel2ControlSpellSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level2ControlSpellSelectedIdentityWitnessState = {
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: Level2ControlSpellSelectedIdentityWitnessState

  pure def qLastResult: str = qState.qScenarioResult

  pure def level2ControlSpellSelectedIdentityProtocolForProjection(
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
      protocol: level2ControlSpellSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection("init")

  action doDiscoverCalmEmotionsConditionImmunity = all {
    qLastResult == "init",
    recordProjection("calmEmotionsConditionImmunity"),
  }

  action doDiscoverCharmPersonSaveGatedCondition = all {
    qLastResult == "init",
    recordProjection("charmPersonSaveGatedCondition"),
  }

  action doDiscoverDarknessPointOrigin = all {
    qLastResult == "init",
    recordProjection("darknessPointOrigin"),
  }

  action doDiscoverEnthrallPerceptionPenalty = all {
    qLastResult == "init",
    recordProjection("enthrallPerceptionPenalty"),
  }

  action doDiscoverGustOfWindLine = all {
    qLastResult == "init",
    recordProjection("gustOfWindLine"),
  }

  action doDiscoverInvisibilityDirectCondition = all {
    qLastResult == "init",
    recordProjection("invisibilityDirectCondition"),
  }

  action doDiscoverLevitateCreature = all {
    qLastResult == "init",
    recordProjection("levitateCreature"),
  }

  action doDiscoverSeeInvisibilityObserverSight = all {
    qLastResult == "init",
    recordProjection("seeInvisibilityObserverSight"),
  }

  action doDiscoverSpikeGrowthMovementHazard = all {
    qLastResult == "init",
    recordProjection("spikeGrowthMovementHazard"),
  }

  action doDiscoverWebRestraintHazard = all {
    qLastResult == "init",
    recordProjection("webRestraintHazard"),
  }

  action step = any {
    doDiscoverCalmEmotionsConditionImmunity,
    doDiscoverCharmPersonSaveGatedCondition,
    doDiscoverDarknessPointOrigin,
    doDiscoverEnthrallPerceptionPenalty,
    doDiscoverGustOfWindLine,
    doDiscoverInvisibilityDirectCondition,
    doDiscoverLevitateCreature,
    doDiscoverSeeInvisibilityObserverSight,
    doDiscoverSpikeGrowthMovementHazard,
    doDiscoverWebRestraintHazard,
  }
}
