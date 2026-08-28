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
    | SlowProofFailedSomaticCast
    | SlowProofContinuedSomaticCast
    | SlowProofRepeatSaveFailed
    | SlowProofRepeatSaveRemovedOneTarget
    | SlowProofRepeatSaveRemovedLastTarget
    | SlowProofConcentrationEnded
    | SlowProofDurationExpired
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

  var qOccurrence: SlowOccurrenceState
  var qTurn: SlowTargetTurnState
  var qSomatic: SlowSomaticResolutionState
  var qMultiattack: SlowStatBlockMultiattackState
  var qConcentrationCommand: SlowSourceConcentrationCommand
  var qActorWasSlowedAtMultiattackActivation: bool
  var qEvent: SlowProofEvent

  action recordOccurrenceTransition(
    result: SlowOccurrenceTransition,
    event: SlowProofEvent
  ): bool = all {
    qOccurrence' = result.occurrence,
    qTurn' = qTurn,
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
    qSomatic' = SlowSomaticCheckBypassed,
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
    recordTurn(
      beginSlowTargetTurn(qOccurrence, 1),
      SlowProofBeganRestrictedTurn
    ),
  }

  action doReconcilePriorAction = all {
    slowTargetAffected(qOccurrence, 1),
    recordTurn(
      beginSlowTargetTurnAfterPriorAction(qOccurrence, 1, SlowOtherAction),
      SlowProofReconciledPriorAction
    ),
  }

  action doReconcilePriorBonusAction = all {
    slowTargetAffected(qOccurrence, 1),
    recordTurn(
      beginSlowTargetTurnAfterPriorBonusAction(qOccurrence, 1),
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
    not(slowSomaticOutcomeRequired(qSomatic)),
    recordSomatic(
      requestSlowSomaticResolution(qOccurrence, 1, true),
      SlowProofRequestedSomaticOutcome
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
      SlowProofConcentrationEnded
    ),
  }

  action doConsumeDurationExpiredSignal = all {
    slowOccurrenceHasSource(qOccurrence, qSlowSource),
    recordOccurrenceTransition(
      applySlowOccurrenceCleanupSignal(
        qOccurrence,
        SlowDurationExpired({ source: qSlowSource })
      ),
      SlowProofDurationExpired
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
    doFailSomaticCast,
    doContinueSomaticCast,
    doResolveRepeatSaveFailure,
    doResolveRepeatSaveSuccess,
    doConsumeConcentrationEndedSignal,
    doConsumeDurationExpiredSignal,
    doActivateMultiattack,
    doRejectMismatchedMultiattackSource,
    doDispatchMultiattack,
    doEndMultiattackTurn,
  }

  val invariant = all {
    legalSlowOccurrenceState(qOccurrence),
    legalSlowTargetTurnState(qTurn),
    legalSlowStatBlockMultiattackState(qMultiattack),
    qConcentrationCommand.in(Set(
      SlowSourceConcentrationUnchanged,
      SlowSourceConcentrationStartRequired,
      SlowSourceConcentrationEndRequired
    )),
    slowTurnDoesNotSpendBothActionAndBonusAction(qTurn),
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
      | SlowSomaticFailureOutcomeRequired(data) => data.failurePercent == 25
      | SlowSomaticSpellFailedAfterResourceSpend => all {
          slowSomaticFailureSpentCastResources(qSomatic),
          not(slowSomaticSpellEffectMayApply(qSomatic)),
          not(slowSomaticFailureStartsNewConcentration(qSomatic)),
        }
      | _ => true
    },
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
    },
    (qEvent == SlowProofConcentrationEnded) implies all {
      qOccurrence == SlowOccurrenceAbsent,
      qConcentrationCommand == SlowSourceConcentrationUnchanged,
    },
    (qEvent == SlowProofDurationExpired) implies all {
      qOccurrence == SlowOccurrenceAbsent,
      qConcentrationCommand == SlowSourceConcentrationEndRequired,
    },
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
  val witnessSomaticFailure = qEvent == SlowProofFailedSomaticCast
  val witnessSomaticSuccess = qEvent == SlowProofContinuedSomaticCast
  val witnessRepeatSaveFailure = qEvent == SlowProofRepeatSaveFailed
  val witnessPerTargetCleanup = qEvent == SlowProofRepeatSaveRemovedOneTarget
  val witnessLastTargetCleanup = qEvent == SlowProofRepeatSaveRemovedLastTarget
  val witnessConcentrationCleanup = qEvent == SlowProofConcentrationEnded
  val witnessDurationCleanup = qEvent == SlowProofDurationExpired
  val witnessSlowedMultiattack =
    qEvent == SlowProofActivatedMultiattackWhileSlowed
  val witnessUnslowedMultiattack =
    qEvent == SlowProofActivatedMultiattackWhileUnslowed
  val witnessSourceMismatchRejected =
    qEvent == SlowProofRejectedMismatchedMultiattackSource
  val witnessMultiattackDispatch = qEvent == SlowProofDispatchedMultiattack
}
