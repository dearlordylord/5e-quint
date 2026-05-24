// -*- mode: Bluespec; -*-

module battleRuntimeLevel2DamageSpellSelectedIdentityMbt {
  var qLastResult: str

  action recordProjection(lastResult: str): bool = all {
    qLastResult' = lastResult,
  }

  action init = recordProjection("init")

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
