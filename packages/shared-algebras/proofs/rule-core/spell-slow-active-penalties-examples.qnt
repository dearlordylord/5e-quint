// -*- mode: Bluespec; -*-

module spellSlowActivePenaltiesExamples {
  import spellSlowActivePenaltiesCore.* from "./spell-slow-active-penalties-core"
  import spellSlowStatBlockMultiattackCore.* from "./spell-slow-stat-block-multiattack-core"
  import statBlockMultiattack.* from "./stat-block-multiattack"

  pure def exampleSlowSource: SlowEffectSource = {
    casterRef: 0,
    procedureExecutionRef: 7,
  }

  pure def exampleActiveSlow: SlowOccurrenceState =
    applySlowInitialFailedSaves(
      initialSlowOccurrenceState,
      exampleSlowSource,
      Set(1, 2)
    ).occurrence

  run test_failed_saves_apply_every_active_penalty = all {
    assert(legalSlowOccurrenceState(exampleActiveSlow)),
    assert(slowAffectedTargetCount(exampleActiveSlow) == 2),
    assert(slowEffectiveSpeed(exampleActiveSlow, 1, 30) == 15),
    assert(slowEffectiveSpeed(exampleActiveSlow, 1, 40) == 20),
    assert(slowEffectiveArmorClass(exampleActiveSlow, 1, 10) == 8),
    assert(slowDexteritySavingThrowDelta(exampleActiveSlow, 1) == -2),
    assert(not(slowTargetCanReact(exampleActiveSlow, 1))),
    assert(slowEffectiveSpeed(exampleActiveSlow, 3, 30) == 30),
    assert(slowEffectiveArmorClass(exampleActiveSlow, 3, 10) == 10),
    assert(slowDexteritySavingThrowDelta(exampleActiveSlow, 3) == 0),
    assert(slowTargetCanReact(exampleActiveSlow, 3)),
  }

  run test_restricted_turn_spends_at_most_one_action_kind_and_caps_attacks = {
    val unused = beginSlowTargetTurn(exampleActiveSlow, 1)
    val attackAction = applySlowTurnAction(unused, SlowAttackAction)
    val firstAttack = applySlowAttackActionAttack(attackAction)
    val rejectedSecondAttack = applySlowAttackActionAttack(firstAttack)
    val rejectedBonusAfterAction = applySlowTurnBonusAction(firstAttack)
    val bonusAction = applySlowTurnBonusAction(unused)
    val rejectedActionAfterBonus = applySlowTurnAction(
      bonusAction,
      SlowOtherAction
    )
    all {
      assert(unused == SlowTurnRestrictedUnused),
      assert(slowTurnCanSpendAction(unused)),
      assert(slowTurnCanSpendBonusAction(unused)),
      assert(slowTurnDoesNotSpendBothActionAndBonusAction(unused)),
      assert(slowTurnAttackCount(firstAttack) == 1),
      assert(not(canMakeSlowAttackActionAttack(firstAttack))),
      assert(rejectedSecondAttack == firstAttack),
      assert(rejectedBonusAfterAction == firstAttack),
      assert(rejectedActionAfterBonus == bonusAction),
      assert(slowTurnDoesNotSpendBothActionAndBonusAction(firstAttack)),
      assert(slowTurnDoesNotSpendBothActionAndBonusAction(bonusAction)),
    }
  }

  run test_current_turn_prior_action_is_reconciled_without_bonus_action = {
    val reconciled = beginSlowTargetTurnAfterPriorAction(
      exampleActiveSlow,
      1,
      SlowOtherAction
    )
    all {
      assert(slowTurnActionSpent(reconciled)),
      assert(not(slowTurnBonusActionSpent(reconciled))),
      assert(not(slowTurnCanSpendBonusAction(reconciled))),
      assert(slowTurnDoesNotSpendBothActionAndBonusAction(reconciled)),
    }
  }

  run test_current_turn_prior_bonus_action_is_reconciled_without_action = {
    val reconciled = beginSlowTargetTurnAfterPriorBonusAction(
      exampleActiveSlow,
      1
    )
    all {
      assert(not(slowTurnActionSpent(reconciled))),
      assert(slowTurnBonusActionSpent(reconciled)),
      assert(not(slowTurnCanSpendAction(reconciled))),
      assert(slowTurnDoesNotSpendBothActionAndBonusAction(reconciled)),
    }
  }

