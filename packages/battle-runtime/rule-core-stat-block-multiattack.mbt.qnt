// -*- mode: Bluespec; -*-

module ruleCoreStatBlockMultiattackMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import statBlockMultiattack.* from "../shared-algebras/proofs/rule-core/stat-block-multiattack"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Fixture bounds:
  // - one Stat Block actor with a three-dispatch Multiattack and one target;
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
  var qPendingProcedureRefs: List[StatBlockProcedureRef]
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

  pure def qState: StatBlockMultiattackState =
    if (qPhase == MbtReadyToAct) StatBlockMultiattackReadyToAct
    else if (qPhase == MbtActionSpent) StatBlockMultiattackActionSpent
    else if (qPhase == MbtTurnEnded) StatBlockMultiattackTurnEnded
    else StatBlockMultiattackDispatching({
      pendingProcedureRefs: qPendingProcedureRefs,
    })

  action recordProjection(
    phase: StatBlockMultiattackMbtPhase,
    bonusActionAvailable: bool,
    pendingProcedureRefs: List[StatBlockProcedureRef],
    movementSpentFeet: int,
    movementRemainingFeet: int,
    holes: Set[str],
    result: WitnessResult,
  ): bool = all {
    qPhase' = phase,
    qBonusActionAvailable' = bonusActionAvailable,
    qPendingProcedureRefs' = pendingProcedureRefs,
    qMovementSpentFeet' = movementSpentFeet,
    qMovementRemainingFeet' = movementRemainingFeet,
    qProtocol' = witnessProtocolForProjection(holes, result),
    qComponentRoute' = componentRouteEvidence,
  }

  action init = recordProjection(
    MbtReadyToAct, true, List(), 0, initialMovementRemainingFeet,
    Set(), WInit
  )

  action doStartMultiattack = {
    val profile = {
      dispatchProcedureRefs: List(0, 0, 1),
    }
    val started = startStatBlockMultiattack(initialStatBlockMultiattackState, profile)
    all {
      openHoles == Set(),
      qPhase == MbtReadyToAct,
      recordProjection(
        if (statBlockMultiattackContinuationOpen(started)) MbtDispatching
        else MbtActionSpent,
        true,
        statBlockMultiattackPendingProcedureRefs(started),
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
      qPendingProcedureRefs,
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
      qPendingProcedureRefs,
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
      qPendingProcedureRefs,
      qMovementSpentFeet,
      qMovementRemainingFeet,
      Set(),
      WInvalid(WStaleSubject)
    ),
  }

  action doResolveProcedureZeroDispatch = {
    val dispatched = resolveStatBlockMultiattackDispatch(
      qState,
      0
    )
    all {
      openHoles == Set(),
      qPhase == MbtDispatching,
      statBlockProcedureRefsContain(qPendingProcedureRefs, 0),
      recordProjection(
        if (statBlockMultiattackContinuationOpen(dispatched)) MbtDispatching
        else MbtActionSpent,
        qBonusActionAvailable,
        statBlockMultiattackPendingProcedureRefs(dispatched),
        qMovementSpentFeet,
        qMovementRemainingFeet,
        Set(),
        WResolved
      ),
    }
  }

  action doResolveProcedureOneDispatch = {
    val dispatched = resolveStatBlockMultiattackDispatch(
      qState,
      1
    )
    all {
      openHoles == Set(),
      qPhase == MbtDispatching,
      statBlockProcedureRefsContain(qPendingProcedureRefs, 1),
      recordProjection(
        if (statBlockMultiattackContinuationOpen(dispatched)) MbtDispatching
        else MbtActionSpent,
        qBonusActionAvailable,
        statBlockMultiattackPendingProcedureRefs(dispatched),
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
        statBlockMultiattackPendingProcedureRefs(ended),
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
    doResolveProcedureZeroDispatch,
    doResolveProcedureOneDispatch,
    doEndTurnClosesDispatches,
  }
}
