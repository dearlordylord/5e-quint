// -*- mode: Bluespec; -*-

module battleRuntimeConditionSavingThrowSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | ConditionSavingThrow

  type ConditionSavingThrowSelectedIdentityWitnessState = {
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
    protocol: WitnessProtocol[Hole],
  }

  var qState: ConditionSavingThrowSelectedIdentityWitnessState

  pure val conditionSavingThrowInitialProtocol: WitnessProtocol[Hole] =
    witnessInit(ConditionSavingThrow)
  pure val conditionSavingThrowResolvedProtocol: WitnessProtocol[Hole] =
    witnessResolved(ConditionSavingThrow)
  pure def conditionSavingThrowCanResolve: bool =
    qState.protocol.result == WInit

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
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      targetCharmed: targetCharmed,
      targetBlinded: targetBlinded,
      targetDeafened: targetDeafened,
      targetRestrained: targetRestrained,
      targetParalyzed: targetParalyzed,
      targetIncapacitated: targetIncapacitated,
      targetUnconscious: targetUnconscious,
      targetProne: targetProne,
      casterConcentrating: casterConcentrating,
      actionAvailable: actionAvailable,
      targetWalkSpeedFeet: targetWalkSpeedFeet,
      firstLevelSlotsExpended: firstLevelSlotsExpended,
      secondLevelSlotsExpended: secondLevelSlotsExpended,
      thirdLevelSlotsExpended: thirdLevelSlotsExpended,
      protocol: protocol,
    },
  }

  action init = recordProjection(false, false, false, false, false, false, false, false, false, true, 30, 0, 0, 0, conditionSavingThrowInitialProtocol)

  action doResolveBlindnessDeafnessBlindedSavingThrow = all {
    conditionSavingThrowCanResolve,
    recordProjection(false, true, false, false, false, false, false, false, false, false, 30, 0, 1, 0, conditionSavingThrowResolvedProtocol),
  }

  action doResolveBlindnessDeafnessDeafenedSavingThrow = all {
    conditionSavingThrowCanResolve,
    recordProjection(false, false, true, false, false, false, false, false, false, false, 30, 0, 1, 0, conditionSavingThrowResolvedProtocol),
  }

  action doResolveColorSprayFailedSavingThrow = all {
    conditionSavingThrowCanResolve,
    recordProjection(false, true, false, false, false, false, false, false, false, false, 30, 1, 0, 0, conditionSavingThrowResolvedProtocol),
  }

  action doResolveEntangleFailedSavingThrow = all {
    conditionSavingThrowCanResolve,
    recordProjection(false, false, false, true, false, false, false, false, true, false, 0, 1, 0, 0, conditionSavingThrowResolvedProtocol),
  }

  action doResolveHoldPersonFailedSavingThrow = all {
    conditionSavingThrowCanResolve,
    recordProjection(false, false, false, false, true, true, false, false, true, false, 0, 0, 1, 0, conditionSavingThrowResolvedProtocol),
  }

  action doResolveHoldPersonRepeatSavingThrowSuccess = all {
    conditionSavingThrowCanResolve,
    recordProjection(false, false, false, false, false, false, false, false, false, true, 30, 0, 1, 0, conditionSavingThrowResolvedProtocol),
  }

  action doResolveHideousLaughterRepeatSavingThrowSuccess = all {
    conditionSavingThrowCanResolve,
    recordProjection(false, false, false, false, false, false, false, false, false, true, 30, 1, 0, 0, conditionSavingThrowResolvedProtocol),
  }

  action doResolveHypnoticPatternFailedSavingThrow = all {
    conditionSavingThrowCanResolve,
    recordProjection(true, false, false, false, false, true, false, false, true, false, 0, 0, 0, 1, conditionSavingThrowResolvedProtocol),
  }

  action doResolveSleepRepeatSavingThrowFailure = all {
    conditionSavingThrowCanResolve,
    recordProjection(false, false, false, false, false, true, true, true, true, true, 0, 1, 0, 0, conditionSavingThrowResolvedProtocol),
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
