// -*- mode: Bluespec; -*-

module ruleCoreReactionsMbt {
  import movementSpatialGrapple.* from "../shared-algebras/proofs/rule-core/movement-spatial-grapple"
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"

  var qInterruptedMovementSpentFeet: int
  var qReactorReactionAvailable: bool
  var qReactorReadiedMovementHeld: bool
  var qReactorReadiedSpellHeld: bool
  var qReactorMovementSpentFeet: int
  var qInterruptedConcentration: bool
  var qReactorConcentration: bool
  var qReactionWindow: ReactionWindowState
  var qPendingTrigger: str
  var qHoles: Set[str]
  var qLastConcentrationSaveDc: int
  var qLastResult: str
  var qLastInvalidReason: str

  pure def noPendingTrigger: str = "none"
  pure def opportunityAttackTrigger: str = "opportunityAttack"
  pure def attackHitTrigger: str = "attackHit"
  pure def movementResumeCostFeet: int = 10
  pure def readiedMovementShortCostFeet: int = 5
  pure def readiedMovementFillCostFeet: int = 10

  pure def qReactorTurn: TurnProcedureState =
    initialTurnProcedureState
      .with("reactionAvailable", qReactorReactionAvailable)
      .with("readiedMovementHeld", qReactorReadiedMovementHeld)

  pure def qReactor: MovementGrappleState =
    initialMovementGrappleState
      .with("turn", qReactorTurn)
      .with("speedFeet", 30)
      .with("movementSpentFeet", qReactorMovementSpentFeet)

  pure def qInterruptedActor: MovementGrappleState =
    initialMovementGrappleState
      .with("movementSpentFeet", qInterruptedMovementSpentFeet)

  pure def qConcentration: ActorConcentrationState = {
    interruptedActor: if (qInterruptedConcentration) Concentrating else NoConcentration,
    reactor: if (qReactorConcentration) Concentrating else NoConcentration,
  }

  pure def qReactionProtocolState: ReactionProtocolState = {
    interruptedActor: qInterruptedActor,
    reactor: qReactor,
    reactionWindow: qReactionWindow,
    concentration: qConcentration,
  }

  action clearSuccessfulHoles(result: str): bool = all {
    qHoles' = Set(),
    qLastResult' = result,
    qLastInvalidReason' = "none",
  }

  action recordProtocolState(
    state: ReactionProtocolState,
    pendingTrigger: str,
    holes: Set[str],
    result: str,
  ): bool = all {
    qInterruptedMovementSpentFeet' = state.interruptedActor.movementSpentFeet,
    qReactorReactionAvailable' = state.reactor.turn.reactionAvailable,
    qReactorReadiedMovementHeld' = state.reactor.turn.readiedMovementHeld,
    qReactorReadiedSpellHeld' = qReactorReadiedSpellHeld,
    qReactorMovementSpentFeet' = state.reactor.movementSpentFeet,
    qInterruptedConcentration' = state.concentration.interruptedActor == Concentrating,
    qReactorConcentration' = state.concentration.reactor == Concentrating,
    qReactionWindow' = state.reactionWindow,
    qPendingTrigger' = pendingTrigger,
    qHoles' = holes,
    qLastConcentrationSaveDc' = qLastConcentrationSaveDc,
    qLastResult' = result,
    qLastInvalidReason' = "none",
  }

  action recordInvalid(reason: str): bool = all {
    qInterruptedMovementSpentFeet' = qInterruptedMovementSpentFeet,
    qReactorReactionAvailable' = qReactorReactionAvailable,
    qReactorReadiedMovementHeld' = qReactorReadiedMovementHeld,
    qReactorReadiedSpellHeld' = qReactorReadiedSpellHeld,
    qReactorMovementSpentFeet' = qReactorMovementSpentFeet,
    qInterruptedConcentration' = qInterruptedConcentration,
    qReactorConcentration' = qReactorConcentration,
    qReactionWindow' = qReactionWindow,
    qPendingTrigger' = qPendingTrigger,
    qHoles' = qHoles,
    qLastConcentrationSaveDc' = qLastConcentrationSaveDc,
    qLastResult' = "invalid",
    qLastInvalidReason' = reason,
  }

