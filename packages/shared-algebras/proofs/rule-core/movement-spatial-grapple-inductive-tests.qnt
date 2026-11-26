module movementSpatialGrappleInductiveTests {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import creatureSizeOrder.* from "./creature-size-order"
  import movementSpatialGrapple.* from "./movement-spatial-grapple"
  import movementSpatialGrappleInductive.* from "./movement-spatial-grapple-inductive"

  run fast_wrestler_target_exemption_parity = all {
    assert(grapplerFastWrestlerTargetExemptFromDragCost(MediumSize, TinySize)),
    assert(grapplerFastWrestlerTargetExemptFromDragCost(MediumSize, SmallSize)),
    assert(grapplerFastWrestlerTargetExemptFromDragCost(MediumSize, MediumSize)),
    assert(not(grapplerFastWrestlerTargetExemptFromDragCost(MediumSize, LargeSize))),
    assert(targetExemptFromGrappleDragCost(MediumSize, MediumSize) != grapplerFastWrestlerTargetExemptFromDragCost(MediumSize, MediumSize)),
  }

  run creature_space_traversal_permission_parity = all {
    assert(creatureSpaceTraversalLegal(SmallSize, {
      occupiedCreatureSize: MediumSize,
      endsInOccupiedCreatureSpace: false,
      permission: LargerCreatureSpaceTraversalCannotStop,
    })),
    assert(not(creatureSpaceTraversalLegal(SmallSize, {
      occupiedCreatureSize: SmallSize,
      endsInOccupiedCreatureSpace: false,
      permission: LargerCreatureSpaceTraversalCannotStop,
    }))),
    assert(not(creatureSpaceTraversalLegal(SmallSize, {
      occupiedCreatureSize: MediumSize,
      endsInOccupiedCreatureSpace: true,
      permission: LargerCreatureSpaceTraversalCannotStop,
    }))),
    assert(not(creatureSpaceTraversalLegal(SmallSize, {
      occupiedCreatureSize: MediumSize,
      endsInOccupiedCreatureSpace: false,
      permission: NoCreatureSpaceMovementPermission,
    }))),
  }

  run opportunity_attack_reach_transition_parity = all {
    assert(opportunityAttackLeavesReach(5, 10, 5)),
    assert(not(opportunityAttackLeavesReach(10, 15, 5))),
    assert(not(opportunityAttackLeavesReach(5, 5, 5))),
    assert(not(opportunityAttackLeavesReach(10, 5, 5))),
  }

  // SRD Grappling: an existing hold follows the same condition and ending
  // rules; entering Battle does not repeat the initiation's save/size checks.
  run preexisting_grapple_retains_dc_and_shared_lifecycle = {
    val held = Grappled({ escapeDc: 15 })
    val movement = { ...initialMovementGrappleState, grapple: held }
    val failed = escapeGrapple(movement.turn, held, 14)
    val escaped = escapeGrapple(movement.turn, held, 15)
    all {
      assert(legalMovementGrappleState(movement)),
      assert(grappleEscapeDc(held) == 15),
      assert(effectiveSpeedFeet(movement) == 0),
      assert(grappledAttackRollHasDisadvantage(held, false)),
      assert(not(grappledAttackRollHasDisadvantage(held, true))),
      assert(failed.grapple == held),
      assert(failed.turn.actionQuota == ActionSpent),
      assert(escaped.grapple == NoGrapple),
      assert(escaped.turn.actionQuota == ActionSpent),
      assert(releaseGrapple(held) == NoGrapple),
    }
  }

  run grapple_attempt_reaches_active_grapple_state = {
    val grapple = applyGrappleAttempt(NoGrapple, {
      grapplerSize: MediumSize,
      targetSize: MediumSize,
      hasFreeHand: true,
      targetSaveTotal: 8,
      escapeDc: 13,
    })
    val movementState = initialMovementGrappleState.with("grapple", grapple)
    all {
      assert(activeGrapple(grapple)),
      assert(grappleEscapeDc(grapple) == 13),
      assert(effectiveSpeedFeet(movementState) == 0),
      assert(legalMovementGrappleState(movementState)),
    }
  }

  run drop_prone_preserves_resources_and_respects_condition_eligibility = {
    val facts = { alive: true, proneImmune: false, commandHalt: false }
    val spent = { ...initialMovementGrappleState, movementSpentFeet: 30 }
    val dropped = dropProne(spent, facts)
    all {
      assert(dropped.prone),
      assert(dropped.movementSpentFeet == spent.movementSpentFeet),
      assert(dropped.turn == spent.turn),
      assert(dropProne(spent, { ...facts, alive: false }) == spent),
      assert(dropProne(spent, { ...facts, proneImmune: true }) == spent),
      assert(dropProne(spent, { ...facts, commandHalt: true }) == spent),
      assert(not(canDropProne(dropped, facts))),
      assert(not(canDropProne({ ...spent, speedFeet: 0 }, facts))),
      assert(not(canDropProne({ ...spent, turn: { ...spent.turn, currentActorOwnsTurn: false } }, facts))),
    }
  }

  /// SRD 5.2.1 Rules Glossary "Climbing", "Crawling", "Swimming", "Difficult
  /// Terrain" and "Grappled": the battle prices a move from its path.
  run movement_path_cost_follows_the_srd_examples = {
    val walk = { distanceFeet: 10, activity: OrdinaryMovement, usesActivitySpeed: false, difficultTerrain: false, effectExtraCostPerFoot: 0 }
    val climb = { ...walk, activity: ClimbingMovement }
    val swim = { ...walk, activity: SwimmingMovement }
    all {
      assert(movementPathCostFeet([walk]) == 10),
      assert(movementPathCostFeet([climb]) == 20),
      assert(movementPathCostFeet([{ ...climb, usesActivitySpeed: true }]) == 10),
      assert(movementPathCostFeet([{ ...swim, difficultTerrain: true }]) == 30),
      assert(movementPathCostFeet([{ ...swim, usesActivitySpeed: true, difficultTerrain: true }]) == 20),
      assert(movementPathCostFeet([{ ...walk, effectExtraCostPerFoot: 1 }]) == 20),
      assert(movementPathCostFeet(markedMovementPath(true, 10, 5, true, 0)) == 25),
      assert(movementPathCostFeet(markedMovementPath(false, 10, 5, true, 0)) == 15),
      assert(movementPathCostFeet(markedMovementPath(false, 10, 10, false, 1)) == 20),
      assert(movementPathLegalForProne(true, markedMovementPath(true, 10, 5, true, 0))),
      assert(not(movementPathLegalForProne(true, [walk]))),
      assert(movementPathLegalForProne(false, [walk])),
    }
  }

}
