// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-PTG-REACTIONS-003 RAW-QCORE7-MOVEMENT-GRAPPLE-001

module movementSpatialGrapple {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"

  type RuleSize = TinySize | SmallSize | MediumSize | LargeSize | HugeSize | GargantuanSize

  type MovementResource =
    | OwnMovementActionBonusReactionOrSpeed
    | TeleportResource
    | ForcedMovementNoOwnResource

  type OpportunityAttackTriggerFacts = {
    hostileCreature: bool,
    observerCanSee: bool,
    leavesReach: bool,
    movementResource: MovementResource,
  }

  type MovementSpendFacts = {
    distanceFeet: int,
    extraCostFeet: int,
  }

  type GrappleState =
    | NoGrapple
    | Grappled({ escapeDc: int })

  type GrappleAttemptFacts = {
    grapplerSize: RuleSize,
    targetSize: RuleSize,
    hasFreeHand: bool,
    targetSaveTotal: int,
    escapeDc: int,
  }

  type MovementGrappleState = {
    turn: TurnProcedureState,
    speedFeet: int,
    movementSpentFeet: int,
    prone: bool,
    grapple: GrappleState,
  }

  type EscapeGrappleResult = {
    turn: TurnProcedureState,
    grapple: GrappleState,
  }

  pure def initialMovementGrappleState: MovementGrappleState = {
    turn: initialTurnProcedureState,
    speedFeet: 30,
    movementSpentFeet: 0,
    prone: false,
    grapple: NoGrapple,
  }

  pure def sizeRank(creatureSize: RuleSize): int =
    if (creatureSize == TinySize) 0
    else if (creatureSize == SmallSize) 1
    else if (creatureSize == MediumSize) 2
    else if (creatureSize == LargeSize) 3
    else if (creatureSize == HugeSize) 4
    else 5

  pure def legalMovementSpendFacts(facts: MovementSpendFacts): bool = all {
    facts.distanceFeet >= 0,
    facts.distanceFeet <= 80,
    facts.extraCostFeet >= 0,
    facts.extraCostFeet <= 80,
  }

  pure def movementCostFeet(facts: MovementSpendFacts): int =
    facts.distanceFeet + facts.extraCostFeet

  pure def activeGrapple(grapple: GrappleState): bool =
    grapple != NoGrapple

  pure def grappleEscapeDc(grapple: GrappleState): int =
    match grapple {
      | NoGrapple => 0
      | Grappled(v) => v.escapeDc
    }

  pure def minimumGrappleEscapeDc: int = 5

  pure def maximumGrappleEscapeDc: int = 27

  pure def legalGrappleEscapeDc(escapeDc: int): bool =
    escapeDc >= minimumGrappleEscapeDc and escapeDc <= maximumGrappleEscapeDc

  pure def legalGrappleStates: Set[GrappleState] =
    minimumGrappleEscapeDc.to(maximumGrappleEscapeDc)
      .map(dc => Grappled({ escapeDc: dc }))
      .union(Set(NoGrapple))

  pure def effectiveSpeedFeet(state: MovementGrappleState): int =
    if (activeGrapple(state.grapple)) 0 else state.speedFeet

  pure def movementBudgetFeet(state: MovementGrappleState): int =
    if (effectiveSpeedFeet(state) == 0) 0
    else effectiveSpeedFeet(state) + state.turn.dashMovementBonusFeet

  pure def movementRemainingFeet(state: MovementGrappleState): int = {
    val remaining = movementBudgetFeet(state) - state.movementSpentFeet
    if (remaining < 0) 0 else remaining
  }

  pure def legalMovementGrappleState(state: MovementGrappleState): bool = all {
    legalTurnProcedureState(state.turn),
    state.speedFeet >= 0,
    state.speedFeet <= 40,
    state.movementSpentFeet >= 0,
    state.movementSpentFeet <= 120,
    state.prone.in(Set(true, false)),
    state.grapple.in(legalGrappleStates),
    movementRemainingFeet(state) >= 0,
  }

  pure def canSpendMovement(state: MovementGrappleState, facts: MovementSpendFacts): bool = {
    val cost = movementCostFeet(facts)
    all {
      state.turn.currentActorOwnsTurn,
      legalMovementSpendFacts(facts),
      cost > 0,
      effectiveSpeedFeet(state) > 0,
      movementRemainingFeet(state) >= cost,
    }
  }

  pure def opportunityAttackTriggered(
    turn: TurnProcedureState,
    facts: OpportunityAttackTriggerFacts
  ): bool = all {
    facts.hostileCreature,
    facts.observerCanSee,
    facts.leavesReach,
    facts.movementResource == OwnMovementActionBonusReactionOrSpeed,
    not(turn.disengaged),
  }