  action init = all {
    qInterruptedMovementSpentFeet' = 0,
    qReactorReactionAvailable' = true,
    qReactorReadiedMovementHeld' = false,
    qReactorReadiedSpellHeld' = false,
    qReactorMovementSpentFeet' = 0,
    qInterruptedConcentration' = false,
    qReactorConcentration' = false,
    qReactionWindow' = NoReactionWindow,
    qPendingTrigger' = noPendingTrigger,
    qHoles' = Set(),
    qLastConcentrationSaveDc' = 0,
    qLastResult' = "init",
    qLastInvalidReason' = "none",
  }

  action doOfferOpportunityAttack = {
    val offered = offerOpportunityAttackReaction(qReactionProtocolState, {
      hostileCreature: true,
      observerCanSee: true,
      leavesReach: true,
      movementResource: OwnMovementActionBonusReactionOrSpeed,
    })
    all {
      qReactionWindow == NoReactionWindow,
      qHoles == Set(),
      recordProtocolState(
        offered,
        opportunityAttackTrigger,
        Set("ReactionDecision"),
        "needsHoles"
      ),
    }
  }

  action doDeclineOpportunityAttack = {
    val choice = resolveReactionChoice(qReactorTurn, qReactionWindow, DeclineReaction)
    val resumed = qReactionProtocolState
      .with("reactor", qReactor.with("turn", choice.turn))
      .with("reactionWindow", choice.reactionWindow)
      .with(
        "interruptedActor",
        qInterruptedActor.with(
          "movementSpentFeet",
          qInterruptedMovementSpentFeet + movementResumeCostFeet
        )
      )
    all {
      qPendingTrigger == opportunityAttackTrigger,
      qHoles == Set("ReactionDecision"),
      recordProtocolState(resumed, noPendingTrigger, Set(), "resolved"),
    }
  }

  action doReadyMovementFixture = {
    val readiedTurn = resolveReadyMovement(initialTurnProcedureState, true)
    all {
      qReactionWindow == NoReactionWindow,
      qHoles == Set(),
      qInterruptedMovementSpentFeet' = 0,
      qReactorReactionAvailable' = readiedTurn.reactionAvailable,
      qReactorReadiedMovementHeld' = readiedTurn.readiedMovementHeld,
      qReactorReadiedSpellHeld' = false,
      qReactorMovementSpentFeet' = 0,
      qInterruptedConcentration' = false,
      qReactorConcentration' = false,
      qReactionWindow' = qReactionWindow,
      qPendingTrigger' = noPendingTrigger,
      clearSuccessfulHoles("resolved"),
      qLastConcentrationSaveDc' = 0,
    }
  }

  action doOfferReadiedMovement = {
    val offered = qReactionProtocolState.with(
      "reactionWindow",
      offerReactionWindow(qReactionWindow, ReadiedMovementReactionWindow)
    )
    all {
      qReactionWindow == NoReactionWindow,
      qHoles == Set(),
      qReactorReadiedMovementHeld,
      recordProtocolState(
        offered,
        attackHitTrigger,
        Set("ReactionDecision"),
        "needsHoles"
      ),
    }
  }

  action doDeclineReadiedMovement = {
    val choice = resolveReactionChoice(qReactorTurn, qReactionWindow, DeclineReaction)
    val declined = qReactionProtocolState
      .with("reactor", qReactor.with("turn", choice.turn))
      .with("reactionWindow", choice.reactionWindow)
    all {
      qPendingTrigger == attackHitTrigger,
      qHoles == Set("ReactionDecision"),
      recordProtocolState(declined, noPendingTrigger, Set("DamageRoll"), "needsHoles"),
    }
  }

  action doTakeReadiedMovementShort = {
    val resolved = resolveReadiedMovementReaction(qReactionProtocolState, {
      distanceFeet: readiedMovementShortCostFeet,
      extraCostFeet: 0,
    })
    all {
      qPendingTrigger == attackHitTrigger,
      qHoles == Set("ReactionDecision"),
      recordProtocolState(resolved, noPendingTrigger, Set("DamageRoll"), "needsHoles"),
    }
  }

