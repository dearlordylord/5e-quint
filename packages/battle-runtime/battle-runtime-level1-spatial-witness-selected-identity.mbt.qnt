// -*- mode: Bluespec; -*-

module battleRuntimeLevel1SpatialWitnessSelectedIdentityMbt {
  var qLightEmitterCount: int
  var qDimLightEmitterCount: int
  var qRetainedLightIdentityCount: int
  var qProjectedIllumination: str
  var qOrdinarySightObscurement: str
  var qDarkvisionSightObscurement: str
  var qMismatchedWitnessIllumination: str
  var qObscurementZoneCount: int
  var qCasterConcentrating: bool
  var qMagicActionAvailable: bool
  var qBonusActionAvailable: bool
  var qLastResult: str

  action recordProjection(
    lightEmitterCount: int,
    dimLightEmitterCount: int,
    retainedLightIdentityCount: int,
    projectedIllumination: str,
    ordinarySightObscurement: str,
    darkvisionSightObscurement: str,
    mismatchedWitnessIllumination: str,
    obscurementZoneCount: int,
    casterConcentrating: bool,
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    lastResult: str,
  ): bool = all {
    qLightEmitterCount' = lightEmitterCount,
    qDimLightEmitterCount' = dimLightEmitterCount,
    qRetainedLightIdentityCount' = retainedLightIdentityCount,
    qProjectedIllumination' = projectedIllumination,
    qOrdinarySightObscurement' = ordinarySightObscurement,
    qDarkvisionSightObscurement' = darkvisionSightObscurement,
    qMismatchedWitnessIllumination' = mismatchedWitnessIllumination,
    qObscurementZoneCount' = obscurementZoneCount,
    qCasterConcentrating' = casterConcentrating,
    qMagicActionAvailable' = magicActionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qLastResult' = lastResult,
  }

  action init =
    recordProjection(
      0, 0, 0,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, true, true,
      "init",
    )

  action doDancingLightsMovableDimLight = all {
    qLastResult == "init",
    recordProjection(
      2, 2, 2,
      "dimLight", "lightlyObscured", "unobscured", "darkness",
      0, true, false, false,
      "dancingLightsMovableDimLight",
    ),
  }

  action step = any {
    doDancingLightsMovableDimLight,
  }
}
