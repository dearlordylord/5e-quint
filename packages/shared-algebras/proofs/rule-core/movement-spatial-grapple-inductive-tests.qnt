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

}
