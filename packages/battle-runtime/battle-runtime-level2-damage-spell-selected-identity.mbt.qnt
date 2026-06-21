// -*- mode: Bluespec; -*-

module battleRuntimeLevel2DamageSpellSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level2DamageSpellSelectedIdentityScenarioOutcome = | Init | AcidArrowAttackTiming | DragonsBreathInitial | FlameBladeHeldObject | FlamingSphereHazard | HeatMetalObjectContact | MoonbeamMovableZone | RayOfEnfeeblementSaveGate | ScorchingRayAttackSequence | ShatterSaveGatedDamage | SpiritualWeaponAttackProxy

  type Level2DamageSpellSelectedIdentityWitnessState = {
    qScenarioOutcome: Level2DamageSpellSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: Level2DamageSpellSelectedIdentityWitnessState

  pure def scenarioOutcome: Level2DamageSpellSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def level2DamageSpellSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: Level2DamageSpellSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: Level2DamageSpellSelectedIdentityScenarioOutcome): bool = all {
    qState' = {
      qScenarioOutcome: lastResult,
      protocol: level2DamageSpellSelectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(Init)

  action doDiscoverAcidArrowAttackTiming = all {
    scenarioOutcome == Init,
    recordProjection(AcidArrowAttackTiming),
  }

  action doDiscoverDragonsBreathInitial = all {
    scenarioOutcome == Init,
    recordProjection(DragonsBreathInitial),
  }

  action doDiscoverFlameBladeHeldObject = all {
    scenarioOutcome == Init,
    recordProjection(FlameBladeHeldObject),
  }

  action doDiscoverFlamingSphereHazard = all {
    scenarioOutcome == Init,
    recordProjection(FlamingSphereHazard),
  }

  action doDiscoverHeatMetalObjectContact = all {
    scenarioOutcome == Init,
    recordProjection(HeatMetalObjectContact),
  }

  action doDiscoverMoonbeamMovableZone = all {
    scenarioOutcome == Init,
    recordProjection(MoonbeamMovableZone),
  }

  action doDiscoverRayOfEnfeeblementSaveGate = all {
    scenarioOutcome == Init,
    recordProjection(RayOfEnfeeblementSaveGate),
  }

  action doDiscoverScorchingRayAttackSequence = all {
    scenarioOutcome == Init,
    recordProjection(ScorchingRayAttackSequence),
  }

  action doDiscoverShatterSaveGatedDamage = all {
    scenarioOutcome == Init,
    recordProjection(ShatterSaveGatedDamage),
  }

  action doDiscoverSpiritualWeaponAttackProxy = all {
    scenarioOutcome == Init,
    recordProjection(SpiritualWeaponAttackProxy),
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
