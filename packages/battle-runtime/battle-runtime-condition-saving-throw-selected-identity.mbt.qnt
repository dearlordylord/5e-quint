// -*- mode: Bluespec; -*-

module battleRuntimeConditionSavingThrowSelectedIdentityMbt {
  var qTargetCharmed: bool
  var qTargetBlinded: bool
  var qTargetDeafened: bool
  var qTargetRestrained: bool
  var qTargetParalyzed: bool
  var qTargetIncapacitated: bool
  var qTargetUnconscious: bool
  var qTargetProne: bool
  var qCasterConcentrating: bool
  var qActionAvailable: bool
  var qTargetWalkSpeedFeet: int
  var qFirstLevelSlotsExpended: int
  var qSecondLevelSlotsExpended: int
  var qThirdLevelSlotsExpended: int
  var qLastResult: str

  action recordProjection(
    targetCharmed: bool,
    targetBlinded: bool,
    targetDeafened: bool,
    targetRestrained: bool,
    targetParalyzed: bool,
    targetIncapacitated: bool,
    targetUnconscious: bool,
    targetProne: bool,
    casterConcentrating: bool,
    actionAvailable: bool,
    targetWalkSpeedFeet: int,
    firstLevelSlotsExpended: int,
    secondLevelSlotsExpended: int,
    thirdLevelSlotsExpended: int,
    lastResult: str,
  ): bool = all {
    qTargetCharmed' = targetCharmed,
    qTargetBlinded' = targetBlinded,
    qTargetDeafened' = targetDeafened,
    qTargetRestrained' = targetRestrained,
    qTargetParalyzed' = targetParalyzed,
    qTargetIncapacitated' = targetIncapacitated,
    qTargetUnconscious' = targetUnconscious,
    qTargetProne' = targetProne,
    qCasterConcentrating' = casterConcentrating,
    qActionAvailable' = actionAvailable,
    qTargetWalkSpeedFeet' = targetWalkSpeedFeet,
    qFirstLevelSlotsExpended' = firstLevelSlotsExpended,
    qSecondLevelSlotsExpended' = secondLevelSlotsExpended,
    qThirdLevelSlotsExpended' = thirdLevelSlotsExpended,
    qLastResult' = lastResult,
  }

  action init = recordProjection(false, false, false, false, false, false, false, false, false, true, 30, 0, 0, 0, "init")

  action doResolveBlindnessDeafnessBlindedSavingThrow = all {
    qLastResult == "init",
    recordProjection(false, true, false, false, false, false, false, false, false, false, 30, 0, 1, 0, "resolved"),
  }

  action doResolveBlindnessDeafnessDeafenedSavingThrow = all {
    qLastResult == "init",
    recordProjection(false, false, true, false, false, false, false, false, false, false, 30, 0, 1, 0, "resolved"),
  }

  action doResolveColorSprayFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(false, true, false, false, false, false, false, false, false, false, 30, 1, 0, 0, "resolved"),
  }

  action doResolveEntangleFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(false, false, false, true, false, false, false, false, true, false, 0, 1, 0, 0, "resolved"),
  }

  action doResolveHoldPersonFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(false, false, false, false, true, true, false, false, true, false, 0, 0, 1, 0, "resolved"),
  }

  action doResolveHoldPersonRepeatSavingThrowSuccess = all {
    qLastResult == "init",
    recordProjection(false, false, false, false, false, false, false, false, false, true, 30, 0, 1, 0, "resolved"),
  }

  action doResolveHideousLaughterRepeatSavingThrowSuccess = all {
    qLastResult == "init",
    recordProjection(false, false, false, false, false, false, false, false, false, true, 30, 1, 0, 0, "resolved"),
  }

  action doResolveHypnoticPatternFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(true, false, false, false, false, true, false, false, true, false, 0, 0, 0, 1, "resolved"),
  }

  action doResolveSleepRepeatSavingThrowFailure = all {
    qLastResult == "init",
    recordProjection(false, false, false, false, false, true, true, true, true, true, 0, 1, 0, 0, "resolved"),
  }

  action step = any {
    doResolveBlindnessDeafnessBlindedSavingThrow,
    doResolveBlindnessDeafnessDeafenedSavingThrow,
    doResolveColorSprayFailedSavingThrow,
    doResolveEntangleFailedSavingThrow,
    doResolveHoldPersonFailedSavingThrow,
    doResolveHoldPersonRepeatSavingThrowSuccess,
    doResolveHideousLaughterRepeatSavingThrowSuccess,
    doResolveHypnoticPatternFailedSavingThrow,
    doResolveSleepRepeatSavingThrowFailure,
  }
}
