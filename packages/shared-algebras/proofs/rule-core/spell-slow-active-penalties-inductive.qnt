// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-slow-active-penalties

module spellSlowActivePenaltiesInductive {
  import spellSlowActivePenaltiesCore.* from "./spell-slow-active-penalties-core"
  import spellSlowStatBlockMultiattackCore.* from "./spell-slow-stat-block-multiattack-core"
  import statBlockMultiattack.* from "./stat-block-multiattack"

  type SlowProofEvent =
    | SlowProofInit
    | SlowProofAppliedOneTarget
    | SlowProofAppliedTwoTargets
    | SlowProofBeganRestrictedTurn
    | SlowProofReconciledPriorAction
    | SlowProofReconciledPriorBonusAction
    | SlowProofSpentAction
    | SlowProofSpentBonusAction
    | SlowProofMadeAttack
    | SlowProofRequestedSomaticOutcome
    | SlowProofBypassedSomaticCheck
    | SlowProofFailedSomaticCast
    | SlowProofContinuedSomaticCast
    | SlowProofBeganNextSomaticInvocation
    | SlowProofRepeatSaveFailed
    | SlowProofRepeatSaveRemovedOneTarget
    | SlowProofRepeatSaveRemovedLastTarget
    | SlowProofConcentrationEnded
    | SlowProofConcentrationEndedAfterAction
    | SlowProofConcentrationEndedAfterBonusAction
    | SlowProofDurationExpired
    | SlowProofDurationExpiredAfterAction
    | SlowProofDurationExpiredAfterBonusAction
    | SlowProofActivatedMultiattackWhileSlowed
    | SlowProofActivatedMultiattackWhileUnslowed
    | SlowProofRejectedMismatchedMultiattackSource
    | SlowProofDispatchedMultiattack
    | SlowProofEndedMultiattackTurn

  pure def qSlowSource: SlowEffectSource = {
    casterRef: 0,
    procedureExecutionRef: 7,
  }

  pure def qMultiattackBinding: SlowStatBlockMultiattackBinding = {
    sourceOwnerRef: 1,
    multiattackProcedureExecutionRef: 4,
  }

  pure def qMultiattackProfile: SlowStatBlockMultiattackProfile = {
    binding: qMultiattackBinding,
    dispatchProfile: { dispatchProcedureRefs: List(0, 0, 1) },
  }

  pure def qOccurrenceDomain: Set[SlowOccurrenceState] = Set(
    SlowOccurrenceAbsent,
    SlowOccurrenceActive({
      source: qSlowSource,
      affectedTargets: Set(1),
    }),
    SlowOccurrenceActive({
      source: qSlowSource,
      affectedTargets: Set(2),
    }),
    SlowOccurrenceActive({
      source: qSlowSource,
      affectedTargets: Set(1, 2),
    })
  )

  pure def qTurnDomain: Set[SlowTargetTurnState] = Set(
    SlowTurnUnrestricted,
    SlowTurnRestrictedUnused,
    SlowTurnRestrictedAttackActionOneAttackAvailable,
    SlowTurnRestrictedAttackActionNoAttackAvailable,
    SlowTurnRestrictedOtherActionUsed,
    SlowTurnRestrictedBonusActionUsed
  )

  pure def qSomaticDomain: Set[SlowSomaticResolutionState] = Set(
    SlowSomaticResolutionNotRequested,
    SlowSomaticCheckBypassed,
    SlowSomaticFailureOutcomeRequired,
    SlowSomaticSpellContinues,
    SlowSomaticSpellFailedAfterResourceSpend
  )

  pure def qActivatedMultiattack(
    dispatchState: StatBlockMultiattackState
  ): SlowStatBlockMultiattackState = SlowStatBlockMultiattackActivated({
    binding: qMultiattackBinding,
    dispatchState: dispatchState,
  })