  run test_effective_somatic_component_requires_25_percent_outcome = {
    val required = requestSlowSomaticResolution(exampleActiveSlow, 1, true)
    val failed = applySlowSomaticFailureOutcome(
      required,
      SlowSomaticSpellFailed
    )
    val succeeded = applySlowSomaticFailureOutcome(
      required,
      SlowSomaticSpellSucceeded
    )
    val noEffectiveSomatic = requestSlowSomaticResolution(
      exampleActiveSlow,
      1,
      false
    )
    val unaffectedCaster = requestSlowSomaticResolution(
      exampleActiveSlow,
      3,
      true
    )
    all {
      assert(required == SlowSomaticFailureOutcomeRequired({
        failurePercent: 25,
      })),
      assert(slowSomaticOutcomeRequired(required)),
      assert(failed == SlowSomaticSpellFailedAfterResourceSpend),
      assert(slowSomaticFailureSpentCastResources(failed)),
      assert(not(slowSomaticSpellEffectMayApply(failed))),
      assert(not(slowSomaticFailureStartsNewConcentration(failed))),
      assert(slowSomaticSpellEffectMayApply(succeeded)),
      assert(noEffectiveSomatic == SlowSomaticSpellContinues),
      assert(unaffectedCaster == SlowSomaticSpellContinues),
    }
  }

  run test_repeat_save_cleans_exact_target_and_last_target_ends_concentration = {
    val firstRequest = requestSlowRepeatSave(exampleActiveSlow, 1)
    val failedAgain = applySlowRepeatSaveOutcome(
      exampleActiveSlow,
      firstRequest,
      SlowSaveFailed
    )
    val firstSaved = applySlowRepeatSaveOutcome(
      exampleActiveSlow,
      firstRequest,
      SlowSaveSucceeded
    )
    val lastRequest = requestSlowRepeatSave(firstSaved.occurrence, 2)
    val lastSaved = applySlowRepeatSaveOutcome(
      firstSaved.occurrence,
      lastRequest,
      SlowSaveSucceeded
    )
    all {
      assert(failedAgain.occurrence == exampleActiveSlow),
      assert(failedAgain.concentrationCommand == SlowSourceConcentrationUnchanged),
      assert(not(slowTargetAffected(firstSaved.occurrence, 1))),
      assert(slowTargetAffected(firstSaved.occurrence, 2)),
      assert(firstSaved.concentrationCommand == SlowSourceConcentrationUnchanged),
      assert(lastSaved.occurrence == SlowOccurrenceAbsent),
      assert(lastSaved.concentrationCommand == SlowSourceConcentrationEndRequired),
    }
  }

  run test_typed_concentration_and_duration_signals_clean_only_matching_occurrence = {
    val otherSource = { casterRef: 0, procedureExecutionRef: 8 }
    val stale = applySlowOccurrenceCleanupSignal(
      exampleActiveSlow,
      SlowSourceConcentrationEnded({ source: otherSource })
    )
    val concentrationEnded = applySlowOccurrenceCleanupSignal(
      exampleActiveSlow,
      SlowSourceConcentrationEnded({ source: exampleSlowSource })
    )
    val durationExpired = applySlowOccurrenceCleanupSignal(
      exampleActiveSlow,
      SlowDurationExpired({ source: exampleSlowSource })
    )
    all {
      assert(stale.occurrence == exampleActiveSlow),
      assert(concentrationEnded.occurrence == SlowOccurrenceAbsent),
      assert(concentrationEnded.concentrationCommand == SlowSourceConcentrationUnchanged),
      assert(durationExpired.occurrence == SlowOccurrenceAbsent),
      assert(durationExpired.concentrationCommand == SlowSourceConcentrationEndRequired),
    }
  }

  run test_cleanup_releases_only_the_slow_turn_restriction = {
    val actionSpent = applySlowTurnAction(
      beginSlowTargetTurn(exampleActiveSlow, 1),
      SlowOtherAction
    )
    val bonusActionSpent = applySlowTurnBonusAction(
      beginSlowTargetTurn(exampleActiveSlow, 1)
    )
    val concentrationEnded = applySlowOccurrenceCleanupSignal(
      exampleActiveSlow,
      SlowSourceConcentrationEnded({ source: exampleSlowSource })
    )
    val durationExpired = applySlowOccurrenceCleanupSignal(
      exampleActiveSlow,
      SlowDurationExpired({ source: exampleSlowSource })
    )
    val concentrationAfterAction =
      reconcileSlowTargetTurnAfterOccurrenceTransition(
        concentrationEnded.occurrence,
        1,
        actionSpent
      )
    val concentrationAfterBonusAction =
      reconcileSlowTargetTurnAfterOccurrenceTransition(
        concentrationEnded.occurrence,
        1,
        bonusActionSpent
      )
    val durationAfterAction =
      reconcileSlowTargetTurnAfterOccurrenceTransition(
        durationExpired.occurrence,
        1,
        actionSpent
      )
    val durationAfterBonusAction =
      reconcileSlowTargetTurnAfterOccurrenceTransition(
        durationExpired.occurrence,
        1,
        bonusActionSpent
      )
    all {
      assert(concentrationAfterAction == SlowTurnUnrestricted),
      assert(slowTurnCanSpendBonusAction(concentrationAfterAction)),
      assert(concentrationAfterBonusAction == SlowTurnUnrestricted),
      assert(slowTurnCanSpendAction(concentrationAfterBonusAction)),
      assert(durationAfterAction == SlowTurnUnrestricted),
      assert(slowTurnCanSpendBonusAction(durationAfterAction)),
      assert(durationAfterBonusAction == SlowTurnUnrestricted),
      assert(slowTurnCanSpendAction(durationAfterBonusAction)),
    }
  }

