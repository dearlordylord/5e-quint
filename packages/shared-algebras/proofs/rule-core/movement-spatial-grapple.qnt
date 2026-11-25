// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-PTG-REACTIONS-003 RAW-QCORE7-MOVEMENT-GRAPPLE-001
// KERNEL-COVERAGE: qnt-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.creature-space-movement-permission unit-feature.grappler

module movementSpatialGrapple {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import creatureSizeOrder.* from "./creature-size-order"

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

  type CreatureSpaceMovementPermission =
    | NoCreatureSpaceMovementPermission
    | LargerCreatureSpaceTraversalCannotStop

  type CreatureSpaceTraversalFacts = {
    occupiedCreatureSize: RuleSize,
    endsInOccupiedCreatureSpace: bool,
    permission: CreatureSpaceMovementPermission,
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

  type DropProneFacts = {
    alive: bool,
    proneImmune: bool,
    commandHalt: bool,
  }

  pure def initialMovementGrappleState: MovementGrappleState = {
    turn: initialTurnProcedureState,
    speedFeet: 30,
    movementSpentFeet: 0,
    prone: false,
    grapple: NoGrapple,
  }

  pure def legalMovementSpendFacts(facts: MovementSpendFacts): bool = all {
    facts.distanceFeet >= 0,
    facts.distanceFeet <= 80,
    facts.extraCostFeet >= 0,
    facts.extraCostFeet <= 80,
  }

  pure def movementCostFeet(facts: MovementSpendFacts): int =
    facts.distanceFeet + facts.extraCostFeet

  /// SRD 5.2.1 "Movement and Position": a move can combine climbing, crawling
  /// and swimming with regular movement, and each part of the move is deducted
  /// from the Speed. Rules Glossary "Climbing", "Crawling", "Swimming": each
  /// foot costs 1 extra foot (2 extra feet in Difficult Terrain); climbing and
  /// swimming ignore that cost with the matching Speed. A Prone creature's
  /// only movement option is to crawl ("Prone").
  type MovementPathActivity =
    | OrdinaryMovement
    | ClimbingMovement
    | SwimmingMovement
    | CrawlingMovement

  /// One part of a move's path, as the table adjudicates it. Rules Glossary
  /// "Difficult Terrain": every foot costs 1 extra foot, and Difficult Terrain
  /// isn't cumulative. `effectExtraCostPerFoot` holds the per-foot surcharges
  /// the battle adds on top: dragging a Grappled creature ("Grappled",
  /// _Movable_) and moving closer through a directional persistent area.
  type MovementPathSegment = {
    distanceFeet: int,
    activity: MovementPathActivity,
    usesActivitySpeed: bool,
    difficultTerrain: bool,
    effectExtraCostPerFoot: int,
  }

  pure def movementPathActivityExtraCostPerFoot(
    activity: MovementPathActivity,
    usesActivitySpeed: bool,
  ): int =
    match activity {
      | OrdinaryMovement => 0
      | ClimbingMovement => if (usesActivitySpeed) 0 else 1
      | SwimmingMovement => if (usesActivitySpeed) 0 else 1
      | CrawlingMovement => 1
    }

  pure def movementPathSegmentExtraCostFeet(segment: MovementPathSegment): int =
    segment.distanceFeet * (
      (if (segment.difficultTerrain) 1 else 0) +
      movementPathActivityExtraCostPerFoot(segment.activity, segment.usesActivitySpeed) +
      segment.effectExtraCostPerFoot
    )

  pure def movementPathSpendFacts(path: List[MovementPathSegment]): MovementSpendFacts = {
    distanceFeet: path.foldl(0, (total, segment) => total + segment.distanceFeet),
    extraCostFeet: path.foldl(0, (total, segment) => total + movementPathSegmentExtraCostFeet(segment)),
  }

  pure def movementPathCostFeet(path: List[MovementPathSegment]): int =
    movementCostFeet(movementPathSpendFacts(path))

  /// A walked (or, when Prone, crawled) path of `totalDistanceFeet` whose
  /// first `markedDistanceFeet` feet carry the given Difficult Terrain and
  /// effect surcharges. The rest of the path carries neither.
  pure def markedMovementPath(
    prone: bool,
    totalDistanceFeet: int,
    markedDistanceFeet: int,
    markedDifficultTerrain: bool,
    markedEffectExtraCostPerFoot: int,
  ): List[MovementPathSegment] = {
    val marked = {
      distanceFeet: markedDistanceFeet,
      activity: if (prone) CrawlingMovement else OrdinaryMovement,
      usesActivitySpeed: false,
      difficultTerrain: markedDifficultTerrain,
      effectExtraCostPerFoot: markedEffectExtraCostPerFoot,
    }
    val rest = {
      ...marked,
      distanceFeet: totalDistanceFeet - markedDistanceFeet,
      difficultTerrain: false,
      effectExtraCostPerFoot: 0,
    }
    [marked, rest].select(segment => segment.distanceFeet > 0)
  }

  /// A Prone creature's path is legal only when every segment is crawling.
  pure def movementPathLegalForProne(prone: bool, path: List[MovementPathSegment]): bool =
    not(prone) or path.foldl(true, (legal, segment) => legal and segment.activity == CrawlingMovement)

  pure def creatureSpaceTraversalLegal(
    moverSize: RuleSize,
    facts: CreatureSpaceTraversalFacts,
  ): bool = all {
    facts.permission == LargerCreatureSpaceTraversalCannotStop,
    creatureSizeIsLargerThanSelf(moverSize, facts.occupiedCreatureSize),
    not(facts.endsInOccupiedCreatureSpace),
  }

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

  pure def opportunityAttackLeavesReach(
    beforeDistanceFeet: int,
    afterDistanceFeet: int,
    reachFeet: int,
  ): bool = all {
    beforeDistanceFeet >= 0,
    afterDistanceFeet >= 0,
    reachFeet >= 0,
    beforeDistanceFeet <= reachFeet,
    afterDistanceFeet > reachFeet,
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

  // SRD Dropping Prone, Immunity, and Dead; Command: Halt follows A52.
  pure def canDropProne(state: MovementGrappleState, facts: DropProneFacts): bool = all {
    state.turn.currentActorOwnsTurn,
    effectiveSpeedFeet(state) > 0,
    not(state.prone),
    facts.alive,
    not(facts.proneImmune),
    not(facts.commandHalt),
  }

  pure def dropProne(state: MovementGrappleState, facts: DropProneFacts): MovementGrappleState =
    if (not(canDropProne(state, facts))) state
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

  pure def grapplerFastWrestlerTargetExemptFromDragCost(grapplerSize: RuleSize, targetSize: RuleSize): bool =
    sizeRank(targetSize) <= sizeRank(grapplerSize)

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
    val spend = spendActionCost(turn, StandardActionCost(EscapeGrappleAction))
    if (not(activeGrapple(grapple)) or not(spend.admitted)) {
      turn: turn,
      grapple: grapple,
    } else {
      turn: spend.turn,
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
}
