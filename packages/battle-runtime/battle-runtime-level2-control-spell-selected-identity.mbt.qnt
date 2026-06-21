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

  pure def scenarioOutcome: Level2ControlSpellSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def level2ControlSpellSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: Level2ControlSpellSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: Level2ControlSpellSelectedIdentityScenarioOutcome): bool = all {
    qState' = {
      qScenarioOutcome: lastResult,
      protocol: level2ControlSpellSelectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(Init)

  action doDiscoverCalmEmotionsConditionImmunity = all {
    scenarioOutcome == Init,
    recordProjection(CalmEmotionsConditionImmunity),
  }

  action doDiscoverCharmPersonSaveGatedCondition = all {
    scenarioOutcome == Init,
    recordProjection(CharmPersonSaveGatedCondition),
  }

  action doDiscoverDarknessPointOrigin = all {
    scenarioOutcome == Init,
    recordProjection(DarknessPointOrigin),
  }

  action doDiscoverEnthrallPerceptionPenalty = all {
    scenarioOutcome == Init,
    recordProjection(EnthrallPerceptionPenalty),
  }

  action doDiscoverGustOfWindLine = all {
    scenarioOutcome == Init,
    recordProjection(GustOfWindLine),
  }

  action doDiscoverInvisibilityDirectCondition = all {
    scenarioOutcome == Init,
    recordProjection(InvisibilityDirectCondition),
  }

  action doDiscoverLevitateCreature = all {
    scenarioOutcome == Init,
    recordProjection(LevitateCreature),
  }

  action doDiscoverSeeInvisibilityObserverSight = all {
    scenarioOutcome == Init,
    recordProjection(SeeInvisibilityObserverSight),
  }

  action doDiscoverSpikeGrowthMovementHazard = all {
    scenarioOutcome == Init,
    recordProjection(SpikeGrowthMovementHazard),
  }

  action doDiscoverWebRestraintHazard = all {
    scenarioOutcome == Init,
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