  pure def spendMovement(
    state: MovementGrappleState,
    facts: MovementSpendFacts
  ): MovementGrappleState =
    if (not(canSpendMovement(state, facts))) state
    else {
      turn: state.turn,
      speedFeet: state.speedFeet,
      movementSpentFeet: state.movementSpentFeet + movementCostFeet(facts),
      prone: state.prone,
      grapple: state.grapple,
    }

  pure def standFromProne(state: MovementGrappleState): MovementGrappleState = {
    val cost = effectiveSpeedFeet(state) / 2
    val facts = {
      distanceFeet: 0,
      extraCostFeet: cost,
    }
    if (not(state.prone) or cost <= 0 or not(canSpendMovement(state, facts))) state
    else {
      turn: state.turn,
      speedFeet: state.speedFeet,
      movementSpentFeet: state.movementSpentFeet + cost,
      prone: false,
      grapple: state.grapple,
    }
  }

  pure def dropProne(state: MovementGrappleState): MovementGrappleState =
    if (not(state.turn.currentActorOwnsTurn) or effectiveSpeedFeet(state) == 0) state
    else {
      turn: state.turn,
      speedFeet: state.speedFeet,
      movementSpentFeet: state.movementSpentFeet,
      prone: true,
      grapple: state.grapple,
    }

  pure def grappleSizeLegal(grapplerSize: RuleSize, targetSize: RuleSize): bool =
    sizeRank(targetSize) <= sizeRank(grapplerSize) + 1

  pure def targetExemptFromGrappleDragCost(grapplerSize: RuleSize, targetSize: RuleSize): bool =
    targetSize == TinySize or sizeRank(targetSize) <= sizeRank(grapplerSize) - 2

  pure def grappleDragExtraCostPerFoot(grapplerSize: RuleSize, targetSize: RuleSize): int =
    if (targetExemptFromGrappleDragCost(grapplerSize, targetSize)) 0 else 1

  pure def applyGrappleAttempt(grapple: GrappleState, facts: GrappleAttemptFacts): GrappleState =
    if (activeGrapple(grapple)) grapple
    else if (not(facts.hasFreeHand)) grapple
    else if (not(grappleSizeLegal(facts.grapplerSize, facts.targetSize))) grapple
    else if (not(legalGrappleEscapeDc(facts.escapeDc))) grapple
    else if (facts.targetSaveTotal >= facts.escapeDc) grapple
    else Grappled({ escapeDc: facts.escapeDc })

  pure def escapeGrapple(
    turn: TurnProcedureState,
    grapple: GrappleState,
    checkTotal: int
  ): EscapeGrappleResult = {
    val spent = spendActionCost(turn, StandardActionCost(EscapeGrappleAction))
    if (not(activeGrapple(grapple)) or spent == turn) {
      turn: turn,
      grapple: grapple,
    } else {
      turn: spent,
      grapple: if (checkTotal >= grappleEscapeDc(grapple)) NoGrapple else grapple,
    }
  }

  pure def releaseGrapple(grapple: GrappleState): GrappleState =
    NoGrapple

  pure def grappledAttackRollHasDisadvantage(
    grapple: GrappleState,
    targetIsGrappler: bool
  ): bool =
    activeGrapple(grapple) and not(targetIsGrappler)

  pure def startMovementTurn(state: MovementGrappleState): MovementGrappleState = {
    turn: startTurn(state.turn),
    speedFeet: state.speedFeet,
    movementSpentFeet: 0,
    prone: state.prone,
    grapple: state.grapple,
  }

  run test_spends_caller_supplied_movement_cost_from_turn_budget = {
    val moved = spendMovement(initialMovementGrappleState, {
      distanceFeet: 10,
      extraCostFeet: 5,
    })
    all {
      assert(moved.movementSpentFeet == 15),
      assert(movementRemainingFeet(moved) == 15),
      assert(legalMovementGrappleState(moved)),
    }
  }

  run test_dash_extends_movement_budget_without_resetting_spent_movement = {
    val moved = spendMovement(initialMovementGrappleState, {
      distanceFeet: 20,
      extraCostFeet: 0,
    })
    val dashed = moved.with("turn", resolveDash(moved.turn, 30, StandardActionCost(DashAction)))
    all {
      assert(dashed.turn.dashMovementBonusFeet == 30),
      assert(dashed.movementSpentFeet == 20),
      assert(movementRemainingFeet(dashed) == 40),
    }
  }