  pure def qDispatchingMultiattack(
    pendingProcedureRefs: List[StatBlockProcedureRef],
    allowance: StatBlockMultiattackDispatchAllowance
  ): SlowStatBlockMultiattackState = qActivatedMultiattack(
    StatBlockMultiattackDispatching({
      pendingProcedureRefs: pendingProcedureRefs,
      allowance: allowance,
    })
  )

  pure def qMultiattackDomain: Set[SlowStatBlockMultiattackState] = Set(
    SlowStatBlockMultiattackReady,
    qDispatchingMultiattack(List(0, 0, 1), OneListedDispatch),
    qDispatchingMultiattack(List(0, 0, 1), AllListedDispatches),
    qDispatchingMultiattack(List(0, 1), AllListedDispatches),
    qDispatchingMultiattack(List(0, 0), AllListedDispatches),
    qDispatchingMultiattack(List(1), AllListedDispatches),
    qDispatchingMultiattack(List(0), AllListedDispatches),
    qActivatedMultiattack(StatBlockMultiattackActionSpent),
    qActivatedMultiattack(StatBlockMultiattackTurnEnded)
  )

  pure def qConcentrationCommandDomain:
    Set[SlowSourceConcentrationCommand] = Set(
      SlowSourceConcentrationUnchanged,
      SlowSourceConcentrationStartRequired,
      SlowSourceConcentrationEndRequired
    )

  pure def qEventDomain: Set[SlowProofEvent] = Set(
    SlowProofInit,
    SlowProofAppliedOneTarget,
    SlowProofAppliedTwoTargets,
    SlowProofBeganRestrictedTurn,
    SlowProofReconciledPriorAction,
    SlowProofReconciledPriorBonusAction,
    SlowProofSpentAction,
    SlowProofSpentBonusAction,
    SlowProofMadeAttack,
    SlowProofRequestedSomaticOutcome,
    SlowProofBypassedSomaticCheck,
    SlowProofFailedSomaticCast,
    SlowProofContinuedSomaticCast,
    SlowProofBeganNextSomaticInvocation,
    SlowProofRepeatSaveFailed,
    SlowProofRepeatSaveRemovedOneTarget,
    SlowProofRepeatSaveRemovedLastTarget,
    SlowProofConcentrationEnded,
    SlowProofConcentrationEndedAfterAction,
    SlowProofConcentrationEndedAfterBonusAction,
    SlowProofDurationExpired,
    SlowProofDurationExpiredAfterAction,
    SlowProofDurationExpiredAfterBonusAction,
    SlowProofActivatedMultiattackWhileSlowed,
    SlowProofActivatedMultiattackWhileUnslowed,
    SlowProofRejectedMismatchedMultiattackSource,
    SlowProofDispatchedMultiattack,
    SlowProofEndedMultiattackTurn
  )

  var qOccurrence: SlowOccurrenceState
  var qTurn: SlowTargetTurnState
  var qSomatic: SlowSomaticResolutionState
  var qMultiattack: SlowStatBlockMultiattackState
  var qConcentrationCommand: SlowSourceConcentrationCommand
  var qActorWasSlowedAtMultiattackActivation: bool
  var qEvent: SlowProofEvent

  pure def qConcentrationCleanupEvent(
    turn: SlowTargetTurnState
  ): SlowProofEvent =
    if (slowTurnActionSpent(turn)) SlowProofConcentrationEndedAfterAction
    else if (slowTurnBonusActionSpent(turn))
      SlowProofConcentrationEndedAfterBonusAction
    else SlowProofConcentrationEnded

  pure def qDurationCleanupEvent(
    turn: SlowTargetTurnState
  ): SlowProofEvent =
    if (slowTurnActionSpent(turn)) SlowProofDurationExpiredAfterAction
    else if (slowTurnBonusActionSpent(turn))
      SlowProofDurationExpiredAfterBonusAction
    else SlowProofDurationExpired

