// -*- mode: Bluespec; -*-

module battleRuntimeConditionSavingThrowSelectedIdentityMbt {
  var qTargetBlinded: bool
  var qTargetDeafened: bool
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
    targetDeafened: bool,
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
    qTargetDeafened' = targetDeafened,
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

  action init = recordProjection(false, false, false, false, false, false, false, false, true, 0, 0, "init")

  action doResolveBlindnessDeafnessBlindedSavingThrow = all {
    qLastResult == "init",
    recordProjection(true, false, false, false, false, false, false, false, false, 0, 1, "resolved"),
  }

  action doResolveBlindnessDeafnessDeafenedSavingThrow = all {
    qLastResult == "init",
    recordProjection(false, true, false, false, false, false, false, false, false, 0, 1, "resolved"),
  }

  action doResolveColorSprayFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(true, false, false, false, false, false, false, false, false, 1, 0, "resolved"),
  }

  action doResolveEntangleFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(false, false, true, false, false, false, false, true, false, 1, 0, "resolved"),
  }

  action doResolveHoldPersonFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(false, false, false, true, true, false, false, true, false, 0, 1, "resolved"),
  }

  action doResolveHoldPersonRepeatSavingThrowSuccess = all {
    qLastResult == "init",
    recordProjection(false, false, false, false, false, false, false, false, true, 0, 1, "resolved"),
  }

  action doResolveHideousLaughterRepeatSavingThrowSuccess = all {
    qLastResult == "init",
    recordProjection(false, false, false, false, false, false, false, false, true, 1, 0, "resolved"),
  }

  action doResolveSleepRepeatSavingThrowFailure = all {
    qLastResult == "init",
    recordProjection(false, false, false, false, true, true, true, true, true, 1, 0, "resolved"),
  }

  action step = any {
    doResolveBlindnessDeafnessBlindedSavingThrow,
    doResolveBlindnessDeafnessDeafenedSavingThrow,
    doResolveColorSprayFailedSavingThrow,
    doResolveEntangleFailedSavingThrow,
    doResolveHoldPersonFailedSavingThrow,
    doResolveHoldPersonRepeatSavingThrowSuccess,
    doResolveHideousLaughterRepeatSavingThrowSuccess,
    doResolveSleepRepeatSavingThrowFailure,
  }
}
