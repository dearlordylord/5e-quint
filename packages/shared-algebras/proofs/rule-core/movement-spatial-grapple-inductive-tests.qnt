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

}
