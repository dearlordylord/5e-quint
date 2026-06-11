// -*- mode: Bluespec; -*-

module ruleCoreReactionsMbt {
  import movementSpatialGrapple.* from "../shared-algebras/proofs/rule-core/movement-spatial-grapple"
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"

  // This computed rule-core driver is already at the closure budget from the
  // reaction/concentration rule-core imports. Keep the typed witness protocol
  // local here so the driver stays within the enforced import-count gate.
  type WitnessInvalidReason =
    | WInvalidFill

  type WitnessResult =
    | WInit
    | WNeedsHoles
    | WResolved
    | WInvalid(WitnessInvalidReason)

  type WitnessProtocol[h] = {
    holes: Set[h],
    result: WitnessResult,
  }

  pure def witnessInit(holeType: h): WitnessProtocol[h] = {
    holes: Set(),
    result: WInit,
  }

  pure def witnessNeedsHoles(holes: Set[h]): WitnessProtocol[h] = {
    holes: holes,
    result: WNeedsHoles,
  }

  pure def witnessResolved(holeType: h): WitnessProtocol[h] = {
    holes: Set(),
    result: WResolved,
  }

  pure def witnessInvalid(
    holeType: h,
    reason: WitnessInvalidReason,
  ): WitnessProtocol[h] = {
    holes: Set(),
    result: WInvalid(reason),
  }

  pure def witnessInvalidWithHoles(
    holes: Set[h],
    reason: WitnessInvalidReason,
  ): WitnessProtocol[h] = {
    holes: holes,
    result: WInvalid(reason),
  }

  var qInterruptedMovementSpentFeet: int
  var qReactorReactionAvailable: bool
  var qReactorReadiedMovementHeld: bool
  var qReactorReadiedSpellHeld: bool
  var qReactorMovementSpentFeet: int
  var qInterruptedConcentration: bool
  var qReactorConcentration: bool
  var qReactionWindow: ReactionWindowState
  var qPendingTrigger: str
  var qProtocol: WitnessProtocol[str]
  var qLastConcentrationSaveDc: int

  pure def qHoles: Set[str] = qProtocol.holes

  pure def noPendingTrigger: str = "none"
  pure def opportunityAttackTrigger: str = "opportunityAttack"
  pure def attackHitTrigger: str = "attackHit"
  pure def movementResumeCostFeet: int = 10
  pure def readiedMovementShortCostFeet: int = 5
  pure def readiedMovementFillCostFeet: int = 10

  pure def witnessInvalidReasonForProjection(_reason: str): WitnessInvalidReason =
    WInvalidFill

  pure def witnessProtocolForProjection(
    holes: Set[str],
    result: str,
    invalidReason: str,
  ): WitnessProtocol[str] =
    if (result == "init") witnessInit("ReactionDecision")
    else if (result == "invalid")
      witnessInvalidWithHoles(holes, witnessInvalidReasonForProjection(invalidReason))
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved("ReactionDecision")

  pure def qReactorTurn =
    initialMovementGrappleState.turn
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
    qProtocol' = witnessProtocolForProjection(Set(), result, "none"),
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
    qProtocol' = witnessProtocolForProjection(holes, result, "none"),
    qLastConcentrationSaveDc' = qLastConcentrationSaveDc,
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
    qProtocol' = witnessProtocolForProjection(qHoles, "invalid", reason),
    qLastConcentrationSaveDc' = qLastConcentrationSaveDc,
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
    qProtocol' = witnessProtocolForProjection(Set(), "init", "none"),
    qLastConcentrationSaveDc' = 0,
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
    val readiedTurn = initialMovementGrappleState.turn.with("readiedMovementHeld", true)
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
