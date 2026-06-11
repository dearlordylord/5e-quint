// -*- mode: Bluespec; -*-

module ruleCoreMovementMbt {
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import movementSpatialGrapple.* from "../shared-algebras/proofs/rule-core/movement-spatial-grapple"
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qCurrentActor: str
  var qMovementSpentFeet: int
  var qDashBonusFeet: int
  var qProne: bool
  var qDisengaged: bool
  var qActionAvailable: bool
  var qGrappleActive: bool
  var qGrappleEscapeDc: int
  var qProtocol: WitnessProtocol[str]
  var qPendingOpportunityAttack: bool

  pure def qHoles: Set[str] = qProtocol.holes

  pure def fighterActor: str = "Fighter"
  pure def grappledTargetActor: str = "GrappledTarget"
  pure def movementSpeedFeet: int = 30
  pure def movementShortCostFeet: int = 5
  pure def movementFillCostFeet: int = 10
  pure def movementFullCostFeet: int = 30
  pure def movementOverspendCostFeet: int = 35
  pure def runtimeGrappleEscapeDc: int = 10

  pure def witnessInvalidReasonForProjection(reason: str): WitnessInvalidReason =
    if (reason == "staleSubject") WStaleSubject else WInvalidFill

  pure def witnessProtocolForProjection(
    holes: Set[str],
    result: str,
    invalidReason: str,
  ): WitnessProtocol[str] =
    if (result == "init") witnessInit("Movement")
    else if (result == "invalid")
      witnessInvalidWithHoles(holes, witnessInvalidReasonForProjection(invalidReason))
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved("Movement")

  pure def qTurnState: TurnProcedureState =
    initialTurnProcedureState
      .with("actionQuota", if (qActionAvailable) ActionAvailable else ActionSpent)
      .with("dashMovementBonusFeet", qDashBonusFeet)
      .with("disengaged", qDisengaged)

  pure def qFighterMovementState: MovementGrappleState =
    initialMovementGrappleState
      .with("turn", qTurnState)
      .with("speedFeet", movementSpeedFeet)
      .with("movementSpentFeet", qMovementSpentFeet)
      .with("prone", qProne)
      .with("grapple", NoGrapple)

  pure def qGrappledTargetState: MovementGrappleState =
    initialMovementGrappleState
      .with("turn", qTurnState)
      .with("speedFeet", movementSpeedFeet)
      .with("movementSpentFeet", 0)
      .with("prone", false)
      .with("grapple", if (qGrappleActive) Grappled({ escapeDc: qGrappleEscapeDc }) else NoGrapple)

  pure def qMovementRemainingFeet: int =
    movementRemainingFeet(qFighterMovementState)

  pure def qActionStateAfter(turn: TurnProcedureState): bool =
    turn.actionQuota == ActionAvailable

  action clearSuccessfulHoles(result: str): bool = all {
    qProtocol' = witnessProtocolForProjection(Set(), result, "none"),
    qPendingOpportunityAttack' = false,
  }

  action recordFighterMovementState(state: MovementGrappleState): bool = all {
    qMovementSpentFeet' = state.movementSpentFeet,
    qDashBonusFeet' = state.turn.dashMovementBonusFeet,
    qProne' = state.prone,
    qDisengaged' = state.turn.disengaged,
    qActionAvailable' = qActionStateAfter(state.turn),
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    clearSuccessfulHoles("resolved"),
  }

  action recordTurnState(turn: TurnProcedureState): bool = all {
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = turn.dashMovementBonusFeet,
    qProne' = qProne,
    qDisengaged' = turn.disengaged,
    qActionAvailable' = qActionStateAfter(turn),
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    clearSuccessfulHoles("resolved"),
  }

  action recordGrappleState(active: bool, escapeDc: int, actionAvailable: bool): bool = all {
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = qDashBonusFeet,
    qProne' = qProne,
    qDisengaged' = qDisengaged,
    qActionAvailable' = actionAvailable,
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = active,
    qGrappleEscapeDc' = escapeDc,
    clearSuccessfulHoles("resolved"),
  }

  action recordInvalid(reason: str): bool = all {
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = qDashBonusFeet,
    qProne' = qProne,
    qDisengaged' = qDisengaged,
    qActionAvailable' = qActionAvailable,
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qProtocol' = witnessProtocolForProjection(qHoles, "invalid", reason),
    qPendingOpportunityAttack' = qPendingOpportunityAttack,
  }

