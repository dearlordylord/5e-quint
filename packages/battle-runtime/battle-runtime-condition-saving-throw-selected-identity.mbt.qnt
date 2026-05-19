// -*- mode: Bluespec; -*-

module battleRuntimeConditionSavingThrowSelectedIdentityMbt {
  var qTargetBlinded: bool
  var qTargetRestrained: bool
  var qTargetParalyzed: bool
  var qTargetIncapacitated: bool
  var qTargetUnconscious: bool
  var qTargetProne: bool
  var qCasterConcentrating: bool
  var qActionAvailable: bool
  var qFirstLevelSlotsExpended: int
  var qSecondLevelSlotsExpended: int
  var qLastResult: str

  action recordProjection(
    targetBlinded: bool,
    targetRestrained: bool,
    targetParalyzed: bool,
    targetIncapacitated: bool,
    targetUnconscious: bool,
    targetProne: bool,
    casterConcentrating: bool,
    actionAvailable: bool,
    firstLevelSlotsExpended: int,
    secondLevelSlotsExpended: int,
    lastResult: str,
  ): bool = all {
    qTargetBlinded' = targetBlinded,
    qTargetRestrained' = targetRestrained,
    qTargetParalyzed' = targetParalyzed,
    qTargetIncapacitated' = targetIncapacitated,
    qTargetUnconscious' = targetUnconscious,
    qTargetProne' = targetProne,
    qCasterConcentrating' = casterConcentrating,
    qActionAvailable' = actionAvailable,
    qFirstLevelSlotsExpended' = firstLevelSlotsExpended,
    qSecondLevelSlotsExpended' = secondLevelSlotsExpended,
    qLastResult' = lastResult,
  }

  action init = recordProjection(false, false, false, false, false, false, false, true, 0, 0, "init")

  action doResolveColorSprayFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(true, false, false, false, false, false, false, false, 1, 0, "resolved"),
  }

  action doResolveEntangleFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(false, true, false, false, false, false, true, false, 1, 0, "resolved"),
  }

  action doResolveHoldPersonFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(false, false, true, true, false, false, true, false, 0, 1, "resolved"),
  }

  action doResolveHoldPersonRepeatSavingThrowSuccess = all {
    qLastResult == "init",
    recordProjection(false, false, false, false, false, false, false, true, 0, 1, "resolved"),
  }

  action doResolveHideousLaughterRepeatSavingThrowSuccess = all {
    qLastResult == "init",
    recordProjection(false, false, false, false, false, false, false, true, 1, 0, "resolved"),
  }

  action doResolveSleepRepeatSavingThrowFailure = all {
    qLastResult == "init",
    recordProjection(false, false, false, true, true, true, true, true, 1, 0, "resolved"),
  }

  action step = any {
    doResolveColorSprayFailedSavingThrow,
    doResolveEntangleFailedSavingThrow,
    doResolveHoldPersonFailedSavingThrow,
    doResolveHoldPersonRepeatSavingThrowSuccess,
    doResolveHideousLaughterRepeatSavingThrowSuccess,
    doResolveSleepRepeatSavingThrowFailure,
  }
}
