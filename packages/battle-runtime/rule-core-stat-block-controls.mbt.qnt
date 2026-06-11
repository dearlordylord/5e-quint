// -*- mode: Bluespec; -*-

module ruleCoreStatBlockControlsMbt {
  import statBlockControls.* from "../shared-algebras/proofs/rule-core/stat-block-controls"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Fixture bounds:
  // - one Stat Block actor with a two-dispatch Multiattack and one target;
  // - dispatch attacks are resolved as misses so attack damage, reactions, and
  //   limited-use resource branches stay outside this first QMBT6 tracer;
  // - Legendary Actions are intentionally excluded for a later tracer.

  var qAttackActionAvailable: bool
  var qBonusActionAvailable: bool
  var qPendingPrimaryDispatches: int
  var qPendingSecondaryDispatches: int
  var qMovementSpentFeet: int
  var qMovementRemainingFeet: int
  var qMultiattackContinuationOpen: bool
  var qProtocol: WitnessProtocol[str]

  pure def qHoles: Set[str] = qProtocol.holes

  pure def witnessInvalidReasonForProjection(reason: str): WitnessInvalidReason =
    if (reason == "staleSubject") WStaleSubject else WInvalidFill

  pure def witnessProtocolForProjection(
    holes: Set[str],
    result: str,
    invalidReason: str,
  ): WitnessProtocol[str] =
    if (result == "init") witnessInit("Movement")
    else if (result == "invalid")
      witnessInvalidWithHoles(holes, witnessInvalidReasonForProjection(invalidReason))
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved("Movement")

  pure def initialMovementRemainingFeet: int = 30
  pure def interleavedMovementFeet: int = 5

  pure def qDispatches: StatBlockMultiattackDispatches = {
    primaryRemaining: qPendingPrimaryDispatches,
    secondaryRemaining: qPendingSecondaryDispatches,
  }

  action recordProjection(
    attackActionAvailable: bool,
    bonusActionAvailable: bool,
    pendingPrimaryDispatches: int,
    pendingSecondaryDispatches: int,
    movementSpentFeet: int,
    movementRemainingFeet: int,
    multiattackContinuationOpen: bool,
    holes: Set[str],
    result: str,
    invalidReason: str,
  ): bool = all {
    qAttackActionAvailable' = attackActionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qPendingPrimaryDispatches' = pendingPrimaryDispatches,
    qPendingSecondaryDispatches' = pendingSecondaryDispatches,
    qMovementSpentFeet' = movementSpentFeet,
    qMovementRemainingFeet' = movementRemainingFeet,
    qMultiattackContinuationOpen' = multiattackContinuationOpen,
    qProtocol' = witnessProtocolForProjection(holes, result, invalidReason),
  }

  action init = recordProjection(
    true, true, 0, 0, 0, initialMovementRemainingFeet, false,
    Set(), "init", "none"
  )

  action doStartMultiattack = {
    val profile = {
      firstAttackName: PrimaryStatBlockAttack,
      primaryAttackCount: 2,
      secondaryAttackCount: 1,
    }
    val started = startStatBlockMultiattack(initialStatBlockControlState, profile)
    all {
      qHoles == Set(),
      qAttackActionAvailable,
      not(qMultiattackContinuationOpen),
      recordProjection(
        false,
        true,
        started.multiattack.primaryRemaining,
        started.multiattack.secondaryRemaining,
        qMovementSpentFeet,
        qMovementRemainingFeet,
        statBlockMultiattackContinuationOpen(started),
        Set(),
        "resolved",
        "none"
      ),
    }
  }

  action doMoveDuringDispatch = all {
    qHoles == Set(),
    qMultiattackContinuationOpen,
    qMovementRemainingFeet >= interleavedMovementFeet,
    multiattackDispatchSubjectPermitted(
      initialStatBlockControlState.with("multiattack", qDispatches),
      StatBlockMovementSubject
    ),
    recordProjection(
      qAttackActionAvailable,
      qBonusActionAvailable,
      qPendingPrimaryDispatches,
      qPendingSecondaryDispatches,
      qMovementSpentFeet + interleavedMovementFeet,
      qMovementRemainingFeet - interleavedMovementFeet,
      qMultiattackContinuationOpen,
      Set(),
      "resolved",
      "none"
    ),
  }

