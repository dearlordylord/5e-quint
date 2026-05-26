// -*- mode: Bluespec; -*-

module battleRuntimeMindSpikeSelectedIdentityMbt {
  var qLevel2SlotsRemaining: int
  var qTargetHp: int
  var qCasterConcentratingOnMindSpike: bool
  var qMindSpikeDurationActive: bool
  var qMindSpikeDurationCleanedUp: bool
  var qTargetActiveEffectCount: int
  var qLastResult: str

  action recordProjection(
    level2SlotsRemaining: int,
    targetHp: int,
    casterConcentratingOnMindSpike: bool,
    mindSpikeDurationActive: bool,
    mindSpikeDurationCleanedUp: bool,
    targetActiveEffectCount: int,
    lastResult: str,
  ): bool = all {
    qLevel2SlotsRemaining' = level2SlotsRemaining,
    qTargetHp' = targetHp,
    qCasterConcentratingOnMindSpike' = casterConcentratingOnMindSpike,
    qMindSpikeDurationActive' = mindSpikeDurationActive,
    qMindSpikeDurationCleanedUp' = mindSpikeDurationCleanedUp,
    qTargetActiveEffectCount' = targetActiveEffectCount,
    qLastResult' = lastResult,
  }

  action init = recordProjection(1, 30, false, false, false, 0, "init")

  action doResolveMindSpikeFailedSaveConcentrationDuration = all {
    qLastResult == "init",
    recordProjection(
      0,
      18,
      true,
      true,
      true,
      0,
      "mindSpikeFailedSaveConcentrationDuration",
    ),
  }

  action doResolveMindSpikeSuccessfulSaveHalfDamage = all {
    qLastResult == "init",
    recordProjection(
      0,
      24,
      false,
      false,
      false,
      0,
      "mindSpikeSuccessfulSaveHalfDamage",
    ),
  }

  action step = any {
    doResolveMindSpikeFailedSaveConcentrationDuration,
    doResolveMindSpikeSuccessfulSaveHalfDamage,
  }
}
