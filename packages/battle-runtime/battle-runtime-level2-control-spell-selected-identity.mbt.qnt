// -*- mode: Bluespec; -*-

module battleRuntimeLevel2ControlSpellSelectedIdentityMbt {
  var qLastResult: str

  action recordProjection(lastResult: str): bool = all {
    qLastResult' = lastResult,
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