  action doRejectBonusActionDuringDispatch = all {
    qHoles == Set(),
    qMultiattackContinuationOpen,
    not(multiattackDispatchSubjectPermitted(
      initialStatBlockControlState.with("multiattack", qDispatches),
      StatBlockBonusActionSubject
    )),
    recordProjection(
      qAttackActionAvailable,
      qBonusActionAvailable,
      qPendingPrimaryDispatches,
      qPendingSecondaryDispatches,
      qMovementSpentFeet,
      qMovementRemainingFeet,
      qMultiattackContinuationOpen,
      Set(),
      "invalid",
      "staleSubject"
    ),
  }

  action doRejectOrdinaryActionDuringDispatch = all {
    qHoles == Set(),
    qMultiattackContinuationOpen,
    not(multiattackDispatchSubjectPermitted(
      initialStatBlockControlState.with("multiattack", qDispatches),
      StatBlockOrdinaryActionSubject
    )),
    recordProjection(
      qAttackActionAvailable,
      qBonusActionAvailable,
      qPendingPrimaryDispatches,
      qPendingSecondaryDispatches,
      qMovementSpentFeet,
      qMovementRemainingFeet,
      qMultiattackContinuationOpen,
      Set(),
      "invalid",
      "staleSubject"
    ),
  }

  action doResolvePrimaryDispatch = {
    val dispatched = resolveStatBlockMultiattackDispatch(
      initialStatBlockControlState.with("multiattack", qDispatches),
      PrimaryStatBlockAttack
    )
    all {
      qHoles == Set(),
      qMultiattackContinuationOpen,
      qPendingPrimaryDispatches > 0,
      recordProjection(
        qAttackActionAvailable,
        qBonusActionAvailable,
        dispatched.multiattack.primaryRemaining,
        dispatched.multiattack.secondaryRemaining,
        qMovementSpentFeet,
        qMovementRemainingFeet,
        statBlockMultiattackContinuationOpen(dispatched),
        Set(),
        "resolved",
        "none"
      ),
    }
  }

  action doResolveSecondaryDispatch = {
    val dispatched = resolveStatBlockMultiattackDispatch(
      initialStatBlockControlState.with("multiattack", qDispatches),
      SecondaryStatBlockAttack
    )
    all {
      qHoles == Set(),
      qMultiattackContinuationOpen,
      qPendingSecondaryDispatches > 0,
      recordProjection(
        qAttackActionAvailable,
        qBonusActionAvailable,
        dispatched.multiattack.primaryRemaining,
        dispatched.multiattack.secondaryRemaining,
        qMovementSpentFeet,
        qMovementRemainingFeet,
        statBlockMultiattackContinuationOpen(dispatched),
        Set(),
        "resolved",
        "none"
      ),
    }
  }

  action doEndTurnClosesDispatches = {
    val ended = endStatBlockTurn(
      initialStatBlockControlState.with("multiattack", qDispatches)
    )
    all {
      qHoles == Set(),
      qMultiattackContinuationOpen,
      recordProjection(
        true,
        true,
        ended.multiattack.primaryRemaining,
        ended.multiattack.secondaryRemaining,
        0,
        initialMovementRemainingFeet,
        statBlockMultiattackContinuationOpen(ended),
        Set(),
        "resolved",
        "none"
      ),
    }
  }

  action step = any {
    doStartMultiattack,
    doMoveDuringDispatch,
    doRejectBonusActionDuringDispatch,
    doRejectOrdinaryActionDuringDispatch,
    doResolvePrimaryDispatch,
    doResolveSecondaryDispatch,
    doEndTurnClosesDispatches,
  }
}
