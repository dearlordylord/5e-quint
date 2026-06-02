// -*- mode: Bluespec; -*-

module battleRuntimeExtraAttackMbt {
  var qExtraAttackAdditionalAttacks: int
  var qSkeletonHp: int
  var qActionAvailable: bool
  var qExtraAttackSlotsAvailable: int
  var qMovementSpentFeet: int
  var qLastResult: str
  var qLastInvalidReason: str
  var qTurnEnded: bool

  action recordProjection(
    extraAttackAdditionalAttacks: int,
    skeletonHp: int,
    actionAvailable: bool,
    extraAttackSlotsAvailable: int,
    movementSpentFeet: int,
    lastResult: str,
    lastInvalidReason: str,
    turnEnded: bool,
  ): bool = all {
    qExtraAttackAdditionalAttacks' = extraAttackAdditionalAttacks,
    qSkeletonHp' = skeletonHp,
    qActionAvailable' = actionAvailable,
    qExtraAttackSlotsAvailable' = extraAttackSlotsAvailable,
    qMovementSpentFeet' = movementSpentFeet,
    qLastResult' = lastResult,
    qLastInvalidReason' = lastInvalidReason,
    qTurnEnded' = turnEnded,
  }

  action initOneAdditionalAttack =
    recordProjection(1, 13, true, 0, 0, "init", "", false)

  action initTwoAdditionalAttacks =
    recordProjection(2, 13, true, 0, 0, "init", "", false)

  action initThreeAdditionalAttacks =
    recordProjection(3, 13, true, 0, 0, "init", "", false)

  action init = initOneAdditionalAttack

  action doResolveFirstExtraAttackMiss = all {
    qActionAvailable,
    qExtraAttackSlotsAvailable == 0,
    qExtraAttackAdditionalAttacks.in(Set(1, 2, 3)),
    not(qTurnEnded),
    recordProjection(
      qExtraAttackAdditionalAttacks,
      qSkeletonHp,
      false,
      qExtraAttackAdditionalAttacks,
      qMovementSpentFeet,
      "resolved",
      "",
      false
    ),
  }

  action doMoveBetweenExtraAttackSlots = all {
    not(qActionAvailable),
    qExtraAttackSlotsAvailable > 0,
    qMovementSpentFeet == 0,
    not(qTurnEnded),
    recordProjection(
      qExtraAttackAdditionalAttacks,
      qSkeletonHp,
      false,
      qExtraAttackSlotsAvailable,
      5,
      "resolved",
      "",
      false
    ),
  }

  action doResolveSecondExtraAttackMiss = all {
    not(qActionAvailable),
    qExtraAttackSlotsAvailable > 0,
    qMovementSpentFeet == 5,
    not(qTurnEnded),
    recordProjection(
      qExtraAttackAdditionalAttacks,
      qSkeletonHp,
      false,
      qExtraAttackSlotsAvailable - 1,
      qMovementSpentFeet,
      "resolved",
      "",
      false
    ),
  }

  action doRejectThirdExtraAttack = all {
    not(qActionAvailable),
    qExtraAttackSlotsAvailable == 0,
    not(qTurnEnded),
    recordProjection(
      qExtraAttackAdditionalAttacks,
      qSkeletonHp,
      false,
      0,
      qMovementSpentFeet,
      "invalid",
      "staleSubject",
      false
    ),
  }

  action doEndTurnClosesExtraAttackSlot = all {
    not(qActionAvailable),
    qExtraAttackSlotsAvailable > 0,
    not(qTurnEnded),
    recordProjection(
      qExtraAttackAdditionalAttacks,
      qSkeletonHp,
      true,
      0,
      qMovementSpentFeet,
      "resolved",
      "",
      true
    ),
  }

  action step = any {
    doResolveFirstExtraAttackMiss,
    doMoveBetweenExtraAttackSlots,
    doResolveSecondExtraAttackMiss,
    doRejectThirdExtraAttack,
    doEndTurnClosesExtraAttackSlot,
  }

  action stepSpendAllSlots = any {
    doResolveFirstExtraAttackMiss,
    doMoveBetweenExtraAttackSlots,
    doResolveSecondExtraAttackMiss,
    doRejectThirdExtraAttack,
  }

  action stepEndTurnAfterOpeningSlots = any {
    doResolveFirstExtraAttackMiss,
    doEndTurnClosesExtraAttackSlot,
  }
}
