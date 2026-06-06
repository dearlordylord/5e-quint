// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicExtendedSelectedIdentity {
  var qSorceryPointsRemaining: int
  var qDurationTicks: int
  var qConcentrationSavingThrowMode: str
  var qLastResult: str

  pure def initialProjection = {
    sorceryPointsRemaining: 2,
    durationTicks: 0,
    concentrationSavingThrowMode: "normal",
    lastResult: "init",
  }

  action recordProjection(
    sorceryPointsRemaining: int,
    durationTicks: int,
    concentrationSavingThrowMode: str,
    lastResult: str,
  ): bool = all {
    qSorceryPointsRemaining' = sorceryPointsRemaining,
    qDurationTicks' = durationTicks,
    qConcentrationSavingThrowMode' = concentrationSavingThrowMode,
    qLastResult' = lastResult,
  }

  action init = recordProjection(2, 0, "normal", "init")

  action doResolveExtendedCreatureSizeIncrease = all {
    qLastResult == "init",
    recordProjection(1, 20, "advantage", "extendedCreatureSizeIncrease")
  }

  action step = any {
    doResolveExtendedCreatureSizeIncrease,
  }
}
