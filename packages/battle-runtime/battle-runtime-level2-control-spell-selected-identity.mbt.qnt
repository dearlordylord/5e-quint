// -*- mode: Bluespec; -*-

module battleRuntimeLevel2ControlSpellSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level2ControlSpellSelectedIdentityScenarioOutcome = | Init | CalmEmotionsConditionImmunity | CharmPersonSaveGatedCondition | DarknessPointOrigin | EnthrallPerceptionPenalty | GustOfWindLine | InvisibilityDirectCondition | LevitateCreature | SeeInvisibilityObserverSight | SpikeGrowthMovementHazard | WebRestraintHazard

  type Level2ControlSpellSelectedIdentityWitnessState = {
    qScenarioOutcome: Level2ControlSpellSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: Level2ControlSpellSelectedIdentityWitnessState

  pure def qLastResult: Level2ControlSpellSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def level2ControlSpellSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: Level2ControlSpellSelectedIdentityScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: Level2ControlSpellSelectedIdentityScenarioOutcome): bool = all {
    qState' = {
      qScenarioOutcome: lastResult,
      protocol: level2ControlSpellSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection(Init)

  action doDiscoverCalmEmotionsConditionImmunity = all {
    qLastResult == Init,
    recordProjection(CalmEmotionsConditionImmunity),
  }

  action doDiscoverCharmPersonSaveGatedCondition = all {
    qLastResult == Init,
    recordProjection(CharmPersonSaveGatedCondition),
  }

  action doDiscoverDarknessPointOrigin = all {
    qLastResult == Init,
    recordProjection(DarknessPointOrigin),
  }

  action doDiscoverEnthrallPerceptionPenalty = all {
    qLastResult == Init,
    recordProjection(EnthrallPerceptionPenalty),
  }

  action doDiscoverGustOfWindLine = all {
    qLastResult == Init,
    recordProjection(GustOfWindLine),
  }

  action doDiscoverInvisibilityDirectCondition = all {
    qLastResult == Init,
    recordProjection(InvisibilityDirectCondition),
  }

  action doDiscoverLevitateCreature = all {
    qLastResult == Init,
    recordProjection(LevitateCreature),
  }

  action doDiscoverSeeInvisibilityObserverSight = all {
    qLastResult == Init,
    recordProjection(SeeInvisibilityObserverSight),
  }

  action doDiscoverSpikeGrowthMovementHazard = all {
    qLastResult == Init,
    recordProjection(SpikeGrowthMovementHazard),
  }

  action doDiscoverWebRestraintHazard = all {
    qLastResult == Init,
    recordProjection(WebRestraintHazard),
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