  action recordOccurrenceTransition(
    result: SlowOccurrenceTransition,
    event: SlowProofEvent
  ): bool = all {
    qOccurrence' = result.occurrence,
    qTurn' = reconcileSlowTargetTurnAfterOccurrenceTransition(
      result.occurrence,
      1,
      qTurn
    ),
    qSomatic' = qSomatic,
    qMultiattack' = qMultiattack,
    qConcentrationCommand' = result.concentrationCommand,
    qActorWasSlowedAtMultiattackActivation' = qActorWasSlowedAtMultiattackActivation,
    qEvent' = event,
  }

  action recordTurn(
    turn: SlowTargetTurnState,
    event: SlowProofEvent
  ): bool = all {
    qOccurrence' = qOccurrence,
    qTurn' = turn,
    qSomatic' = qSomatic,
    qMultiattack' = qMultiattack,
    qConcentrationCommand' = SlowSourceConcentrationUnchanged,
    qActorWasSlowedAtMultiattackActivation' = qActorWasSlowedAtMultiattackActivation,
    qEvent' = event,
  }

  action recordSomatic(
    somatic: SlowSomaticResolutionState,
    event: SlowProofEvent
  ): bool = all {
    qOccurrence' = qOccurrence,
    qTurn' = qTurn,
    qSomatic' = somatic,
    qMultiattack' = qMultiattack,
    qConcentrationCommand' = SlowSourceConcentrationUnchanged,
    qActorWasSlowedAtMultiattackActivation' = qActorWasSlowedAtMultiattackActivation,
    qEvent' = event,
  }

  action recordMultiattack(
    multiattack: SlowStatBlockMultiattackState,
    actorWasSlowedAtActivation: bool,
    event: SlowProofEvent
  ): bool = all {
    qOccurrence' = qOccurrence,
    qTurn' = qTurn,
    qSomatic' = qSomatic,
    qMultiattack' = multiattack,
    qConcentrationCommand' = SlowSourceConcentrationUnchanged,
    qActorWasSlowedAtMultiattackActivation' = actorWasSlowedAtActivation,
    qEvent' = event,
  }

  action init = all {
    qOccurrence' = initialSlowOccurrenceState,
    qTurn' = SlowTurnUnrestricted,
    qSomatic' = initialSlowSomaticResolutionState,
    qMultiattack' = initialSlowStatBlockMultiattackState,
    qConcentrationCommand' = SlowSourceConcentrationUnchanged,
    qActorWasSlowedAtMultiattackActivation' = false,
    qEvent' = SlowProofInit,
  }

  action doApplyOneTargetSlow = all {
    canApplySlowInitialFailedSaves(qOccurrence, qSlowSource, Set(1)),
    recordOccurrenceTransition(
      applySlowInitialFailedSaves(qOccurrence, qSlowSource, Set(1)),
      SlowProofAppliedOneTarget
    ),
  }

  action doApplyTwoTargetSlow = all {
    canApplySlowInitialFailedSaves(qOccurrence, qSlowSource, Set(1, 2)),
    recordOccurrenceTransition(
      applySlowInitialFailedSaves(qOccurrence, qSlowSource, Set(1, 2)),
      SlowProofAppliedTwoTargets
    ),
  }

  action doBeginRestrictedTurn = all {
    slowTargetAffected(qOccurrence, 1),
    canBeginSlowTargetTurn(qTurn),
    recordTurn(
      beginSlowTargetTurn(qOccurrence, 1, qTurn),
      SlowProofBeganRestrictedTurn
    ),
  }

  action doReconcilePriorAction = all {
    slowTargetAffected(qOccurrence, 1),
    canBeginSlowTargetTurn(qTurn),
    recordTurn(
      beginSlowTargetTurnAfterPriorAction(
        qOccurrence,
        1,
        qTurn,
        SlowOtherAction
      ),
      SlowProofReconciledPriorAction
    ),
  }

  action doReconcilePriorBonusAction = all {
    slowTargetAffected(qOccurrence, 1),
    canBeginSlowTargetTurn(qTurn),
    recordTurn(
      beginSlowTargetTurnAfterPriorBonusAction(qOccurrence, 1, qTurn),
      SlowProofReconciledPriorBonusAction
    ),
  }

  action doSpendAction = {
    nondet actionKind = Set(SlowAttackAction, SlowOtherAction).oneOf()
    all {
      canSpendSlowTurnAction(qTurn, actionKind),
      recordTurn(
        applySlowTurnAction(qTurn, actionKind),
        SlowProofSpentAction
      ),
    }
  }

  action doSpendBonusAction = all {
    canSpendSlowTurnBonusAction(qTurn),
    recordTurn(
      applySlowTurnBonusAction(qTurn),
      SlowProofSpentBonusAction
    ),
  }

  action doMakeAttack = all {
    canMakeSlowAttackActionAttack(qTurn),
    recordTurn(
      applySlowAttackActionAttack(qTurn),
      SlowProofMadeAttack
    ),
  }

  action doRequestSomaticOutcome = all {
    slowTargetAffected(qOccurrence, 1),
    canRequestSlowSomaticResolution(qSomatic),
    recordSomatic(
      requestSlowSomaticResolution(qSomatic, qOccurrence, 1, true),
      SlowProofRequestedSomaticOutcome
    ),
  }

  action doBypassSomaticCheck = all {
    slowTargetAffected(qOccurrence, 1),
    canRequestSlowSomaticResolution(qSomatic),
    recordSomatic(
      requestSlowSomaticResolution(qSomatic, qOccurrence, 1, false),
      SlowProofBypassedSomaticCheck
    ),
  }

  action doFailSomaticCast = all {
    canResolveSlowSomaticFailureOutcome(qSomatic),
    recordSomatic(
      applySlowSomaticFailureOutcome(qSomatic, SlowSomaticSpellFailed),
      SlowProofFailedSomaticCast
    ),
  }

  action doContinueSomaticCast = all {
    canResolveSlowSomaticFailureOutcome(qSomatic),
    recordSomatic(
      applySlowSomaticFailureOutcome(qSomatic, SlowSomaticSpellSucceeded),
      SlowProofContinuedSomaticCast
    ),
  }

  // This abstract action marks a distinct later spell invocation. It does not
  // grant a runtime action or resource; those remain runtime-owned.
  action doBeginNextSomaticInvocation = all {
    canBeginNextSlowSomaticInvocation(qSomatic),
    recordSomatic(
      beginNextSlowSomaticInvocation(qSomatic),
      SlowProofBeganNextSomaticInvocation
    ),
  }

  action doResolveRepeatSaveFailure = {
    nondet targetRef = Set(1, 2).oneOf()
    val request = requestSlowRepeatSave(qOccurrence, targetRef)
    all {
      canResolveSlowRepeatSave(qOccurrence, request),
      recordOccurrenceTransition(
        applySlowRepeatSaveOutcome(qOccurrence, request, SlowSaveFailed),
        SlowProofRepeatSaveFailed
      ),
    }
  }

  action doResolveRepeatSaveSuccess = {
    nondet targetRef = Set(1, 2).oneOf()
    val request = requestSlowRepeatSave(qOccurrence, targetRef)
    val result = applySlowRepeatSaveOutcome(
      qOccurrence,
      request,
      SlowSaveSucceeded
    )
    all {
      canResolveSlowRepeatSave(qOccurrence, request),
      recordOccurrenceTransition(
        result,
        if (result.occurrence == SlowOccurrenceAbsent)
          SlowProofRepeatSaveRemovedLastTarget
        else SlowProofRepeatSaveRemovedOneTarget
      ),
    }
  }

  action doConsumeConcentrationEndedSignal = all {
    slowOccurrenceHasSource(qOccurrence, qSlowSource),
    recordOccurrenceTransition(
      applySlowOccurrenceCleanupSignal(
        qOccurrence,
        SlowSourceConcentrationEnded({ source: qSlowSource })
      ),
      qConcentrationCleanupEvent(qTurn)
    ),
  }

  action doConsumeDurationExpiredSignal = all {
    slowOccurrenceHasSource(qOccurrence, qSlowSource),
    recordOccurrenceTransition(
      applySlowOccurrenceCleanupSignal(
        qOccurrence,
        SlowDurationExpired({ source: qSlowSource })
      ),
      qDurationCleanupEvent(qTurn)
    ),
  }

  action doActivateMultiattack = {
    val actorSlowed = slowTargetAffected(qOccurrence, 1)
    val activated = activateSlowStatBlockMultiattack(
      qMultiattack,
      qOccurrence,
      qMultiattackProfile
    )
    all {
      canActivateSlowStatBlockMultiattack(qMultiattack, qMultiattackProfile),
      recordMultiattack(
        activated,
        actorSlowed,
        if (actorSlowed)
          SlowProofActivatedMultiattackWhileSlowed
        else SlowProofActivatedMultiattackWhileUnslowed
      ),
    }
  }

  action doRejectMismatchedMultiattackSource = {
    val request = {
      binding: { sourceOwnerRef: 1, multiattackProcedureExecutionRef: 5 },
      attackProcedureRef: 1,
    }
    all {
      slowStatBlockMultiattackContinuationOpen(qMultiattack),
      not(canResolveSlowStatBlockMultiattackDispatch(qMultiattack, request)),
      recordMultiattack(
        resolveSlowStatBlockMultiattackDispatch(qMultiattack, request),
        qActorWasSlowedAtMultiattackActivation,
        SlowProofRejectedMismatchedMultiattackSource
      ),
    }
  }

  action doDispatchMultiattack = {
    nondet attackProcedureRef = Set(0, 1).oneOf()
    val request = {
      binding: qMultiattackBinding,
      attackProcedureRef: attackProcedureRef,
    }
    all {
      canResolveSlowStatBlockMultiattackDispatch(qMultiattack, request),
      recordMultiattack(
        resolveSlowStatBlockMultiattackDispatch(qMultiattack, request),
        qActorWasSlowedAtMultiattackActivation,
        SlowProofDispatchedMultiattack
      ),
    }
  }

  action doEndMultiattackTurn = all {
    slowStatBlockMultiattackContinuationOpen(qMultiattack),
    recordMultiattack(
      endSlowStatBlockMultiattackTurn(qMultiattack),
      qActorWasSlowedAtMultiattackActivation,
      SlowProofEndedMultiattackTurn
    ),
  }

  action step = any {
    doApplyOneTargetSlow,
    doApplyTwoTargetSlow,
    doBeginRestrictedTurn,
    doReconcilePriorAction,
    doReconcilePriorBonusAction,
    doSpendAction,
    doSpendBonusAction,
    doMakeAttack,
    doRequestSomaticOutcome,
    doBypassSomaticCheck,
    doFailSomaticCast,
    doContinueSomaticCast,
    doBeginNextSomaticInvocation,
    doResolveRepeatSaveFailure,
    doResolveRepeatSaveSuccess,
    doConsumeConcentrationEndedSignal,
    doConsumeDurationExpiredSignal,
    doActivateMultiattack,
    doRejectMismatchedMultiattackSource,
    doDispatchMultiattack,
    doEndMultiattackTurn,
  }

  val restrictedTurnCannotBeReinitialized =
    if (canBeginSlowTargetTurn(qTurn)) qTurn == SlowTurnUnrestricted
    else all {
      beginSlowTargetTurn(qOccurrence, 1, qTurn) == qTurn,
      beginSlowTargetTurnAfterPriorAction(
        qOccurrence,
        1,
        qTurn,
        SlowAttackAction
      ) == qTurn,
      beginSlowTargetTurnAfterPriorAction(
        qOccurrence,
        1,
        qTurn,
        SlowOtherAction
      ) == qTurn,
      beginSlowTargetTurnAfterPriorBonusAction(
        qOccurrence,
        1,
        qTurn
      ) == qTurn,
    }

  val somaticRequestPhaseInvariant =
    if (canRequestSlowSomaticResolution(qSomatic))
      qSomatic == SlowSomaticResolutionNotRequested
    else all {
      requestSlowSomaticResolution(
        qSomatic,
        qOccurrence,
        1,
        true
      ) == qSomatic,
      requestSlowSomaticResolution(
        qSomatic,
        qOccurrence,
        1,
        false
      ) == qSomatic,
    }

  val somaticNextInvocationPhaseInvariant =
    match qSomatic {
      | SlowSomaticResolutionNotRequested => all {
          not(canBeginNextSlowSomaticInvocation(qSomatic)),
          beginNextSlowSomaticInvocation(qSomatic) == qSomatic,
        }
      | SlowSomaticFailureOutcomeRequired => all {
          not(canBeginNextSlowSomaticInvocation(qSomatic)),
          beginNextSlowSomaticInvocation(qSomatic) == qSomatic,
        }
      | SlowSomaticCheckBypassed => all {
          canBeginNextSlowSomaticInvocation(qSomatic),
          beginNextSlowSomaticInvocation(qSomatic) ==
            initialSlowSomaticResolutionState,
        }
      | SlowSomaticSpellContinues => all {
          canBeginNextSlowSomaticInvocation(qSomatic),
          beginNextSlowSomaticInvocation(qSomatic) ==
            initialSlowSomaticResolutionState,
        }
      | SlowSomaticSpellFailedAfterResourceSpend => all {
          canBeginNextSlowSomaticInvocation(qSomatic),
          beginNextSlowSomaticInvocation(qSomatic) ==
            initialSlowSomaticResolutionState,
        }
    }

  val invariant = all {
    qOccurrence.in(qOccurrenceDomain),
    qTurn.in(qTurnDomain),
    qSomatic.in(qSomaticDomain),
    qMultiattack.in(qMultiattackDomain),
    qConcentrationCommand.in(qConcentrationCommandDomain),
    qActorWasSlowedAtMultiattackActivation.in(Set(true, false)),
    qEvent.in(qEventDomain),
    legalSlowOccurrenceState(qOccurrence),
    legalSlowStatBlockMultiattackState(qMultiattack),
    restrictedTurnCannotBeReinitialized,
    somaticRequestPhaseInvariant,
    somaticNextInvocationPhaseInvariant,
    slowTurnDoesNotSpendBothActionAndBonusAction(qTurn),
    not(slowTargetAffected(qOccurrence, 1)) implies
      qTurn == SlowTurnUnrestricted,
    slowTurnAttackCount(qTurn) >= 0,
    slowTurnAttackCount(qTurn) <= 1,
    slowEffectiveSpeed(qOccurrence, 1, 30) ==
      (if (slowTargetAffected(qOccurrence, 1)) 15 else 30),
    slowEffectiveArmorClass(qOccurrence, 1, 10) ==
      (if (slowTargetAffected(qOccurrence, 1)) 8 else 10),
    slowDexteritySavingThrowDelta(qOccurrence, 1) ==
      (if (slowTargetAffected(qOccurrence, 1)) -2 else 0),
    slowTargetCanReact(qOccurrence, 1) ==
      not(slowTargetAffected(qOccurrence, 1)),
    match qOccurrence {
      | SlowOccurrenceAbsent => true
      | SlowOccurrenceActive(active) => all {
          active.source == qSlowSource,
          active.affectedTargets.forall(targetRef => targetRef.in(Set(1, 2))),
        }
    },
    match qSomatic {
      | SlowSomaticResolutionNotRequested =>
          not(slowSomaticSpellEffectMayApply(qSomatic))
      | SlowSomaticCheckBypassed =>
          slowSomaticSpellEffectMayApply(qSomatic)
      | SlowSomaticFailureOutcomeRequired => all {
          slowSomaticFailurePercent == 25,
          slowSomaticOutcomeRequired(qSomatic),
          not(slowSomaticSpellEffectMayApply(qSomatic)),
        }
      | SlowSomaticSpellContinues =>
          slowSomaticSpellEffectMayApply(qSomatic)
      | SlowSomaticSpellFailedAfterResourceSpend => all {
          slowSomaticFailureSpentCastResources(qSomatic),
          not(slowSomaticSpellEffectMayApply(qSomatic)),
          not(slowSomaticFailureStartsNewConcentration(qSomatic)),
        }
    },
    (qEvent == SlowProofRequestedSomaticOutcome) implies
      qSomatic == SlowSomaticFailureOutcomeRequired,
    (qEvent == SlowProofBypassedSomaticCheck) implies all {
      qSomatic == SlowSomaticCheckBypassed,
      slowSomaticSpellEffectMayApply(qSomatic),
    },
    (qEvent == SlowProofFailedSomaticCast) implies
      qSomatic == SlowSomaticSpellFailedAfterResourceSpend,
    (qEvent == SlowProofContinuedSomaticCast) implies
      qSomatic == SlowSomaticSpellContinues,
    (qEvent == SlowProofBeganNextSomaticInvocation) implies
      qSomatic == SlowSomaticResolutionNotRequested,
    (qEvent == SlowProofRepeatSaveFailed) implies all {
      qOccurrence != SlowOccurrenceAbsent,
      qConcentrationCommand == SlowSourceConcentrationUnchanged,
    },
    (qEvent == SlowProofRepeatSaveRemovedOneTarget) implies all {
      slowAffectedTargetCount(qOccurrence) == 1,
      qConcentrationCommand == SlowSourceConcentrationUnchanged,
    },
    (qEvent == SlowProofRepeatSaveRemovedLastTarget) implies all {
      qOccurrence == SlowOccurrenceAbsent,
      qConcentrationCommand == SlowSourceConcentrationEndRequired,
      qTurn == SlowTurnUnrestricted,
    },
    qEvent.in(Set(
      SlowProofConcentrationEnded,
      SlowProofConcentrationEndedAfterAction,
      SlowProofConcentrationEndedAfterBonusAction
    )) implies all {
      qOccurrence == SlowOccurrenceAbsent,
      qConcentrationCommand == SlowSourceConcentrationUnchanged,
      qTurn == SlowTurnUnrestricted,
    },
    qEvent.in(Set(
      SlowProofDurationExpired,
      SlowProofDurationExpiredAfterAction,
      SlowProofDurationExpiredAfterBonusAction
    )) implies all {
      qOccurrence == SlowOccurrenceAbsent,
      qConcentrationCommand == SlowSourceConcentrationEndRequired,
      qTurn == SlowTurnUnrestricted,
    },
    (qEvent == SlowProofConcentrationEndedAfterAction) implies
      slowTurnCanSpendBonusAction(qTurn),
    (qEvent == SlowProofConcentrationEndedAfterBonusAction) implies
      slowTurnCanSpendAction(qTurn),
    (qEvent == SlowProofDurationExpiredAfterAction) implies
      slowTurnCanSpendBonusAction(qTurn),
    (qEvent == SlowProofDurationExpiredAfterBonusAction) implies
      slowTurnCanSpendAction(qTurn),
    match qMultiattack {
      | SlowStatBlockMultiattackReady => true
      | SlowStatBlockMultiattackActivated(active) => all {
          active.binding == qMultiattackBinding,
          slowStatBlockMultiattackPendingProcedureRefs(qMultiattack)
            .foldl(true, (legal, procedureRef) =>
              legal and procedureRef.in(Set(0, 1))
            ),
          slowStatBlockMultiattackPendingProcedureRefs(qMultiattack).length() <= 3,
          slowStatBlockMultiattackDispatchResourceCount(qMultiattack) <= 3,
          slowStatBlockMultiattackContinuationOpen(qMultiattack) implies all {
            slowStatBlockMultiattackOneListedAllowanceActive(qMultiattack) ==
              qActorWasSlowedAtMultiattackActivation,
            slowStatBlockMultiattackSubjectPermitted(
              qMultiattack,
              qMultiattackBinding,
              StatBlockMovementSubject
            ),
            not(slowStatBlockMultiattackSubjectPermitted(
              qMultiattack,
              qMultiattackBinding,
              StatBlockBonusActionSubject
            )),
          },
        }
    },
    (qEvent == SlowProofActivatedMultiattackWhileSlowed) implies all {
      slowStatBlockMultiattackPendingProcedureRefs(qMultiattack) == List(0, 0, 1),
      slowStatBlockMultiattackDispatchResourceCount(qMultiattack) == 1,
      slowStatBlockMultiattackOneListedAllowanceActive(qMultiattack),
    },
    (qEvent == SlowProofActivatedMultiattackWhileUnslowed) implies all {
      slowStatBlockMultiattackPendingProcedureRefs(qMultiattack) == List(0, 0, 1),
      slowStatBlockMultiattackDispatchResourceCount(qMultiattack) == 3,
      not(slowStatBlockMultiattackOneListedAllowanceActive(qMultiattack)),
    },
    (qEvent == SlowProofRejectedMismatchedMultiattackSource) implies
      slowStatBlockMultiattackContinuationOpen(qMultiattack),
  }

  val witnessActivePenalties = all {
    slowTargetAffected(qOccurrence, 1),
    slowEffectiveSpeed(qOccurrence, 1, 30) == 15,
    slowEffectiveArmorClass(qOccurrence, 1, 10) == 8,
    slowDexteritySavingThrowDelta(qOccurrence, 1) == -2,
    not(slowTargetCanReact(qOccurrence, 1)),
  }

  val witnessRestrictedUnused = qEvent == SlowProofBeganRestrictedTurn
  val witnessPriorActionReconciled = qEvent == SlowProofReconciledPriorAction
  val witnessPriorBonusActionReconciled =
    qEvent == SlowProofReconciledPriorBonusAction
  val witnessActionSpent = qEvent == SlowProofSpentAction
  val witnessBonusActionSpent = qEvent == SlowProofSpentBonusAction
  val witnessOneAttackMade = qEvent == SlowProofMadeAttack
  val witnessSomaticOutcomeRequired = qEvent == SlowProofRequestedSomaticOutcome
  val witnessSomaticCheckBypassed = qEvent == SlowProofBypassedSomaticCheck
  val witnessSomaticFailure = qEvent == SlowProofFailedSomaticCast
  val witnessSomaticSuccess = qEvent == SlowProofContinuedSomaticCast
  val witnessNextSomaticInvocation =
    qEvent == SlowProofBeganNextSomaticInvocation
  val witnessRepeatSaveFailure = qEvent == SlowProofRepeatSaveFailed
  val witnessPerTargetCleanup = qEvent == SlowProofRepeatSaveRemovedOneTarget
  val witnessLastTargetCleanup = qEvent == SlowProofRepeatSaveRemovedLastTarget
  val witnessConcentrationCleanup = qEvent == SlowProofConcentrationEnded
  val witnessConcentrationCleanupAfterAction =
    qEvent == SlowProofConcentrationEndedAfterAction
  val witnessConcentrationCleanupAfterBonusAction =
    qEvent == SlowProofConcentrationEndedAfterBonusAction
  val witnessDurationCleanup = qEvent == SlowProofDurationExpired
  val witnessDurationCleanupAfterAction =
    qEvent == SlowProofDurationExpiredAfterAction
  val witnessDurationCleanupAfterBonusAction =
    qEvent == SlowProofDurationExpiredAfterBonusAction
  val witnessSlowedMultiattack =
    qEvent == SlowProofActivatedMultiattackWhileSlowed
  val witnessUnslowedMultiattack =
    qEvent == SlowProofActivatedMultiattackWhileUnslowed
  val witnessSourceMismatchRejected =
    qEvent == SlowProofRejectedMismatchedMultiattackSource
  val witnessMultiattackDispatch = qEvent == SlowProofDispatchedMultiattack
}