  run test_stand_from_prone_spends_half_speed_and_removes_prone = {
    val proneState = initialMovementGrappleState.with("prone", true)
    val stood = standFromProne(proneState)
    all {
      assert(not(stood.prone)),
      assert(stood.movementSpentFeet == 15),
      assert(stood.turn.actionQuota == ActionAvailable),
    }
  }

  run test_stand_from_prone_requires_positive_speed_and_movement_budget = {
    val speedZero = initialMovementGrappleState.with("speedFeet", 0).with("prone", true)
    val noBudget = initialMovementGrappleState.with("movementSpentFeet", 25).with("prone", true)
    all {
      assert(standFromProne(speedZero).prone),
      assert(standFromProne(noBudget).prone),
    }
  }

  run test_opportunity_attack_uses_caller_spatial_facts_and_disengage = {
    val facts = {
      hostileCreature: true,
      observerCanSee: true,
      leavesReach: true,
      movementResource: OwnMovementActionBonusReactionOrSpeed,
    }
    val disengaged = resolveDisengage(initialTurnProcedureState, StandardActionCost(DisengageAction))
    all {
      assert(opportunityAttackTriggered(initialTurnProcedureState, facts)),
      assert(not(opportunityAttackTriggered(disengaged, facts))),
      assert(not(opportunityAttackTriggered(initialTurnProcedureState, facts.with("movementResource", TeleportResource)))),
      assert(not(opportunityAttackTriggered(initialTurnProcedureState, facts.with("movementResource", ForcedMovementNoOwnResource)))),
      assert(not(opportunityAttackTriggered(initialTurnProcedureState, facts.with("hostileCreature", false)))),
      assert(not(opportunityAttackTriggered(initialTurnProcedureState, facts.with("observerCanSee", false)))),
      assert(not(opportunityAttackTriggered(initialTurnProcedureState, facts.with("leavesReach", false)))),
    }
  }

  run test_grapple_attempt_requires_free_hand_size_limit_and_failed_save = {
    val admitted = applyGrappleAttempt(NoGrapple, {
      grapplerSize: MediumSize,
      targetSize: LargeSize,
      hasFreeHand: true,
      targetSaveTotal: 12,
      escapeDc: 15,
    })
    val tooLarge = applyGrappleAttempt(NoGrapple, {
      grapplerSize: MediumSize,
      targetSize: HugeSize,
      hasFreeHand: true,
      targetSaveTotal: 12,
      escapeDc: 15,
    })
    val nonSampledRawDc = applyGrappleAttempt(NoGrapple, {
      grapplerSize: MediumSize,
      targetSize: MediumSize,
      hasFreeHand: true,
      targetSaveTotal: 12,
      escapeDc: 13,
    })
    val invalidDc = applyGrappleAttempt(NoGrapple, {
      grapplerSize: MediumSize,
      targetSize: MediumSize,
      hasFreeHand: true,
      targetSaveTotal: 12,
      escapeDc: 28,
    })
    all {
      assert(admitted == Grappled({ escapeDc: 15 })),
      assert(tooLarge == NoGrapple),
      assert(nonSampledRawDc == Grappled({ escapeDc: 13 })),
      assert(invalidDc == NoGrapple),
    }
  }

  run test_escape_spends_action_and_release_is_free = {
    val grappled = Grappled({ escapeDc: 15 })
    val escaped = escapeGrapple(initialTurnProcedureState, grappled, 15)
    val failed = escapeGrapple(initialTurnProcedureState, grappled, 14)
    all {
      assert(escaped.turn.actionQuota == ActionSpent),
      assert(escaped.grapple == NoGrapple),
      assert(failed.turn.actionQuota == ActionSpent),
      assert(failed.grapple == grappled),
      assert(releaseGrapple(grappled) == NoGrapple),
    }
  }

  run test_grapple_condition_speed_attack_and_drag_cost_facts = {
    val grapple = Grappled({ escapeDc: 10 })
    val grappled = initialMovementGrappleState.with("grapple", grapple)
    all {
      assert(effectiveSpeedFeet(grappled) == 0),
      assert(grappledAttackRollHasDisadvantage(grapple, false)),
      assert(not(grappledAttackRollHasDisadvantage(grapple, true))),
      assert(grappleDragExtraCostPerFoot(MediumSize, MediumSize) == 1),
      assert(grappleDragExtraCostPerFoot(LargeSize, TinySize) == 0),
      assert(grappleDragExtraCostPerFoot(HugeSize, MediumSize) == 0),
    }
  }
}
