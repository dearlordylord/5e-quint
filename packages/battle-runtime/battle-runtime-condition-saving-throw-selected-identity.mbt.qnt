// -*- mode: Bluespec; -*-

module battleRuntimeConditionSavingThrowSelectedIdentityMbt {
  var qTargetBlinded: bool
  var qTargetRestrained: bool
  var qTargetIncapacitated: bool
  var qTargetUnconscious: bool
  var qTargetProne: bool
  var qCasterConcentrating: bool
  var qActionAvailable: bool
  var qFirstLevelSlotsExpended: int
  var qLastResult: str

  action recordProjection(
    targetBlinded: bool,
    targetRestrained: bool,
    targetIncapacitated: bool,
    targetUnconscious: bool,
    targetProne: bool,
    casterConcentrating: bool,
    actionAvailable: bool,
    firstLevelSlotsExpended: int,
    lastResult: str,
  ): bool = all {
    qTargetBlinded' = targetBlinded,
    qTargetRestrained' = targetRestrained,
    qTargetIncapacitated' = targetIncapacitated,
    qTargetUnconscious' = targetUnconscious,
    qTargetProne' = targetProne,
    qCasterConcentrating' = casterConcentrating,
    qActionAvailable' = actionAvailable,
    qFirstLevelSlotsExpended' = firstLevelSlotsExpended,
    qLastResult' = lastResult,
  }

  action init = recordProjection(false, false, false, false, false, false, true, 0, "init")

  action doResolveColorSprayFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(true, false, false, false, false, false, false, 1, "resolved"),
  }

  action doResolveEntangleFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(false, true, false, false, false, true, false, 1, "resolved"),
  }

  action doResolveHideousLaughterRepeatSavingThrowSuccess = all {
    qLastResult == "init",
    recordProjection(false, false, false, false, false, false, true, 1, "resolved"),
  }

  action doResolveSleepRepeatSavingThrowFailure = all {
    qLastResult == "init",
    recordProjection(false, false, true, true, true, true, true, 1, "resolved"),
  }

  action step = any {
    doResolveColorSprayFailedSavingThrow,
    doResolveEntangleFailedSavingThrow,
    doResolveHideousLaughterRepeatSavingThrowSuccess,
    doResolveSleepRepeatSavingThrowFailure,
  }
}
