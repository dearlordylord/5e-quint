// -*- mode: Bluespec; -*-

module ruleCoreMovementMbt {
  import movementSpatialGrapple.* from "../shared-algebras/proofs/rule-core/movement-spatial-grapple"

  var qMovementSpentFeet: int
  var qProne: bool
  var qHoles: Set[str]
  var qLastOutcome: str

  pure def movementSpeedFeet: int = 30

  pure def movementFillCostFeet: int = 10

  pure def movementOverspendCostFeet: int = 35

  pure def qMovementGrappleState: MovementGrappleState =
    initialMovementGrappleState
      .with("speedFeet", movementSpeedFeet)
      .with("movementSpentFeet", qMovementSpentFeet)
      .with("prone", qProne)

  pure def qMovementRemainingFeet: int =
    movementRemainingFeet(qMovementGrappleState)

  action recordResolvedMovementState(state: MovementGrappleState): bool = all {
    qMovementSpentFeet' = state.movementSpentFeet,
    qProne' = state.prone,
    qHoles' = Set(),
    qLastOutcome' = "resolved",
  }

  action init = all {
    qMovementSpentFeet' = 0,
    qProne' = true,
    qHoles' = Set(),
    qLastOutcome' = "init",
  }

  action doDiscoverMovement = all {
    qHoles == Set(),
    qMovementRemainingFeet > 0,
    qMovementSpentFeet' = qMovementSpentFeet,
    qProne' = qProne,
    qHoles' = Set("Movement"),
    qLastOutcome' = "needsHoles",
  }

  action doSpendMovement = all {
    qHoles == Set("Movement"),
    canSpendMovement(qMovementGrappleState, {
      distanceFeet: movementFillCostFeet,
      extraCostFeet: 0,
    }),
    recordResolvedMovementState(spendMovement(qMovementGrappleState, {
      distanceFeet: movementFillCostFeet,
      extraCostFeet: 0,
    })),
  }

  action doRejectMovementOverspend = all {
    qHoles == Set("Movement"),
    qMovementRemainingFeet < movementOverspendCostFeet,
    qMovementSpentFeet' = qMovementSpentFeet,
    qProne' = qProne,
    qHoles' = qHoles,
    qLastOutcome' = "invalidFill",
  }

  action doStandFromProne = all {
    qHoles == Set(),
    qProne,
    qMovementGrappleState.speedFeet / 2 > 0,
    qMovementRemainingFeet >= qMovementGrappleState.speedFeet / 2,
    recordResolvedMovementState(standFromProne(qMovementGrappleState)),
  }

  action step = any {
    doDiscoverMovement,
    doSpendMovement,
    doRejectMovementOverspend,
    doStandFromProne,
  }
}