  // A successful repeat save is resolved at End Turn. Reconciliation still
  // removes the ended Slow restriction, but this example makes no claim that
  // the target can spend another resource after its turn has ended.
  run test_last_target_repeat_save_reconciles_the_ended_restriction = {
    val oneTargetSlow = applySlowInitialFailedSaves(
      initialSlowOccurrenceState,
      exampleSlowSource,
      Set(1)
    ).occurrence
    val actionSpent = applySlowTurnAction(
      beginSlowTargetTurn(oneTargetSlow, 1),
      SlowOtherAction
    )
    val request = requestSlowRepeatSave(oneTargetSlow, 1)
    val saved = applySlowRepeatSaveOutcome(
      oneTargetSlow,
      request,
      SlowSaveSucceeded
    )
    val reconciled = reconcileSlowTargetTurnAfterOccurrenceTransition(
      saved.occurrence,
      1,
      actionSpent
    )
    all {
      assert(saved.occurrence == SlowOccurrenceAbsent),
      assert(saved.concentrationCommand == SlowSourceConcentrationEndRequired),
      assert(reconciled == SlowTurnUnrestricted),
    }
  }

  run test_slow_derives_one_source_bound_listed_multiattack_dispatch = {
    val binding = { sourceOwnerRef: 1, multiattackProcedureExecutionRef: 4 }
    val otherBinding = { sourceOwnerRef: 1, multiattackProcedureExecutionRef: 5 }
    val profile = {
      binding: binding,
      dispatchProfile: { dispatchProcedureRefs: List(0, 0, 1) },
    }
    val activated = activateSlowStatBlockMultiattack(
      initialSlowStatBlockMultiattackState,
      exampleActiveSlow,
      profile
    )
    val wrongSourceRequest = {
      binding: otherBinding,
      attackProcedureRef: 1,
    }
    val chosenRequest = { binding: binding, attackProcedureRef: 1 }
    val wrongSource = resolveSlowStatBlockMultiattackDispatch(
      activated,
      wrongSourceRequest
    )
    val chosenNonFirst = resolveSlowStatBlockMultiattackDispatch(
      activated,
      chosenRequest
    )
    all {
      assert(legalSlowStatBlockMultiattackState(activated)),
      assert(slowStatBlockMultiattackHasBinding(activated, binding)),
      assert(slowStatBlockMultiattackPendingProcedureRefs(activated) == List(0, 0, 1)),
      assert(slowStatBlockMultiattackDispatchResourceCount(activated) == 1),
      assert(slowStatBlockMultiattackOneListedAllowanceActive(activated)),
      assert(slowStatBlockMultiattackContinuationOpen(activated)),
      assert(slowStatBlockMultiattackSubjectPermitted(
        activated,
        binding,
        StatBlockMovementSubject
      )),
      assert(not(slowStatBlockMultiattackSubjectPermitted(
        activated,
        binding,
        StatBlockBonusActionSubject
      ))),
      assert(not(canResolveSlowStatBlockMultiattackDispatch(
        activated,
        wrongSourceRequest
      ))),
      assert(wrongSource == activated),
      assert(not(slowStatBlockMultiattackContinuationOpen(chosenNonFirst))),
      assert(slowStatBlockMultiattackDispatchResourceCount(chosenNonFirst) == 0),
    }
  }

  run test_multiattack_allowance_is_captured_at_atomic_activation = {
    val binding = { sourceOwnerRef: 1, multiattackProcedureExecutionRef: 4 }
    val profile = {
      binding: binding,
      dispatchProfile: { dispatchProcedureRefs: List(0, 0, 1) },
    }
    val unrestrictedActivation = activateSlowStatBlockMultiattack(
      initialSlowStatBlockMultiattackState,
      initialSlowOccurrenceState,
      profile
    )
    val targetSave = requestSlowRepeatSave(exampleActiveSlow, 1)
    val slowRemoved = applySlowRepeatSaveOutcome(
      exampleActiveSlow,
      targetSave,
      SlowSaveSucceeded
    ).occurrence
    val slowedActivation = activateSlowStatBlockMultiattack(
      initialSlowStatBlockMultiattackState,
      exampleActiveSlow,
      profile
    )
    all {
      assert(slowTargetAffected(exampleActiveSlow, 1)),
      assert(not(slowTargetAffected(initialSlowOccurrenceState, 1))),
      assert(slowStatBlockMultiattackDispatchResourceCount(unrestrictedActivation) == 3),
      assert(not(slowStatBlockMultiattackOneListedAllowanceActive(unrestrictedActivation))),
      assert(not(slowTargetAffected(slowRemoved, 1))),
      assert(slowStatBlockMultiattackDispatchResourceCount(slowedActivation) == 1),
      assert(slowStatBlockMultiattackOneListedAllowanceActive(slowedActivation)),
    }
  }
}
