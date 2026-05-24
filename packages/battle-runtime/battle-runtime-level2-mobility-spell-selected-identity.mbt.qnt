// -*- mode: Bluespec; -*-

module battleRuntimeLevel2MobilitySpellSelectedIdentityMbt {
  var qLastResult: str

  action recordProjection(lastResult: str): bool = all {
    qLastResult' = lastResult,
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
