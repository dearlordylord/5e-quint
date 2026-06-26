// -*- mode: Bluespec; -*-

module ruleCoreStatBlockControlsMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
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
  var qComponentRoute: List[RuleCoreComponentRouteEvent]

  pure def openHoles: Set[str] = qProtocol.holes

  pure def componentRouteEvidence: List[RuleCoreComponentRouteEvent] =
    ruleCoreComponentRoute(RuleCoreStatBlockControlOwner)

  pure def witnessProtocolForProjection(
    holes: Set[str],
    result: WitnessResult,
  ): WitnessProtocol[str] =
    witnessProtocolFromResult(holes, "Movement", result)

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
    result: WitnessResult,
  ): bool = all {
    qAttackActionAvailable' = attackActionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qPendingPrimaryDispatches' = pendingPrimaryDispatches,
    qPendingSecondaryDispatches' = pendingSecondaryDispatches,
    qMovementSpentFeet' = movementSpentFeet,
    qMovementRemainingFeet' = movementRemainingFeet,
    qMultiattackContinuationOpen' = multiattackContinuationOpen,
    qProtocol' = witnessProtocolForProjection(holes, result),
    qComponentRoute' = componentRouteEvidence,
  }

  action init = recordProjection(
    true, true, 0, 0, 0, initialMovementRemainingFeet, false,
    Set(), WInit
  )

  action doStartMultiattack = {
    val profile = {
      firstAttackName: PrimaryStatBlockAttack,
      primaryAttackCount: 2,
      secondaryAttackCount: 1,
    }
    val started = startStatBlockMultiattack(initialStatBlockControlState, profile)
    all {
      openHoles == Set(),
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
        WResolved
      ),
    }
  }

  action doMoveDuringDispatch = all {
    openHoles == Set(),
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
      WResolved
    ),
  }

  action doRejectBonusActionDuringDispatch = all {
    openHoles == Set(),
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
      WInvalid(WStaleSubject)
    ),
  }

  action doRejectOrdinaryActionDuringDispatch = all {
    openHoles == Set(),
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
      WInvalid(WStaleSubject)
    ),
  }

  action doResolvePrimaryDispatch = {
    val dispatched = resolveStatBlockMultiattackDispatch(
      initialStatBlockControlState.with("multiattack", qDispatches),
      PrimaryStatBlockAttack
    )
    all {
      openHoles == Set(),
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
        WResolved
      ),
    }
  }

  action doResolveSecondaryDispatch = {
    val dispatched = resolveStatBlockMultiattackDispatch(
      initialStatBlockControlState.with("multiattack", qDispatches),
      SecondaryStatBlockAttack
    )
    all {
      openHoles == Set(),
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
        WResolved
      ),
    }
  }

  action doEndTurnClosesDispatches = {
    val ended = endStatBlockTurn(
      initialStatBlockControlState.with("multiattack", qDispatches)
    )
    all {
      openHoles == Set(),
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
        WResolved
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
