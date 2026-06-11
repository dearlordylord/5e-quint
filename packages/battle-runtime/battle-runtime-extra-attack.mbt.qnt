// -*- mode: Bluespec; -*-

module battleRuntimeExtraAttackMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type ExtraAttackWitnessState = {
    qExtraAttackAdditionalAttacks: int,
    qSkeletonHp: int,
    qActionAvailable: bool,
    qExtraAttackSlotsAvailable: int,
    qMovementSpentFeet: int,
    qTurnEnded: bool,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: ExtraAttackWitnessState

  pure def qExtraAttackAdditionalAttacks: int = qState.qExtraAttackAdditionalAttacks
  pure def qSkeletonHp: int = qState.qSkeletonHp
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qExtraAttackSlotsAvailable: int = qState.qExtraAttackSlotsAvailable
  pure def qMovementSpentFeet: int = qState.qMovementSpentFeet
  pure def qTurnEnded: bool = qState.qTurnEnded

  action recordProjection(
    extraAttackAdditionalAttacks: int,
    skeletonHp: int,
    actionAvailable: bool,
    extraAttackSlotsAvailable: int,
    movementSpentFeet: int,
    protocol: WitnessProtocol[WitnessHole],
    turnEnded: bool,
  ): bool = all {
    qState' = {
      qExtraAttackAdditionalAttacks: extraAttackAdditionalAttacks,
      qSkeletonHp: skeletonHp,
      qActionAvailable: actionAvailable,
      qExtraAttackSlotsAvailable: extraAttackSlotsAvailable,
      qMovementSpentFeet: movementSpentFeet,
      qTurnEnded: turnEnded,
      protocol: protocol,
    },
  }

  // Count variants stay enumerated because the TS harness runs each as a
  // distinct init action for count-specific entrypoints, not a fill-value pick.
  action initOneAdditionalAttack =
    recordProjection(1, 13, true, 0, 0, witnessInit(WitnessProtocolHole), false)

  action initTwoAdditionalAttacks =
    recordProjection(2, 13, true, 0, 0, witnessInit(WitnessProtocolHole), false)

  action initThreeAdditionalAttacks =
    recordProjection(3, 13, true, 0, 0, witnessInit(WitnessProtocolHole), false)

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
      witnessResolved(WitnessProtocolHole),
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
      witnessResolved(WitnessProtocolHole),
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
      witnessResolved(WitnessProtocolHole),
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
      witnessInvalid(WitnessProtocolHole, WStaleSubject),
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
      witnessResolved(WitnessProtocolHole),
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