  action doTakeReadiedMovementFill = {
    val resolved = resolveReadiedMovementReaction(qReactionProtocolState, {
      distanceFeet: readiedMovementFillCostFeet,
      extraCostFeet: 0,
    })
    all {
      qPendingTrigger == attackHitTrigger,
      qHoles == Set("ReactionDecision"),
      recordProtocolState(resolved, noPendingTrigger, Set("DamageRoll"), "needsHoles"),
    }
  }

  action doRejectReadiedMovementZero = all {
    qPendingTrigger == attackHitTrigger,
    qHoles == Set("ReactionDecision"),
    recordInvalid("invalidFill"),
  }

  action doStartReactorConcentrationFixture = all {
    qReactionWindow == NoReactionWindow,
    qHoles == Set(),
    qInterruptedMovementSpentFeet' = qInterruptedMovementSpentFeet,
    qReactorReactionAvailable' = qReactorReactionAvailable,
    qReactorReadiedMovementHeld' = qReactorReadiedMovementHeld,
    qReactorReadiedSpellHeld' = qReactorReadiedSpellHeld,
    qReactorMovementSpentFeet' = qReactorMovementSpentFeet,
    qInterruptedConcentration' = qInterruptedConcentration,
    qReactorConcentration' = startConcentration(qConcentration, Reactor, true).reactor == Concentrating,
    qReactionWindow' = qReactionWindow,
    qPendingTrigger' = qPendingTrigger,
    clearSuccessfulHoles("resolved"),
    qLastConcentrationSaveDc' = qLastConcentrationSaveDc,
  }

  action doHoldReactorConcentrationAfterSmallDamage = {
    val resolved = resolveConcentrationAfterDamage(
      if (qReactorConcentration) Concentrating else NoConcentration,
      8,
      true
    )
    all {
      qReactionWindow == NoReactionWindow,
      qHoles == Set(),
      qInterruptedMovementSpentFeet' = qInterruptedMovementSpentFeet,
      qReactorReactionAvailable' = qReactorReactionAvailable,
      qReactorReadiedMovementHeld' = qReactorReadiedMovementHeld,
      qReactorReadiedSpellHeld' = qReactorReadiedSpellHeld,
      qReactorMovementSpentFeet' = qReactorMovementSpentFeet,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = resolved.concentration == Concentrating,
      qReactionWindow' = qReactionWindow,
      qPendingTrigger' = qPendingTrigger,
      clearSuccessfulHoles("resolved"),
      qLastConcentrationSaveDc' = resolved.saveDc,
    }
  }

  action doBreakReactorConcentrationAfterLargeDamage = {
    val resolved = resolveConcentrationAfterDamage(
      if (qReactorConcentration) Concentrating else NoConcentration,
      22,
      false
    )
    all {
      qReactionWindow == NoReactionWindow,
      qHoles == Set(),
      qInterruptedMovementSpentFeet' = qInterruptedMovementSpentFeet,
      qReactorReactionAvailable' = qReactorReactionAvailable,
      qReactorReadiedMovementHeld' = qReactorReadiedMovementHeld,
      qReactorReadiedSpellHeld' = qReactorReadiedSpellHeld,
      qReactorMovementSpentFeet' = qReactorMovementSpentFeet,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = resolved.concentration == Concentrating,
      qReactionWindow' = qReactionWindow,
      qPendingTrigger' = qPendingTrigger,
      clearSuccessfulHoles("resolved"),
      qLastConcentrationSaveDc' = resolved.saveDc,
    }
  }

  action step = any {
    doOfferOpportunityAttack,
    doDeclineOpportunityAttack,
    doReadyMovementFixture,
    doOfferReadiedMovement,
    doDeclineReadiedMovement,
    doTakeReadiedMovementShort,
    doTakeReadiedMovementFill,
    doRejectReadiedMovementZero,
    doStartReactorConcentrationFixture,
    doHoldReactorConcentrationAfterSmallDamage,
    doBreakReactorConcentrationAfterLargeDamage,
  }
}
