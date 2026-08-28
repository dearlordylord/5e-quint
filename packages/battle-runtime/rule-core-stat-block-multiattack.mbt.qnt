// -*- mode: Bluespec; -*-

module ruleCoreStatBlockMultiattackMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import statBlockMultiattack.* from "../shared-algebras/proofs/rule-core/stat-block-multiattack"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Fixture bounds:
  // - one Stat Block actor with a two-dispatch Multiattack and one target;
  // - dispatch attacks are resolved as misses so attack damage, reactions, and
  //   limited-use resource branches stay outside this focused tracer;
  // - Legendary Actions are intentionally excluded for a later tracer.

  type StatBlockMultiattackMbtPhase =
    | MbtReadyToAct
    | MbtActionSpent
    | MbtTurnEnded
    | MbtDispatching

  var qPhase: StatBlockMultiattackMbtPhase
  var qBonusActionAvailable: bool
  var qPendingPrimaryDispatches: int
  var qPendingSecondaryDispatches: int
  var qMovementSpentFeet: int
  var qMovementRemainingFeet: int
  var qProtocol: WitnessProtocol[str]
  var qComponentRoute: List[RuleCoreComponentRouteEvent]

  pure def openHoles: Set[str] = qProtocol.holes

  pure def componentRouteEvidence: List[RuleCoreComponentRouteEvent] =
    ruleCoreComponentRoute(RuleCoreStatBlockMultiattackOwner)

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

  pure def qState: StatBlockMultiattackState =
    if (qPhase == MbtReadyToAct) StatBlockMultiattackReadyToAct
    else if (qPhase == MbtActionSpent) StatBlockMultiattackActionSpent
    else if (qPhase == MbtTurnEnded) StatBlockMultiattackTurnEnded
    else StatBlockMultiattackDispatching({ dispatches: qDispatches })

  action recordProjection(
    phase: StatBlockMultiattackMbtPhase,
    bonusActionAvailable: bool,
    pendingPrimaryDispatches: int,
    pendingSecondaryDispatches: int,
    movementSpentFeet: int,
    movementRemainingFeet: int,
    holes: Set[str],
    result: WitnessResult,
  ): bool = all {
    qPhase' = phase,
    qBonusActionAvailable' = bonusActionAvailable,
    qPendingPrimaryDispatches' = pendingPrimaryDispatches,
    qPendingSecondaryDispatches' = pendingSecondaryDispatches,
    qMovementSpentFeet' = movementSpentFeet,
    qMovementRemainingFeet' = movementRemainingFeet,
    qProtocol' = witnessProtocolForProjection(holes, result),
    qComponentRoute' = componentRouteEvidence,
  }

  action init = recordProjection(
    MbtReadyToAct, true, 0, 0, 0, initialMovementRemainingFeet,
    Set(), WInit
  )

  action doStartMultiattack = {
    val profile = {
      firstAttackName: PrimaryStatBlockAttack,
      primaryAttackCount: 2,
      secondaryAttackCount: 1,
    }
    val started = startStatBlockMultiattack(initialStatBlockMultiattackState, profile)
    all {
      openHoles == Set(),
      qPhase == MbtReadyToAct,
      recordProjection(
        if (statBlockMultiattackContinuationOpen(started)) MbtDispatching
        else MbtActionSpent,
        true,
        statBlockMultiattackDispatches(started).primaryRemaining,
        statBlockMultiattackDispatches(started).secondaryRemaining,
        qMovementSpentFeet,
        qMovementRemainingFeet,
        Set(),
        WResolved
      ),
    }
  }

  action doMoveDuringDispatch = all {
    openHoles == Set(),
    qPhase == MbtDispatching,
    qMovementRemainingFeet >= interleavedMovementFeet,
    multiattackDispatchSubjectPermitted(
      qState,
      StatBlockMovementSubject
    ),
    recordProjection(
      qPhase,
      qBonusActionAvailable,
      qPendingPrimaryDispatches,
      qPendingSecondaryDispatches,
      qMovementSpentFeet + interleavedMovementFeet,
      qMovementRemainingFeet - interleavedMovementFeet,
      Set(),
      WResolved
    ),
  }

  action doRejectBonusActionDuringDispatch = all {
    openHoles == Set(),
    qPhase == MbtDispatching,
    not(multiattackDispatchSubjectPermitted(
      qState,
      StatBlockBonusActionSubject
    )),
    recordProjection(
      qPhase,
      qBonusActionAvailable,
      qPendingPrimaryDispatches,
      qPendingSecondaryDispatches,
      qMovementSpentFeet,
      qMovementRemainingFeet,
      Set(),
      WInvalid(WStaleSubject)
    ),
  }

  action doRejectOrdinaryActionDuringDispatch = all {
    openHoles == Set(),
    qPhase == MbtDispatching,
    not(multiattackDispatchSubjectPermitted(
      qState,
      StatBlockOrdinaryActionSubject
    )),
    recordProjection(
      qPhase,
      qBonusActionAvailable,
      qPendingPrimaryDispatches,
      qPendingSecondaryDispatches,
      qMovementSpentFeet,
      qMovementRemainingFeet,
      Set(),
      WInvalid(WStaleSubject)
    ),
  }

  action doResolvePrimaryDispatch = {
    val dispatched = resolveStatBlockMultiattackDispatch(
      qState,
      PrimaryStatBlockAttack
    )
    all {
      openHoles == Set(),
      qPhase == MbtDispatching,
      qPendingPrimaryDispatches > 0,
      recordProjection(
        if (statBlockMultiattackContinuationOpen(dispatched)) MbtDispatching
        else MbtActionSpent,
        qBonusActionAvailable,
        statBlockMultiattackDispatches(dispatched).primaryRemaining,
        statBlockMultiattackDispatches(dispatched).secondaryRemaining,
        qMovementSpentFeet,
        qMovementRemainingFeet,
        Set(),
        WResolved
      ),
    }
  }

  action doResolveSecondaryDispatch = {
    val dispatched = resolveStatBlockMultiattackDispatch(
      qState,
      SecondaryStatBlockAttack
    )
    all {
      openHoles == Set(),
      qPhase == MbtDispatching,
      qPendingSecondaryDispatches > 0,
      recordProjection(
        if (statBlockMultiattackContinuationOpen(dispatched)) MbtDispatching
        else MbtActionSpent,
        qBonusActionAvailable,
        statBlockMultiattackDispatches(dispatched).primaryRemaining,
        statBlockMultiattackDispatches(dispatched).secondaryRemaining,
        qMovementSpentFeet,
        qMovementRemainingFeet,
        Set(),
        WResolved
      ),
    }
  }

  action doEndTurnClosesDispatches = {
    val ended = endStatBlockMultiattackTurn(
      qState
    )
    all {
      openHoles == Set(),
      qPhase == MbtDispatching,
      recordProjection(
        MbtTurnEnded,
        true,
        statBlockMultiattackDispatches(ended).primaryRemaining,
        statBlockMultiattackDispatches(ended).secondaryRemaining,
        0,
        initialMovementRemainingFeet,
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
