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

  pure def qLastResult: Level2DamageSpellSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def level2DamageSpellSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: Level2DamageSpellSelectedIdentityScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: Level2DamageSpellSelectedIdentityScenarioOutcome): bool = all {
    qState' = {
      qScenarioOutcome: lastResult,
      protocol: level2DamageSpellSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection(Init)

  action doDiscoverAcidArrowAttackTiming = all {
    qLastResult == Init,
    recordProjection(AcidArrowAttackTiming),
  }

  action doDiscoverDragonsBreathInitial = all {
    qLastResult == Init,
    recordProjection(DragonsBreathInitial),
  }

  action doDiscoverFlameBladeHeldObject = all {
    qLastResult == Init,
    recordProjection(FlameBladeHeldObject),
  }

  action doDiscoverFlamingSphereHazard = all {
    qLastResult == Init,
    recordProjection(FlamingSphereHazard),
  }

  action doDiscoverHeatMetalObjectContact = all {
    qLastResult == Init,
    recordProjection(HeatMetalObjectContact),
  }

  action doDiscoverMoonbeamMovableZone = all {
    qLastResult == Init,
    recordProjection(MoonbeamMovableZone),
  }

  action doDiscoverRayOfEnfeeblementSaveGate = all {
    qLastResult == Init,
    recordProjection(RayOfEnfeeblementSaveGate),
  }

  action doDiscoverScorchingRayAttackSequence = all {
    qLastResult == Init,
    recordProjection(ScorchingRayAttackSequence),
  }

  action doDiscoverShatterSaveGatedDamage = all {
    qLastResult == Init,
    recordProjection(ShatterSaveGatedDamage),
  }

  action doDiscoverSpiritualWeaponAttackProxy = all {
    qLastResult == Init,
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