  action init = all {
    qCurrentActor' = fighterActor,
    qMovementSpentFeet' = 0,
    qDashBonusFeet' = 0,
    qProne' = true,
    qDisengaged' = false,
    qActionAvailable' = true,
    qGrappleActive' = false,
    qGrappleEscapeDc' = 0,
    qProtocol' = witnessProtocolForProjection(Set(), "init", "none"),
    qPendingOpportunityAttack' = false,
  }

  action doDiscoverMovement = all {
    qCurrentActor == fighterActor,
    qHoles == Set(),
    qMovementRemainingFeet > 0,
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = qDashBonusFeet,
    qProne' = qProne,
    qDisengaged' = qDisengaged,
    qActionAvailable' = qActionAvailable,
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qProtocol' = witnessProtocolForProjection(Set("Movement"), "needsHoles", "none"),
    qPendingOpportunityAttack' = false,
  }

  action doSpendMovement = all {
    qHoles == Set("Movement"),
    canSpendMovement(qFighterMovementState, {
      distanceFeet: movementFillCostFeet,
      extraCostFeet: 0,
    }),
    recordFighterMovementState(spendMovement(qFighterMovementState, {
      distanceFeet: movementFillCostFeet,
      extraCostFeet: 0,
    })),
  }

  action doSpendShortMovement = all {
    qHoles == Set("Movement"),
    canSpendMovement(qFighterMovementState, {
      distanceFeet: movementShortCostFeet,
      extraCostFeet: 0,
    }),
    recordFighterMovementState(spendMovement(qFighterMovementState, {
      distanceFeet: movementShortCostFeet,
      extraCostFeet: 0,
    })),
  }

  action doSpendFullMovement = all {
    qHoles == Set("Movement"),
    canSpendMovement(qFighterMovementState, {
      distanceFeet: movementFullCostFeet,
      extraCostFeet: 0,
    }),
    recordFighterMovementState(spendMovement(qFighterMovementState, {
      distanceFeet: movementFullCostFeet,
      extraCostFeet: 0,
    })),
  }

  action doMoveProvokesOpportunityAttack = all {
    qHoles == Set("Movement"),
    canSpendMovement(qFighterMovementState, {
      distanceFeet: movementFillCostFeet,
      extraCostFeet: 0,
    }),
    opportunityAttackTriggered(qTurnState, {
      hostileCreature: true,
      observerCanSee: true,
      leavesReach: true,
      movementResource: OwnMovementActionBonusReactionOrSpeed,
    }),
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = qDashBonusFeet,
    qProne' = qProne,
    qDisengaged' = qDisengaged,
    qActionAvailable' = qActionAvailable,
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qProtocol' = witnessProtocolForProjection(Set("ReactionDecision"), "needsHoles", "none"),
    qPendingOpportunityAttack' = true,
  }

  action doMoveThreatSuppressedByDisengage = all {
    qHoles == Set("Movement"),
    canSpendMovement(qFighterMovementState, {
      distanceFeet: movementFillCostFeet,
      extraCostFeet: 0,
    }),
    not(opportunityAttackTriggered(qTurnState, {
      hostileCreature: true,
      observerCanSee: true,
      leavesReach: true,
      movementResource: OwnMovementActionBonusReactionOrSpeed,
    })),
    recordFighterMovementState(spendMovement(qFighterMovementState, {
      distanceFeet: movementFillCostFeet,
      extraCostFeet: 0,
    })),
  }

  action doDeclineOpportunityAttack = all {
    qHoles == Set("ReactionDecision"),
    qPendingOpportunityAttack,
    recordFighterMovementState(spendMovement(qFighterMovementState, {
      distanceFeet: movementFillCostFeet,
      extraCostFeet: 0,
    })),
  }

  action doRejectMovementOverspend = all {
    qHoles == Set("Movement"),
    qMovementRemainingFeet < movementOverspendCostFeet,
    recordInvalid("invalidFill"),
  }

  action doDash = all {
    qCurrentActor == fighterActor,
    qHoles == Set(),
    qActionAvailable,
    recordTurnState(resolveDash(qTurnState, movementSpeedFeet, StandardActionCost(DashAction))),
  }

  action doDisengage = all {
    qCurrentActor == fighterActor,
    qHoles == Set(),
    qActionAvailable,
    recordTurnState(resolveDisengage(qTurnState, StandardActionCost(DisengageAction))),
  }

  action doRejectDashAfterActionSpent = all {
    qCurrentActor == fighterActor,
    qHoles == Set(),
    not(qActionAvailable),
    recordInvalid("staleSubject"),
  }

