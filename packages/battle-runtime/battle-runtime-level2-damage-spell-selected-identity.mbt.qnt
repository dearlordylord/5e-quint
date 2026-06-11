// -*- mode: Bluespec; -*-

module battleRuntimeLevel2DamageSpellSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level2DamageSpellSelectedIdentityWitnessState = {
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: Level2DamageSpellSelectedIdentityWitnessState

  pure def qLastResult: str = qState.qScenarioResult

  pure def level2DamageSpellSelectedIdentityProtocolForProjection(
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
      protocol: level2DamageSpellSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection("init")

  action doDiscoverAcidArrowAttackTiming = all {
    qLastResult == "init",
    recordProjection("acidArrowAttackTiming"),
  }

  action doDiscoverDragonsBreathInitial = all {
    qLastResult == "init",
    recordProjection("dragonsBreathInitial"),
  }

  action doDiscoverFlameBladeHeldObject = all {
    qLastResult == "init",
    recordProjection("flameBladeHeldObject"),
  }

  action doDiscoverFlamingSphereHazard = all {
    qLastResult == "init",
    recordProjection("flamingSphereHazard"),
  }

  action doDiscoverHeatMetalObjectContact = all {
    qLastResult == "init",
    recordProjection("heatMetalObjectContact"),
  }

  action doDiscoverMoonbeamMovableZone = all {
    qLastResult == "init",
    recordProjection("moonbeamMovableZone"),
  }

  action doDiscoverRayOfEnfeeblementSaveGate = all {
    qLastResult == "init",
    recordProjection("rayOfEnfeeblementSaveGate"),
  }

  action doDiscoverScorchingRayAttackSequence = all {
    qLastResult == "init",
    recordProjection("scorchingRayAttackSequence"),
  }

  action doDiscoverShatterSaveGatedDamage = all {
    qLastResult == "init",
    recordProjection("shatterSaveGatedDamage"),
  }

  action doDiscoverSpiritualWeaponAttackProxy = all {
    qLastResult == "init",
    recordProjection("spiritualWeaponAttackProxy"),
  }

  action step = any {
    doDiscoverAcidArrowAttackTiming,
    doDiscoverDragonsBreathInitial,
    doDiscoverFlameBladeHeldObject,
    doDiscoverFlamingSphereHazard,
    doDiscoverHeatMetalObjectContact,
    doDiscoverMoonbeamMovableZone,
    doDiscoverRayOfEnfeeblementSaveGate,
    doDiscoverScorchingRayAttackSequence,
    doDiscoverShatterSaveGatedDamage,
    doDiscoverSpiritualWeaponAttackProxy,
  }
}
