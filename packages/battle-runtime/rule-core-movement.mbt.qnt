// -*- mode: Bluespec; -*-

module ruleCoreMovementMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import movementSpatialGrapple.* from "../shared-algebras/proofs/rule-core/movement-spatial-grapple"
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"
  import attackRollDamageDiceCore as WeaponDice from "../shared-algebras/proofs/rule-core/attack-roll-damage-dice-core"
  import weaponGripChangeCore as GripChange from "../shared-algebras/proofs/rule-core/weapon-grip-change-core"

  var qCurrentActor: str
  var qMovementSpentFeet: int
  var qDashBonusFeet: int
  var qProne: bool
  var qDisengaged: bool
  var qActionAvailable: bool
  var qGrappleActive: bool
  var qGrappleEscapeDc: int
  var qMainWeaponGrip: str
  var qMainWeaponDamageDieSize: int
  var qProtocol: WitnessProtocol[str]
  var qPendingOpportunityAttack: bool
  var qComponentRoute: List[RuleCoreComponentRouteEvent]

  pure def openHoles: Set[str] = qProtocol.holes

  pure def componentRouteEvidence: List[RuleCoreComponentRouteEvent] =
    ruleCoreComponentRoute(RuleCoreMovementGrappleOwner)

  pure def fighterActor: str = "Fighter"
  pure def grappledTargetActor: str = "GrappledTarget"
  pure def movementSpeedFeet: int = 30
  pure def movementShortDistanceFeet: int = 5
  pure def movementFillDistanceFeet: int = 10
  pure def movementFullDistanceFeet: int = 30
  pure def movementOverspendDistanceFeet: int = 35
  pure def runtimeGrappleEscapeDc: int = 10

  // The Fighter holds a Versatile main weapon with either grip, and can change
  // it on its turn at no cost. A two-handed grip holds both hands; a
  // one-handed grip leaves one, which a Grapple then holds. A Grapple and a
  // two-handed grip each need a free hand.
  pure val mainWeaponGrips: Set[str] = Set("one_handed", "two_handed")

  pure def mainWeaponGrip(grip: str): WeaponDice::WeaponGrip =
    if (grip == "two_handed") WeaponDice::TwoHandedGrip else WeaponDice::OneHandedGrip

  pure def mainWeaponHandsHeld(grip: str): int =
    WeaponDice::weaponGripHandsHeld(mainWeaponGrip(grip))

  pure def qFighterFreeHands: int =
    2 - mainWeaponHandsHeld(qMainWeaponGrip) - (if (qGrappleActive) 1 else 0)

  pure def qFighterHasFreeHand: bool = qFighterFreeHands > 0

  // The Versatile main weapon: a Longsword, 1d8 in one hand and 1d10 in two.
  pure def mainWeaponDamageDieSize(grip: str): int =
    WeaponDice::weaponAttackDamageDieSize({
      damageDieSize: 8,
      versatile: WeaponDice::VersatileDamageDie(10),
      grip: mainWeaponGrip(grip),
      meleeAttack: true,
    })

  pure def qGripChangeFacts: GripChange::WeaponGripChangeFacts = {
    ownTurn: qCurrentActor == fighterActor,
    canAct: true,
    holdsWeapon: true,
    heldWithTwoHands: qMainWeaponGrip == "two_handed",
    otherHandFree: qFighterHasFreeHand,
  }

  pure def witnessProtocolForProjection(
    holes: Set[str],
    result: WitnessResult,
  ): WitnessProtocol[str] =
    witnessProtocolFromResult(holes, "Movement", result)

  pure def qTurnState: TurnProcedureState =
    initialTurnProcedureState
      .with("actionQuota", if (qActionAvailable) ActionAvailable else ActionSpent)
      .with("dashMovementBonusFeet", qDashBonusFeet)
      .with("disengaged", qDisengaged)

  // Physical distance is priced by the existing RAW path owner: a Prone
  // mover crawls, including a move resumed after an Opportunity Attack.
  pure def plainMovementSpendFacts(prone: bool, distanceFeet: int): MovementSpendFacts =
    movementPathSpendFacts(markedMovementPath(prone, distanceFeet, 0, false, 0))

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

  action clearSuccessfulHoles(result: WitnessResult): bool = all {
    qProtocol' = witnessProtocolForProjection(Set(), result),
    qPendingOpportunityAttack' = false,
    qComponentRoute' = componentRouteEvidence,
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
    qMainWeaponGrip' = qMainWeaponGrip,
    qMainWeaponDamageDieSize' = qMainWeaponDamageDieSize,
    clearSuccessfulHoles(WResolved),
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
    qMainWeaponGrip' = qMainWeaponGrip,
    qMainWeaponDamageDieSize' = qMainWeaponDamageDieSize,
    clearSuccessfulHoles(WResolved),
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
    qMainWeaponGrip' = qMainWeaponGrip,
    qMainWeaponDamageDieSize' = qMainWeaponDamageDieSize,
    clearSuccessfulHoles(WResolved),
  }

  action recordInvalid(reason: WitnessInvalidReason): bool = all {
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = qDashBonusFeet,
    qProne' = qProne,
    qDisengaged' = qDisengaged,
    qActionAvailable' = qActionAvailable,
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qMainWeaponGrip' = qMainWeaponGrip,
    qMainWeaponDamageDieSize' = qMainWeaponDamageDieSize,
    qProtocol' = witnessProtocolForProjection(openHoles, WInvalid(reason)),
    qPendingOpportunityAttack' = qPendingOpportunityAttack,
    qComponentRoute' = componentRouteEvidence,
  }

  action init = {
    nondet mainWeaponGrip = mainWeaponGrips.oneOf()
    all {
      qCurrentActor' = fighterActor,
      qMovementSpentFeet' = 0,
      qDashBonusFeet' = 0,
      qProne' = true,
      qDisengaged' = false,
      qActionAvailable' = true,
      qGrappleActive' = false,
      qGrappleEscapeDc' = 0,
      qMainWeaponGrip' = mainWeaponGrip,
      qMainWeaponDamageDieSize' = mainWeaponDamageDieSize(mainWeaponGrip),
      qProtocol' = witnessProtocolForProjection(Set(), WInit),
      qPendingOpportunityAttack' = false,
      qComponentRoute' = componentRouteEvidence,
    }
  }

  action doDiscoverMovement = all {
    qCurrentActor == fighterActor,
    openHoles == Set(),
    qMovementRemainingFeet > 0,
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = qDashBonusFeet,
    qProne' = qProne,
    qDisengaged' = qDisengaged,
    qActionAvailable' = qActionAvailable,
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qMainWeaponGrip' = qMainWeaponGrip,
    qMainWeaponDamageDieSize' = qMainWeaponDamageDieSize,
    qProtocol' = witnessProtocolForProjection(Set("Movement"), WNeedsHoles),
    qPendingOpportunityAttack' = false,
    qComponentRoute' = componentRouteEvidence,
  }

  action doSpendMovement = all {
    openHoles == Set("Movement"),
    canSpendMovement(qFighterMovementState, plainMovementSpendFacts(qProne, movementFillDistanceFeet)),
    recordFighterMovementState(spendMovement(qFighterMovementState, plainMovementSpendFacts(qProne, movementFillDistanceFeet))),
  }

  action doSpendShortMovement = all {
    openHoles == Set("Movement"),
    canSpendMovement(qFighterMovementState, plainMovementSpendFacts(qProne, movementShortDistanceFeet)),
    recordFighterMovementState(spendMovement(qFighterMovementState, plainMovementSpendFacts(qProne, movementShortDistanceFeet))),
  }

  action doSpendFullMovement = all {
    openHoles == Set("Movement"),
    canSpendMovement(qFighterMovementState, plainMovementSpendFacts(qProne, movementFullDistanceFeet)),
    recordFighterMovementState(spendMovement(qFighterMovementState, plainMovementSpendFacts(qProne, movementFullDistanceFeet))),
  }

  action doMoveProvokesOpportunityAttack = all {
    openHoles == Set("Movement"),
    canSpendMovement(qFighterMovementState, plainMovementSpendFacts(qProne, movementFillDistanceFeet)),
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
    qMainWeaponGrip' = qMainWeaponGrip,
    qMainWeaponDamageDieSize' = qMainWeaponDamageDieSize,
    qProtocol' = witnessProtocolForProjection(Set("ReactionDecision"), WNeedsHoles),
    qPendingOpportunityAttack' = true,
    qComponentRoute' = componentRouteEvidence,
  }

  action doMoveThreatSuppressedByDisengage = all {
    openHoles == Set("Movement"),
    canSpendMovement(qFighterMovementState, plainMovementSpendFacts(qProne, movementFillDistanceFeet)),
    not(opportunityAttackTriggered(qTurnState, {
      hostileCreature: true,
      observerCanSee: true,
      leavesReach: true,
      movementResource: OwnMovementActionBonusReactionOrSpeed,
    })),
    recordFighterMovementState(spendMovement(qFighterMovementState, plainMovementSpendFacts(qProne, movementFillDistanceFeet))),
  }

  action doDeclineOpportunityAttack = all {
    openHoles == Set("ReactionDecision"),
    qPendingOpportunityAttack,
    recordFighterMovementState(spendMovement(qFighterMovementState, plainMovementSpendFacts(qProne, movementFillDistanceFeet))),
  }

  action doRejectMovementOverspend = all {
    openHoles == Set("Movement"),
    not(canSpendMovement(qFighterMovementState, plainMovementSpendFacts(qProne, movementOverspendDistanceFeet))),
    recordInvalid(WInvalidFill),
  }

  action doDash = all {
    qCurrentActor == fighterActor,
    openHoles == Set(),
    qActionAvailable,
    recordTurnState(resolveDash(qTurnState, movementSpeedFeet, StandardActionCost(DashAction))),
  }

  action doDisengage = all {
    qCurrentActor == fighterActor,
    openHoles == Set(),
    qActionAvailable,
    recordTurnState(resolveDisengage(qTurnState, StandardActionCost(DisengageAction))),
  }

  action doRejectDashAfterActionSpent = all {
    qCurrentActor == fighterActor,
    openHoles == Set(),
    not(qActionAvailable),
    recordInvalid(WStaleSubject),
  }

  action doStandFromProne = all {
    qCurrentActor == fighterActor,
    openHoles == Set(),
    qProne,
    qFighterMovementState.speedFeet / 2 > 0,
    qMovementRemainingFeet >= qFighterMovementState.speedFeet / 2,
    recordFighterMovementState(standFromProne(qFighterMovementState)),
  }

  action doDropProne = all {
    qCurrentActor == fighterActor,
    openHoles == Set(),
    not(qProne),
    qFighterMovementState.turn.currentActorOwnsTurn,
    effectiveSpeedFeet(qFighterMovementState) > 0,
    recordFighterMovementState(dropProne(qFighterMovementState, { alive: true, proneImmune: false, commandHalt: false })),
  }

  action doDiscoverGrapple = all {
    qCurrentActor == fighterActor,
    openHoles == Set(),
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
    qMainWeaponGrip' = qMainWeaponGrip,
    qMainWeaponDamageDieSize' = qMainWeaponDamageDieSize,
    qProtocol' = witnessProtocolForProjection(Set("TargetChoice"), WNeedsHoles),
    qPendingOpportunityAttack' = false,
    qComponentRoute' = componentRouteEvidence,
  }

  action doSelectGrappleTarget = all {
    openHoles == Set("TargetChoice"),
    qFighterHasFreeHand,
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = qDashBonusFeet,
    qProne' = qProne,
    qDisengaged' = qDisengaged,
    qActionAvailable' = qActionAvailable,
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qMainWeaponGrip' = qMainWeaponGrip,
    qMainWeaponDamageDieSize' = qMainWeaponDamageDieSize,
    qProtocol' = witnessProtocolForProjection(Set("GrappleOutcome"), WNeedsHoles),
    qPendingOpportunityAttack' = false,
    qComponentRoute' = componentRouteEvidence,
  }

  action doRejectGrappleWithoutFreeHand = all {
    openHoles == Set("TargetChoice"),
    not(qFighterHasFreeHand),
    recordInvalid(WInvalidFill),
  }

  action doResolveGrappleSuccess = all {
    openHoles == Set("GrappleOutcome"),
    qActionAvailable,
    recordGrappleState(true, runtimeGrappleEscapeDc, false),
  }

  action doResolveGrappleFailure = all {
    openHoles == Set("GrappleOutcome"),
    qActionAvailable,
    recordGrappleState(false, 0, false),
  }

  action doStartGrappledTargetTurn = all {
    qCurrentActor == fighterActor,
    openHoles == Set(),
    qGrappleActive,
    qCurrentActor' = grappledTargetActor,
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = 0,
    qProne' = qProne,
    qDisengaged' = false,
    qActionAvailable' = true,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qMainWeaponGrip' = qMainWeaponGrip,
    qMainWeaponDamageDieSize' = qMainWeaponDamageDieSize,
    qProtocol' = witnessProtocolForProjection(Set(), WResolved),
    qPendingOpportunityAttack' = false,
    qComponentRoute' = componentRouteEvidence,
  }

  action doDiscoverEscapeGrapple = all {
    qCurrentActor == grappledTargetActor,
    openHoles == Set(),
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
    qMainWeaponGrip' = qMainWeaponGrip,
    qMainWeaponDamageDieSize' = qMainWeaponDamageDieSize,
    qProtocol' = witnessProtocolForProjection(Set("GrappleOutcome"), WNeedsHoles),
    qPendingOpportunityAttack' = false,
    qComponentRoute' = componentRouteEvidence,
  }

  action doResolveEscapeSuccess = all {
    qCurrentActor == grappledTargetActor,
    openHoles == Set("GrappleOutcome"),
    qGrappleActive,
    qActionAvailable,
    val escaped = escapeGrapple(qTurnState, qGrappledTargetState.grapple, qGrappleEscapeDc)
    recordGrappleState(activeGrapple(escaped.grapple), grappleEscapeDc(escaped.grapple), qActionStateAfter(escaped.turn)),
  }

  action doResolveEscapeFailure = all {
    qCurrentActor == grappledTargetActor,
    openHoles == Set("GrappleOutcome"),
    qGrappleActive,
    qActionAvailable,
    val escaped = escapeGrapple(qTurnState, qGrappledTargetState.grapple, qGrappleEscapeDc - 1)
    recordGrappleState(activeGrapple(escaped.grapple), grappleEscapeDc(escaped.grapple), qActionStateAfter(escaped.turn)),
  }

  action recordMainWeaponGrip(grip: str): bool = all {
    qMovementSpentFeet' = qMovementSpentFeet,
    qDashBonusFeet' = qDashBonusFeet,
    qProne' = qProne,
    qDisengaged' = qDisengaged,
    qActionAvailable' = qActionAvailable,
    qCurrentActor' = qCurrentActor,
    qGrappleActive' = qGrappleActive,
    qGrappleEscapeDc' = qGrappleEscapeDc,
    qMainWeaponGrip' = grip,
    qMainWeaponDamageDieSize' = mainWeaponDamageDieSize(grip),
    clearSuccessfulHoles(WResolved),
  }

  // Changing grip costs nothing: the turn's action and movement stay.
  action doChangeMainWeaponGripToTwoHanded = all {
    openHoles == Set(),
    GripChange::twoHandedGripChangeAllowed(qGripChangeFacts),
    recordMainWeaponGrip("two_handed"),
  }

  action doChangeMainWeaponGripToOneHanded = all {
    openHoles == Set(),
    GripChange::oneHandedGripChangeAllowed(qGripChangeFacts),
    recordMainWeaponGrip("one_handed"),
  }

  // A Grapple holds the hand a two-handed grip needs.
  action doRejectTwoHandedGripWithoutFreeHand = all {
    openHoles == Set(),
    qCurrentActor == fighterActor,
    qMainWeaponGrip == "one_handed",
    not(GripChange::twoHandedGripChangeAllowed(qGripChangeFacts)),
    recordInvalid(WStaleSubject),
  }

  action doReleaseGrapple = all {
    openHoles == Set(),
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
    doDropProne,
    doDiscoverGrapple,
    doSelectGrappleTarget,
    doRejectGrappleWithoutFreeHand,
    doResolveGrappleSuccess,
    doResolveGrappleFailure,
    doStartGrappledTargetTurn,
    doDiscoverEscapeGrapple,
    doResolveEscapeSuccess,
    doResolveEscapeFailure,
    doReleaseGrapple,
    doChangeMainWeaponGripToTwoHanded,
    doChangeMainWeaponGripToOneHanded,
    doRejectTwoHandedGripWithoutFreeHand,
  }
}