  action doStandFromProne = all {
    qCurrentActor == fighterActor,
    qHoles == Set(),
    qProne,
    qFighterMovementState.speedFeet / 2 > 0,
    qMovementRemainingFeet >= qFighterMovementState.speedFeet / 2,
    recordFighterMovementState(standFromProne(qFighterMovementState)),
  }

  action doDiscoverGrapple = all {
    qCurrentActor == fighterActor,
    qHoles == Set(),
    qActionAvailable,
    not(qGrappleActive),
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = qDashBonusFeet,
    qProne' = qProne,
    qDisengaged' = qDisengaged,
    qActionAvailable' = qActionAvailable,
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qProtocol' = witnessProtocolForProjection(Set("TargetChoice"), "needsHoles", "none"),
    qPendingOpportunityAttack' = false,
  }

  action doSelectGrappleTarget = all {
    qHoles == Set("TargetChoice"),
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = qDashBonusFeet,
    qProne' = qProne,
    qDisengaged' = qDisengaged,
    qActionAvailable' = qActionAvailable,
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qProtocol' = witnessProtocolForProjection(Set("GrappleOutcome"), "needsHoles", "none"),
    qPendingOpportunityAttack' = false,
  }

  action doResolveGrappleSuccess = all {
    qHoles == Set("GrappleOutcome"),
    qActionAvailable,
    recordGrappleState(true, runtimeGrappleEscapeDc, false),
  }

  action doResolveGrappleFailure = all {
    qHoles == Set("GrappleOutcome"),
    qActionAvailable,
    recordGrappleState(false, 0, false),
  }

  action doStartGrappledTargetTurn = all {
    qCurrentActor == fighterActor,
    qHoles == Set(),
    qGrappleActive,
    qCurrentActor' = grappledTargetActor,
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = 0,
    qProne' = qProne,
    qDisengaged' = false,
    qActionAvailable' = true,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qProtocol' = witnessProtocolForProjection(Set(), "resolved", "none"),
    qPendingOpportunityAttack' = false,
  }

  action doDiscoverEscapeGrapple = all {
    qCurrentActor == grappledTargetActor,
    qHoles == Set(),
    qGrappleActive,
    qActionAvailable,
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = qDashBonusFeet,
    qProne' = qProne,
    qDisengaged' = qDisengaged,
    qActionAvailable' = qActionAvailable,
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qProtocol' = witnessProtocolForProjection(Set("GrappleOutcome"), "needsHoles", "none"),
    qPendingOpportunityAttack' = false,
  }

  action doResolveEscapeSuccess = all {
    qCurrentActor == grappledTargetActor,
    qHoles == Set("GrappleOutcome"),
    qGrappleActive,
    qActionAvailable,
    val escaped = escapeGrapple(qTurnState, qGrappledTargetState.grapple, qGrappleEscapeDc)
    recordGrappleState(activeGrapple(escaped.grapple), grappleEscapeDc(escaped.grapple), qActionStateAfter(escaped.turn)),
  }

  action doResolveEscapeFailure = all {
    qCurrentActor == grappledTargetActor,
    qHoles == Set("GrappleOutcome"),
    qGrappleActive,
    qActionAvailable,
    val escaped = escapeGrapple(qTurnState, qGrappledTargetState.grapple, qGrappleEscapeDc - 1)
    recordGrappleState(activeGrapple(escaped.grapple), grappleEscapeDc(escaped.grapple), qActionStateAfter(escaped.turn)),
  }

  action doReleaseGrapple = all {
    qHoles == Set(),
    qGrappleActive,
    recordGrappleState(activeGrapple(releaseGrapple(qGrappledTargetState.grapple)), 0, qActionAvailable),
  }

  action step = any {
    doDiscoverMovement,
    doSpendMovement,
    doSpendShortMovement,
    doSpendFullMovement,
    doMoveProvokesOpportunityAttack,
    doMoveThreatSuppressedByDisengage,
    doDeclineOpportunityAttack,
    doRejectMovementOverspend,
    doDash,
    doDisengage,
    doRejectDashAfterActionSpent,
    doStandFromProne,
    doDiscoverGrapple,
    doSelectGrappleTarget,
    doResolveGrappleSuccess,
    doResolveGrappleFailure,
    doStartGrappledTargetTurn,
    doDiscoverEscapeGrapple,
    doResolveEscapeSuccess,
    doResolveEscapeFailure,
    doReleaseGrapple,
  }
}
