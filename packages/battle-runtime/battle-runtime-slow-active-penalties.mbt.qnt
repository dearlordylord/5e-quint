// -*- mode: Bluespec; -*-

module battleRuntimeSlowActivePenaltiesMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"
  import spellSlowActivePenaltiesCore.* from "../shared-algebras/proofs/rule-core/spell-slow-active-penalties-core"
  import spellSlowStatBlockMultiattackCore.* from "../shared-algebras/proofs/rule-core/spell-slow-stat-block-multiattack-core"

  // This focused replay projects production state from the reusable semantic
  // cores. It is intentionally still a bounded battle fixture, not a semantic
  // owner in its own right.
  type Hole =
    | NoHole
    | EndTurnSave
    | SomaticFailure

  type SlowActivePenaltiesScenarioOutcome =
    | Init
    | FailedSave
    | TargetTurn
    | NeedsSave
    | Saved
    | FailedAgain
    | SpentAction
    | AttackedOnce
    | NeedsSomaticFailure
    | SomaticSpellFailed
    | SelfFailedSave
    | PriorBonusActionReconciled
    | MultiattackFailedSave
    | MultiattackTargetTurn
    | MultiattackActivated
    | MultiattackDispatched
    | TwoTargetsFailedSave
    | TwoTargetsTargetTurn
    | TwoTargetsNeedSave
    | OneTargetSaved
    | ConcentrationEnded
    | DurationExpired

  type SlowActivePenaltiesWitnessState = {
    currentTurnRole: str,
    turnActionOrBonusChoice: str,
    targetTurnCanSpendAction: bool,
    targetTurnCanSpendBonusAction: bool,
    targetCanMakeAttack: bool,
    extraAttackResourceCount: int,
    casterTurnCanSpendBonusAction: bool,
    targetSlowed: bool,
    secondTargetSlowed: bool,
    multiattackTargetSlowed: bool,
    affectedTargetCount: int,
    targetSpeedFeet: int,
    targetArmorClass: int,
    dexteritySavingThrowDelta: int,
    targetCanReact: bool,
    casterConcentrating: bool,
    somaticFailurePercent: int,
    somaticFailureSpentCastResources: bool,
    somaticSpellEffectMayApply: bool,
    somaticFailureStartedConcentration: bool,
    statBlockMultiattackResourceCount: int,
    statBlockMultiattackDispatchKind: str,
    statBlockMultiattackPendingProcedureRefs: List[int],
    statBlockMultiattackSourceOwnerMatches: bool,
    statBlockMultiattackSourceProcedureMatches: bool,
    statBlockMultiattackContinuationOpen: bool,
    statBlockMultiattackChosenProcedurePermitted: bool,
    scenarioOutcome: SlowActivePenaltiesScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SlowActivePenaltiesWitnessState

  pure def qSlowSource: SlowEffectSource = {
    casterRef: 0,
    procedureExecutionRef: 7,
  }

  pure def qSingleTargetSlow: SlowOccurrenceState =
    applySlowInitialFailedSaves(
      initialSlowOccurrenceState,
      qSlowSource,
      Set(1)
    ).occurrence

  pure def qTwoTargetSlow: SlowOccurrenceState =
    applySlowInitialFailedSaves(
      initialSlowOccurrenceState,
      qSlowSource,
      Set(1, 2)
    ).occurrence

  pure def qSelfSlow: SlowOccurrenceState =
    applySlowInitialFailedSaves(
      initialSlowOccurrenceState,
      qSlowSource,
      Set(0)
    ).occurrence

  pure def qMultiattackTargetSlow: SlowOccurrenceState =
    applySlowInitialFailedSaves(
      initialSlowOccurrenceState,
      qSlowSource,
      Set(3)
    ).occurrence

  pure def qMultiattackBinding: SlowStatBlockMultiattackBinding = {
    sourceOwnerRef: 3,
    multiattackProcedureExecutionRef: 4,
  }

  pure def qMultiattackProfile: SlowStatBlockMultiattackProfile = {
    binding: qMultiattackBinding,
    dispatchProfile: { dispatchProcedureRefs: List(0, 0, 1) },
  }

  pure def qSlowedMultiattackActivated: SlowStatBlockMultiattackState =
    activateSlowStatBlockMultiattack(
      initialSlowStatBlockMultiattackState,
      qMultiattackTargetSlow,
      qMultiattackProfile
    )

  pure def qSlowedMultiattackDispatched: SlowStatBlockMultiattackState =
    resolveSlowStatBlockMultiattackDispatch(
      qSlowedMultiattackActivated,
      {
        binding: qMultiattackBinding,
        attackProcedureRef: 1,
      }
    )

  pure def qTurnChoice(turn: SlowTargetTurnState): str =
    match turn {
      | SlowTurnUnrestricted => "notRestricted"
      | SlowTurnRestrictedUnused => "notChosen"
      | SlowTurnRestrictedActionUsed(_) => "action"
      | SlowTurnRestrictedBonusActionUsed => "bonusAction"
    }

  pure def qTurnCanMakeAttack(turn: SlowTargetTurnState): bool =
    match turn {
      | SlowTurnRestrictedUnused => true
      | SlowTurnRestrictedActionUsed(data) => all {
          data.actionKind == SlowAttackAction,
          data.attackCount == 0,
        }
      | _ => false
    }

  pure def qSomaticFailurePercent(
    somatic: SlowSomaticResolutionState
  ): int =
    match somatic {
      | SlowSomaticFailureOutcomeRequired(data) => data.failurePercent
      | _ => 0
    }

  pure def qMultiattackDispatchKind(
    multiattack: SlowStatBlockMultiattackState
  ): str =
    if (slowStatBlockMultiattackDispatchResourceCount(multiattack) == 0)
      "none"
    else if (slowStatBlockMultiattackOneListedAllowanceActive(multiattack))
      "oneListedChoice"
    else "listedOccurrences"

  pure def qMultiattackBindingObserved(
    multiattack: SlowStatBlockMultiattackState
  ): bool = all {
    slowStatBlockMultiattackContinuationOpen(multiattack),
    slowStatBlockMultiattackHasBinding(multiattack, qMultiattackBinding),
  }

  pure def qMultiattackChosenProcedurePermitted(
    multiattack: SlowStatBlockMultiattackState
  ): bool =
    canResolveSlowStatBlockMultiattackDispatch(
      multiattack,
      {
        binding: qMultiattackBinding,
        attackProcedureRef: 1,
      }
    )

  action recordSlowState(
    currentTurnRole: str,
    occurrence: SlowOccurrenceState,
    turn: SlowTargetTurnState,
    somatic: SlowSomaticResolutionState,
    multiattack: SlowStatBlockMultiattackState,
    scenarioOutcome: SlowActivePenaltiesScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      currentTurnRole: currentTurnRole,
      turnActionOrBonusChoice: qTurnChoice(turn),
      targetTurnCanSpendAction:
        currentTurnRole != "caster" and slowTurnCanSpendAction(turn),
      targetTurnCanSpendBonusAction:
        currentTurnRole != "caster" and slowTurnCanSpendBonusAction(turn),
      targetCanMakeAttack:
        currentTurnRole == "target" and qTurnCanMakeAttack(turn),
      extraAttackResourceCount: 0,
      casterTurnCanSpendBonusAction:
        currentTurnRole == "caster" and slowTurnCanSpendBonusAction(turn),
      targetSlowed: slowTargetAffected(occurrence, 1),
      secondTargetSlowed: slowTargetAffected(occurrence, 2),
      multiattackTargetSlowed: slowTargetAffected(occurrence, 3),
      affectedTargetCount: slowAffectedTargetCount(occurrence),
      targetSpeedFeet: slowEffectiveSpeed(occurrence, 1, 30),
      targetArmorClass: slowEffectiveArmorClass(occurrence, 1, 10),
      dexteritySavingThrowDelta:
        slowDexteritySavingThrowDelta(occurrence, 1),
      targetCanReact: slowTargetCanReact(occurrence, 1),
      casterConcentrating: slowAffectedTargetCount(occurrence) > 0,
      somaticFailurePercent: qSomaticFailurePercent(somatic),
      somaticFailureSpentCastResources:
        slowSomaticFailureSpentCastResources(somatic),
      somaticSpellEffectMayApply: slowSomaticSpellEffectMayApply(somatic),
      somaticFailureStartedConcentration:
        slowSomaticFailureStartsNewConcentration(somatic),
      statBlockMultiattackResourceCount:
        slowStatBlockMultiattackDispatchResourceCount(multiattack),
      statBlockMultiattackDispatchKind:
        qMultiattackDispatchKind(multiattack),
      statBlockMultiattackPendingProcedureRefs:
        slowStatBlockMultiattackPendingProcedureRefs(multiattack),
      statBlockMultiattackSourceOwnerMatches:
        qMultiattackBindingObserved(multiattack),
      statBlockMultiattackSourceProcedureMatches:
        qMultiattackBindingObserved(multiattack),
      statBlockMultiattackContinuationOpen:
        slowStatBlockMultiattackContinuationOpen(multiattack),
      statBlockMultiattackChosenProcedurePermitted:
        qMultiattackChosenProcedurePermitted(multiattack),
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordSlowState(
    "caster",
    initialSlowOccurrenceState,
    SlowTurnUnrestricted,
    SlowSomaticCheckBypassed,
    initialSlowStatBlockMultiattackState,
    Init,
    witnessInit(NoHole)
  )

  action doCastSlowFailedSave = all {
    qState.scenarioOutcome == Init,
    recordSlowState(
      "caster",
      qSingleTargetSlow,
      SlowTurnUnrestricted,
      SlowSomaticCheckBypassed,
      initialSlowStatBlockMultiattackState,
      FailedSave,
      witnessResolved(NoHole)
    ),
  }

  action doEndCasterTurn = all {
    qState.scenarioOutcome == FailedSave,
    recordSlowState(
      "target",
      qSingleTargetSlow,
      beginSlowTargetTurn(qSingleTargetSlow, 1),
      SlowSomaticCheckBypassed,
      initialSlowStatBlockMultiattackState,
      TargetTurn,
      witnessResolved(NoHole)
    ),
  }

  action doRequestEndTurnSave = all {
    qState.scenarioOutcome == TargetTurn,
    requestSlowRepeatSave(qSingleTargetSlow, 1) != SlowRepeatSaveNotRequired,
    recordSlowState(
      "target",
      qSingleTargetSlow,
      beginSlowTargetTurn(qSingleTargetSlow, 1),
      SlowSomaticCheckBypassed,
      initialSlowStatBlockMultiattackState,
      NeedsSave,
      witnessNeedsHoles(Set(EndTurnSave))
    ),
  }

  action doFillEndTurnSaveSuccess = {
    val request = requestSlowRepeatSave(qSingleTargetSlow, 1)
    val saved = applySlowRepeatSaveOutcome(
      qSingleTargetSlow,
      request,
      SlowSaveSucceeded
    )
    all {
      qState.scenarioOutcome == NeedsSave,
      qState.protocol.holes == Set(EndTurnSave),
      saved.concentrationCommand == SlowSourceConcentrationEndRequired,
      recordSlowState(
        "caster",
        saved.occurrence,
        SlowTurnUnrestricted,
        SlowSomaticCheckBypassed,
        initialSlowStatBlockMultiattackState,
        Saved,
        witnessResolved(NoHole)
      ),
    }
  }

  action doFillEndTurnSaveFailure = {
    val request = requestSlowRepeatSave(qSingleTargetSlow, 1)
    val failed = applySlowRepeatSaveOutcome(
      qSingleTargetSlow,
      request,
      SlowSaveFailed
    )
    all {
      qState.scenarioOutcome == NeedsSave,
      qState.protocol.holes == Set(EndTurnSave),
      recordSlowState(
        "caster",
        failed.occurrence,
        SlowTurnUnrestricted,
        SlowSomaticCheckBypassed,
        initialSlowStatBlockMultiattackState,
        FailedAgain,
        witnessResolved(NoHole)
      ),
    }
  }

  action doSpendTargetAction = {
    val spent = applySlowTurnAction(
      beginSlowTargetTurn(qSingleTargetSlow, 1),
      SlowOtherAction
    )
    all {
      qState.scenarioOutcome == TargetTurn,
      recordSlowState(
        "target",
        qSingleTargetSlow,
        spent,
        SlowSomaticCheckBypassed,
        initialSlowStatBlockMultiattackState,
        SpentAction,
        witnessResolved(NoHole)
      ),
    }
  }

  action doMakeTargetAttack = {
    val attackAction = applySlowTurnAction(
      beginSlowTargetTurn(qSingleTargetSlow, 1),
      SlowAttackAction
    )
    val attacked = applySlowAttackActionAttack(attackAction)
    all {
      qState.scenarioOutcome == TargetTurn,
      recordSlowState(
        "target",
        qSingleTargetSlow,
        attacked,
        SlowSomaticCheckBypassed,
        initialSlowStatBlockMultiattackState,
        AttackedOnce,
        witnessResolved(NoHole)
      ),
    }
  }

  action doRequestSomaticFailure = {
    val requested = requestSlowSomaticResolution(
      qSingleTargetSlow,
      1,
      true
    )
    all {
      qState.scenarioOutcome == TargetTurn,
      slowSomaticOutcomeRequired(requested),
      recordSlowState(
        "target",
        qSingleTargetSlow,
        beginSlowTargetTurn(qSingleTargetSlow, 1),
        requested,
        initialSlowStatBlockMultiattackState,
        NeedsSomaticFailure,
        witnessNeedsHoles(Set(SomaticFailure))
      ),
    }
  }

  action doFillSomaticSpellFailure = {
    val requested = requestSlowSomaticResolution(
      qSingleTargetSlow,
      1,
      true
    )
    val failed = applySlowSomaticFailureOutcome(
      requested,
      SlowSomaticSpellFailed
    )
    val spentBonus = applySlowTurnBonusAction(
      beginSlowTargetTurn(qSingleTargetSlow, 1)
    )
    all {
      qState.scenarioOutcome == NeedsSomaticFailure,
      qState.protocol.holes == Set(SomaticFailure),
      recordSlowState(
        "target",
        qSingleTargetSlow,
        spentBonus,
        failed,
        initialSlowStatBlockMultiattackState,
        SomaticSpellFailed,
        witnessResolved(NoHole)
      ),
    }
  }

  action doCastSlowSelfFailedSave = all {
    qState.scenarioOutcome == Init,
    recordSlowState(
      "caster",
      qSelfSlow,
      beginSlowTargetTurnAfterPriorAction(qSelfSlow, 0, SlowOtherAction),
      SlowSomaticCheckBypassed,
      initialSlowStatBlockMultiattackState,
      SelfFailedSave,
      witnessResolved(NoHole)
    ),
  }

  action doReconcileSlowAfterPriorBonusAction = all {
    qState.scenarioOutcome == Init,
    recordSlowState(
      "caster",
      qSelfSlow,
      beginSlowTargetTurnAfterPriorBonusAction(qSelfSlow, 0),
      SlowSomaticCheckBypassed,
      initialSlowStatBlockMultiattackState,
      PriorBonusActionReconciled,
      witnessResolved(NoHole)
    ),
  }

  action doCastSlowMultiattackFailedSave = all {
    qState.scenarioOutcome == Init,
    recordSlowState(
      "caster",
      qMultiattackTargetSlow,
      SlowTurnUnrestricted,
      SlowSomaticCheckBypassed,
      initialSlowStatBlockMultiattackState,
      MultiattackFailedSave,
      witnessResolved(NoHole)
    ),
  }

  action doEndCasterTurnForMultiattackTarget = all {
    qState.scenarioOutcome == MultiattackFailedSave,
    recordSlowState(
      "multiattackTarget",
      qMultiattackTargetSlow,
      beginSlowTargetTurn(qMultiattackTargetSlow, 3),
      SlowSomaticCheckBypassed,
      initialSlowStatBlockMultiattackState,
      MultiattackTargetTurn,
      witnessResolved(NoHole)
    ),
  }

  action doActivateSlowedStatBlockMultiattack = all {
    qState.scenarioOutcome == MultiattackTargetTurn,
    slowStatBlockMultiattackOneListedAllowanceActive(
      qSlowedMultiattackActivated
    ),
    recordSlowState(
      "multiattackTarget",
      qMultiattackTargetSlow,
      applySlowTurnAction(
        beginSlowTargetTurn(qMultiattackTargetSlow, 3),
        SlowAttackAction
      ),
      SlowSomaticCheckBypassed,
      qSlowedMultiattackActivated,
      MultiattackActivated,
      witnessResolved(NoHole)
    ),
  }

  action doResolveChosenSlowedStatBlockMultiattackDispatch = all {
    qState.scenarioOutcome == MultiattackActivated,
    recordSlowState(
      "multiattackTarget",
      qMultiattackTargetSlow,
      applySlowAttackActionAttack(
        applySlowTurnAction(
          beginSlowTargetTurn(qMultiattackTargetSlow, 3),
          SlowAttackAction
        )
      ),
      SlowSomaticCheckBypassed,
      qSlowedMultiattackDispatched,
      MultiattackDispatched,
      witnessResolved(NoHole)
    ),
  }

  action doCastSlowTwoTargetsFailedSave = all {
    qState.scenarioOutcome == Init,
    recordSlowState(
      "caster",
      qTwoTargetSlow,
      SlowTurnUnrestricted,
      SlowSomaticCheckBypassed,
      initialSlowStatBlockMultiattackState,
      TwoTargetsFailedSave,
      witnessResolved(NoHole)
    ),
  }

  action doEndCasterTurnForTwoTargets = all {
    qState.scenarioOutcome == TwoTargetsFailedSave,
    recordSlowState(
      "target",
      qTwoTargetSlow,
      beginSlowTargetTurn(qTwoTargetSlow, 1),
      SlowSomaticCheckBypassed,
      initialSlowStatBlockMultiattackState,
      TwoTargetsTargetTurn,
      witnessResolved(NoHole)
    ),
  }

  action doRequestFirstTargetEndTurnSave = all {
    qState.scenarioOutcome == TwoTargetsTargetTurn,
    requestSlowRepeatSave(qTwoTargetSlow, 1) != SlowRepeatSaveNotRequired,
    recordSlowState(
      "target",
      qTwoTargetSlow,
      beginSlowTargetTurn(qTwoTargetSlow, 1),
      SlowSomaticCheckBypassed,
      initialSlowStatBlockMultiattackState,
      TwoTargetsNeedSave,
      witnessNeedsHoles(Set(EndTurnSave))
    ),
  }

  action doFillFirstTargetEndTurnSaveSuccess = {
    val request = requestSlowRepeatSave(qTwoTargetSlow, 1)
    val saved = applySlowRepeatSaveOutcome(
      qTwoTargetSlow,
      request,
      SlowSaveSucceeded
    )
    all {
      qState.scenarioOutcome == TwoTargetsNeedSave,
      qState.protocol.holes == Set(EndTurnSave),
      saved.concentrationCommand == SlowSourceConcentrationUnchanged,
      recordSlowState(
        "secondTarget",
        saved.occurrence,
        beginSlowTargetTurn(saved.occurrence, 2),
        SlowSomaticCheckBypassed,
        initialSlowStatBlockMultiattackState,
        OneTargetSaved,
        witnessResolved(NoHole)
      ),
    }
  }

  action doEndSlowConcentration = {
    val cleaned = applySlowOccurrenceCleanupSignal(
      qSingleTargetSlow,
      SlowSourceConcentrationEnded({ source: qSlowSource })
    )
    all {
      qState.scenarioOutcome == Init,
      recordSlowState(
        "caster",
        cleaned.occurrence,
        SlowTurnUnrestricted,
        SlowSomaticCheckBypassed,
        initialSlowStatBlockMultiattackState,
        ConcentrationEnded,
        witnessResolved(NoHole)
      ),
    }
  }

  action doExpireSlowDuration = {
    val cleaned = applySlowOccurrenceCleanupSignal(
      qSingleTargetSlow,
      SlowDurationExpired({ source: qSlowSource })
    )
    all {
      qState.scenarioOutcome == Init,
      cleaned.concentrationCommand == SlowSourceConcentrationEndRequired,
      recordSlowState(
        "caster",
        cleaned.occurrence,
        SlowTurnUnrestricted,
        SlowSomaticCheckBypassed,
        initialSlowStatBlockMultiattackState,
        DurationExpired,
        witnessResolved(NoHole)
      ),
    }
  }

  action doStutter = all {
    qState.scenarioOutcome.in(Set(
      Saved,
      FailedAgain,
      SpentAction,
      AttackedOnce,
      SomaticSpellFailed,
      SelfFailedSave,
      PriorBonusActionReconciled,
      MultiattackDispatched,
      OneTargetSaved,
      ConcentrationEnded,
      DurationExpired
    )),
    qState' = qState,
  }

  action step = any {
    doCastSlowFailedSave,
    doEndCasterTurn,
    doRequestEndTurnSave,
    doFillEndTurnSaveSuccess,
    doFillEndTurnSaveFailure,
    doSpendTargetAction,
    doMakeTargetAttack,
    doRequestSomaticFailure,
    doFillSomaticSpellFailure,
    doCastSlowSelfFailedSave,
    doReconcileSlowAfterPriorBonusAction,
    doCastSlowMultiattackFailedSave,
    doEndCasterTurnForMultiattackTarget,
    doActivateSlowedStatBlockMultiattack,
    doResolveChosenSlowedStatBlockMultiattackDispatch,
    doCastSlowTwoTargetsFailedSave,
    doEndCasterTurnForTwoTargets,
    doRequestFirstTargetEndTurnSave,
    doFillFirstTargetEndTurnSaveSuccess,
    doEndSlowConcentration,
    doExpireSlowDuration,
    doStutter,
  }
}
