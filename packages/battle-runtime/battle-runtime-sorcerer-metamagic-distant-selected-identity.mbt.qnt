// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicDistantSelectedIdentity {
  var qSorceryPointsRemaining: int
  var qLightEmitterCount: int
  var qBrightRadiusFeet: int
  var qDimAdditionalFeet: int
  var qLastResult: str

  pure def initialProjection = {
    sorceryPointsRemaining: 2,
    lightEmitterCount: 0,
    brightRadiusFeet: 0,
    dimAdditionalFeet: 0,
    lastResult: "init",
  }

  action recordProjection(
    sorceryPointsRemaining: int,
    lightEmitterCount: int,
    brightRadiusFeet: int,
    dimAdditionalFeet: int,
    lastResult: str,
  ): bool = all {
    qSorceryPointsRemaining' = sorceryPointsRemaining,
    qLightEmitterCount' = lightEmitterCount,
    qBrightRadiusFeet' = brightRadiusFeet,
    qDimAdditionalFeet' = dimAdditionalFeet,
    qLastResult' = lastResult,
  }

  action init = recordProjection(2, 0, 0, 0, "init")

  action doResolveDistantObjectLight = all {
    qLastResult == "init",
    recordProjection(1, 1, 20, 20, "distantObjectLight")
  }

  action step = any {
    doResolveDistantObjectLight,
  }
}
