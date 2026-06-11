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
    qScenarioResult: str,
    qScenarioInvalidReason: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: ExtraAttackWitnessState

  pure def qExtraAttackAdditionalAttacks: int = qState.qExtraAttackAdditionalAttacks
  pure def qSkeletonHp: int = qState.qSkeletonHp
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qExtraAttackSlotsAvailable: int = qState.qExtraAttackSlotsAvailable
  pure def qMovementSpentFeet: int = qState.qMovementSpentFeet
  pure def qTurnEnded: bool = qState.qTurnEnded
  pure def qLastResult: str = qState.qScenarioResult
  pure def qLastInvalidReason: str = qState.qScenarioInvalidReason

  pure def extraAttackProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (scenarioInvalidReason == "staleSubject") witnessInvalid(WitnessProtocolHole, WStaleSubject)
    else if (scenarioInvalidReason == "wrongActor") witnessInvalid(WitnessProtocolHole, WWrongActor)
    else if (scenarioInvalidReason == "missingCombatant") witnessInvalid(WitnessProtocolHole, WMissingCombatant)
    else if (scenarioInvalidReason == "unsupportedSubject") witnessInvalid(WitnessProtocolHole, WUnsupportedSubject)
    else if (scenarioInvalidReason == "unsupportedActOption") witnessInvalid(WitnessProtocolHole, WUnsupportedActOption)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


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
    qState' = {
      qExtraAttackAdditionalAttacks: extraAttackAdditionalAttacks,
      qSkeletonHp: skeletonHp,
      qActionAvailable: actionAvailable,
      qExtraAttackSlotsAvailable: extraAttackSlotsAvailable,
      qMovementSpentFeet: movementSpentFeet,
      qTurnEnded: turnEnded,
      qScenarioResult: lastResult,
      qScenarioInvalidReason: lastInvalidReason,
      protocol: extraAttackProtocolForProjection(Set(), lastResult, lastInvalidReason),
    },
  }

  // Count variants stay enumerated because the TS harness runs each as a
  // distinct init action for count-specific entrypoints, not a fill-value pick.
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
