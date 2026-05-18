// -*- mode: Bluespec; -*-

module battleRuntimeExtraAttackMbt {
  import battleRuntime.* from "./battle-runtime"
  import battleRuntimeModel.* from "./battle-runtime-model"

  var qSkeletonHp: int
  var qActionAvailable: bool
  var qExtraAttackSlotsAvailable: int
  var qMovementSpentFeet: int
  var qLastResult: str
  var qLastInvalidReason: str
  var qTurnEnded: bool

  action recordProjection(
    skeletonHp: int,
    actionAvailable: bool,
    extraAttackSlotsAvailable: int,
    movementSpentFeet: int,
    lastResult: str,
    lastInvalidReason: str,
    turnEnded: bool,
  ): bool = all {
    qSkeletonHp' = skeletonHp,
    qActionAvailable' = actionAvailable,
    qExtraAttackSlotsAvailable' = extraAttackSlotsAvailable,
    qMovementSpentFeet' = movementSpentFeet,
    qLastResult' = lastResult,
    qLastInvalidReason' = lastInvalidReason,
    qTurnEnded' = turnEnded,
  }

  action init = recordProjection(13, true, 0, 0, "init", "", false)

  action doResolveFirstExtraAttackMiss = all {
    qActionAvailable,
    qExtraAttackSlotsAvailable == 0,
    not(qTurnEnded),
    recordProjection(qSkeletonHp, false, 1, qMovementSpentFeet, "resolved", "", false),
  }

  action doMoveBetweenExtraAttackSlots = all {
    not(qActionAvailable),
    qExtraAttackSlotsAvailable == 1,
    qMovementSpentFeet == 0,
    not(qTurnEnded),
    recordProjection(qSkeletonHp, false, 1, 5, "resolved", "", false),
  }

  action doResolveSecondExtraAttackMiss = all {
    not(qActionAvailable),
    qExtraAttackSlotsAvailable == 1,
    not(qTurnEnded),
    recordProjection(qSkeletonHp, false, 0, qMovementSpentFeet, "resolved", "", false),
  }

  action doRejectThirdExtraAttack = all {
    not(qActionAvailable),
    qExtraAttackSlotsAvailable == 0,
    not(qTurnEnded),
    recordProjection(qSkeletonHp, false, 0, qMovementSpentFeet, "invalid", "staleSubject", false),
  }

  action doEndTurnClosesExtraAttackSlot = all {
    not(qActionAvailable),
    qExtraAttackSlotsAvailable == 1,
    not(qTurnEnded),
    recordProjection(qSkeletonHp, true, 0, qMovementSpentFeet, "resolved", "", true),
  }

  action step = any {
    doResolveFirstExtraAttackMiss,
    doMoveBetweenExtraAttackSlots,
    doResolveSecondExtraAttackMiss,
    doRejectThirdExtraAttack,
    doEndTurnClosesExtraAttackSlot,
  }
}
