// -*- mode: Bluespec; -*-

module battleRuntimeSlowActivePenaltiesMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"
  import spellSlowActivePenaltiesCore.* from "../shared-algebras/proofs/rule-core/spell-slow-active-penalties-core"
  import spellSlowStatBlockMultiattackCore.* from "../shared-algebras/proofs/rule-core/spell-slow-stat-block-multiattack-core"

  // This focused replay projects production state from the reusable semantic
  // cores. It is intentionally still a bounded battle fixture, not a semantic
  // owner in its own right. Generic Action and Bonus Action availability is a
  // literal projection input checked against production; the Slow core
  // contributes only its temporary legality gate.
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
    | SpentBonusAction
    | ConcentrationEndedAfterAction
    | DurationExpiredAfterBonusAction
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

  type GenericActionAvailabilityProjection = {
    actionAvailable: bool,
    bonusActionAvailable: bool,
  }

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
      | SlowTurnRestrictedAttackActionOneAttackAvailable => "action"
      | SlowTurnRestrictedAttackActionNoAttackAvailable => "action"
      | SlowTurnRestrictedOtherActionUsed => "action"
      | SlowTurnRestrictedBonusActionUsed => "bonusAction"
    }

  pure def qTurnCanMakeAttack(turn: SlowTargetTurnState): bool =
    match turn {
      | SlowTurnUnrestricted => true
      | SlowTurnRestrictedUnused => true
      | SlowTurnRestrictedAttackActionOneAttackAvailable => true
      | _ => false
    }

  pure def qSomaticFailurePercent(
    somatic: SlowSomaticResolutionState
  ): int =
    match somatic {
      | SlowSomaticFailureOutcomeRequired => slowSomaticFailurePercent
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

  pure def qMultiattackSourceOwnerObserved(
    multiattack: SlowStatBlockMultiattackState
  ): bool = all {
    slowStatBlockMultiattackContinuationOpen(multiattack),
    slowStatBlockMultiattackSourceOwnerMatches(
      multiattack,
      qMultiattackBinding.sourceOwnerRef
    ),
  }

  pure def qMultiattackSourceProcedureObserved(
    multiattack: SlowStatBlockMultiattackState
  ): bool = all {
    slowStatBlockMultiattackContinuationOpen(multiattack),
    slowStatBlockMultiattackProcedureExecutionMatches(
      multiattack,
      qMultiattackBinding.multiattackProcedureExecutionRef
    ),
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

  action recordSlowStateWithGenericActionAvailability(
    currentTurnRole: str,
    occurrence: SlowOccurrenceState,
    turn: SlowTargetTurnState,
    genericAvailability: GenericActionAvailabilityProjection,
    somatic: SlowSomaticResolutionState,
    multiattack: SlowStatBlockMultiattackState,
    scenarioOutcome: SlowActivePenaltiesScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      currentTurnRole: currentTurnRole,
      turnActionOrBonusChoice: qTurnChoice(turn),
      targetTurnCanSpendAction:
        currentTurnRole != "caster" and
          genericAvailability.actionAvailable and
          slowTurnCanSpendAction(turn),
      targetTurnCanSpendBonusAction:
        currentTurnRole != "caster" and
          genericAvailability.bonusActionAvailable and
          slowTurnCanSpendBonusAction(turn),
      targetCanMakeAttack:
        currentTurnRole == "target" and
          genericAvailability.actionAvailable and
          qTurnCanMakeAttack(turn),
      extraAttackResourceCount: 0,
      casterTurnCanSpendBonusAction:
        currentTurnRole == "caster" and
          genericAvailability.bonusActionAvailable and
          slowTurnCanSpendBonusAction(turn),
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
        qMultiattackSourceOwnerObserved(multiattack),
      statBlockMultiattackSourceProcedureMatches:
        qMultiattackSourceProcedureObserved(multiattack),
      statBlockMultiattackContinuationOpen:
        slowStatBlockMultiattackContinuationOpen(multiattack),
      statBlockMultiattackChosenProcedurePermitted:
        qMultiattackChosenProcedurePermitted(multiattack),
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action recordSlowState(
    currentTurnRole: str,
    occurrence: SlowOccurrenceState,
    turn: SlowTargetTurnState,
    somatic: SlowSomaticResolutionState,
    multiattack: SlowStatBlockMultiattackState,
    scenarioOutcome: SlowActivePenaltiesScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool =
    recordSlowStateWithGenericActionAvailability(
      currentTurnRole,
      occurrence,
      turn,
      { actionAvailable: true, bonusActionAvailable: true },
      somatic,
      multiattack,
      scenarioOutcome,
      protocol
    )

  action init = recordSlowState(
    "caster",
    initialSlowOccurrenceState,
    SlowTurnUnrestricted,
    initialSlowSomaticResolutionState,
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
      initialSlowSomaticResolutionState,
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
      beginSlowTargetTurn(
        qSingleTargetSlow,
        1,
        SlowTurnUnrestricted
      ),
      initialSlowSomaticResolutionState,
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
      beginSlowTargetTurn(
        qSingleTargetSlow,
        1,
        SlowTurnUnrestricted
      ),
      initialSlowSomaticResolutionState,
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
        initialSlowSomaticResolutionState,
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
        initialSlowSomaticResolutionState,
        initialSlowStatBlockMultiattackState,
        FailedAgain,
        witnessResolved(NoHole)
      ),
    }
  }

  action doSpendTargetAction = {
    val spent = applySlowTurnAction(
      beginSlowTargetTurn(
        qSingleTargetSlow,
        1,
        SlowTurnUnrestricted
      ),
      SlowOtherAction
    )
    all {
      qState.scenarioOutcome == TargetTurn,
      recordSlowState(
        "target",
        qSingleTargetSlow,
        spent,
        initialSlowSomaticResolutionState,
        initialSlowStatBlockMultiattackState,
        SpentAction,
        witnessResolved(NoHole)
      ),
    }
  }

  action doSpendTargetBonusAction = {
    val spent = applySlowTurnBonusAction(
      beginSlowTargetTurn(
        qSingleTargetSlow,
        1,
        SlowTurnUnrestricted
      )
    )
    all {
      qState.scenarioOutcome == TargetTurn,
      recordSlowStateWithGenericActionAvailability(
        "target",
        qSingleTargetSlow,
        spent,
        { actionAvailable: true, bonusActionAvailable: false },
        initialSlowSomaticResolutionState,
        initialSlowStatBlockMultiattackState,
        SpentBonusAction,
        witnessResolved(NoHole)
      ),
    }
  }

  action doEndSlowConcentrationAfterAction = {
    val spent = applySlowTurnAction(
      beginSlowTargetTurn(
        qSingleTargetSlow,
        1,
        SlowTurnUnrestricted
      ),
      SlowOtherAction
    )
    val cleaned = applySlowOccurrenceCleanupSignal(
      qSingleTargetSlow,
      SlowSourceConcentrationEnded({ source: qSlowSource })
    )
    val reconciled = reconcileSlowTargetTurnAfterOccurrenceTransition(
      cleaned.occurrence,
      1,
      spent
    )
    all {
      qState.scenarioOutcome == SpentAction,
      recordSlowStateWithGenericActionAvailability(
        "target",
        cleaned.occurrence,
        reconciled,
        { actionAvailable: false, bonusActionAvailable: true },
        initialSlowSomaticResolutionState,
        initialSlowStatBlockMultiattackState,
        ConcentrationEndedAfterAction,
        witnessResolved(NoHole)
      ),
    }
  }

  action doExpireSlowDurationAfterBonusAction = {
    val spent = applySlowTurnBonusAction(
      beginSlowTargetTurn(
        qSingleTargetSlow,
        1,
        SlowTurnUnrestricted
      )
    )
    val cleaned = applySlowOccurrenceCleanupSignal(
      qSingleTargetSlow,
      SlowDurationExpired({ source: qSlowSource })
    )
    val reconciled = reconcileSlowTargetTurnAfterOccurrenceTransition(
      cleaned.occurrence,
      1,
      spent
    )
    all {
      qState.scenarioOutcome == SpentBonusAction,
      recordSlowStateWithGenericActionAvailability(
        "target",
        cleaned.occurrence,
        reconciled,
        { actionAvailable: true, bonusActionAvailable: false },
        initialSlowSomaticResolutionState,
        initialSlowStatBlockMultiattackState,
        DurationExpiredAfterBonusAction,
        witnessResolved(NoHole)
      ),
    }
  }

  action doMakeTargetAttack = {
    val attackAction = applySlowTurnAction(
      beginSlowTargetTurn(
        qSingleTargetSlow,
        1,
        SlowTurnUnrestricted
      ),
      SlowAttackAction
    )
    val attacked = applySlowAttackActionAttack(attackAction)
    all {
      qState.scenarioOutcome == TargetTurn,
      recordSlowState(
        "target",
        qSingleTargetSlow,
        attacked,
        initialSlowSomaticResolutionState,
        initialSlowStatBlockMultiattackState,
        AttackedOnce,
        witnessResolved(NoHole)
      ),
    }
  }

  action doRequestSomaticFailure = {
    val requested = requestSlowSomaticResolution(
      initialSlowSomaticResolutionState,
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
        beginSlowTargetTurn(
          qSingleTargetSlow,
          1,
          SlowTurnUnrestricted
        ),
        requested,
        initialSlowStatBlockMultiattackState,
        NeedsSomaticFailure,
        witnessNeedsHoles(Set(SomaticFailure))
      ),
    }
  }

  action doFillSomaticSpellFailure = {
    val requested = requestSlowSomaticResolution(
      initialSlowSomaticResolutionState,
      qSingleTargetSlow,
      1,
      true
    )
    val failed = applySlowSomaticFailureOutcome(
      requested,
      SlowSomaticSpellFailed
    )
    val spentBonus = applySlowTurnBonusAction(
      beginSlowTargetTurn(
        qSingleTargetSlow,
        1,
        SlowTurnUnrestricted
      )
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
      beginSlowTargetTurnAfterPriorAction(
        qSelfSlow,
        0,
        SlowTurnUnrestricted,
        SlowOtherAction
      ),
      initialSlowSomaticResolutionState,
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
      beginSlowTargetTurnAfterPriorBonusAction(
        qSelfSlow,
        0,
        SlowTurnUnrestricted
      ),
      initialSlowSomaticResolutionState,
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
      initialSlowSomaticResolutionState,
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
      beginSlowTargetTurn(
        qMultiattackTargetSlow,
        3,
        SlowTurnUnrestricted
      ),
      initialSlowSomaticResolutionState,
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
        beginSlowTargetTurn(
          qMultiattackTargetSlow,
          3,
          SlowTurnUnrestricted
        ),
        SlowAttackAction
      ),
      initialSlowSomaticResolutionState,
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
          beginSlowTargetTurn(
            qMultiattackTargetSlow,
            3,
            SlowTurnUnrestricted
          ),
          SlowAttackAction
        )
      ),
      initialSlowSomaticResolutionState,
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
      initialSlowSomaticResolutionState,
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
      beginSlowTargetTurn(
        qTwoTargetSlow,
        1,
        SlowTurnUnrestricted
      ),
      initialSlowSomaticResolutionState,
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
      beginSlowTargetTurn(
        qTwoTargetSlow,
        1,
        SlowTurnUnrestricted
      ),
      initialSlowSomaticResolutionState,
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
        beginSlowTargetTurn(
          saved.occurrence,
          2,
          SlowTurnUnrestricted
        ),
        initialSlowSomaticResolutionState,
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
        initialSlowSomaticResolutionState,
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
        initialSlowSomaticResolutionState,
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
      ConcentrationEndedAfterAction,
      DurationExpiredAfterBonusAction,
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
    doSpendTargetBonusAction,
    doEndSlowConcentrationAfterAction,
    doExpireSlowDurationAfterBonusAction,
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
