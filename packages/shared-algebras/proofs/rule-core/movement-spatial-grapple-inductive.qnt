// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-QCORE7-MOVEMENT-GRAPPLE-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.creature-space-movement-permission unit-feature.grappler

module movementSpatialGrappleInductive {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import creatureSizeOrder.* from "./creature-size-order"
  import movementSpatialGrapple.* from "./movement-spatial-grapple"

  var qActionQuota: ActionQuota
  var qBonusActionAvailable: bool
  var qReactionAvailable: bool
  var qDashMovementBonusFeet: int
  var qDisengaged: bool
  var qDodging: bool
  var qHidden: bool
  var qHelpAttackHeld: bool
  var qReadiedMovementHeld: bool
  var qStartOfTurnHookActive: bool
  var qEndOfTurnHookActive: bool
  var qCurrentActorOwnsTurn: bool
  var qSpeedFeet: int
  var qMovementSpentFeet: int
  var qProne: bool
  var qGrapple: GrappleState
  var qOaHostileCreature: bool
  var qOaObserverCanSee: bool
  var qOaLeavesReach: bool
  var qOaMovementResource: MovementResource
  var qOpportunityAttackTriggered: bool

  pure def qTurnProcedureState: TurnProcedureState = {
    actionQuota: qActionQuota,
    bonusActionAvailable: qBonusActionAvailable,
    reactionAvailable: qReactionAvailable,
    dashMovementBonusFeet: qDashMovementBonusFeet,
    disengaged: qDisengaged,
    dodging: qDodging,
    hidden: qHidden,
    helpAttackHeld: qHelpAttackHeld,
    readiedMovementHeld: qReadiedMovementHeld,
    startOfTurnHookActive: qStartOfTurnHookActive,
    endOfTurnHookActive: qEndOfTurnHookActive,
    currentActorOwnsTurn: qCurrentActorOwnsTurn,
  }

  pure def qMovementGrappleState: MovementGrappleState = {
    turn: qTurnProcedureState,
    speedFeet: qSpeedFeet,
    movementSpentFeet: qMovementSpentFeet,
    prone: qProne,
    grapple: qGrapple,
  }

  pure def qOpportunityAttackTriggerFacts: OpportunityAttackTriggerFacts = {
    hostileCreature: qOaHostileCreature,
    observerCanSee: qOaObserverCanSee,
    leavesReach: qOaLeavesReach,
    movementResource: qOaMovementResource,
  }

  action init = all {
    recordMovementGrappleState(initialMovementGrappleState),
  }

  action resetOpportunityAttackFacts = all {
    qOaHostileCreature' = false,
    qOaObserverCanSee' = true,
    qOaLeavesReach' = true,
    qOaMovementResource' = OwnMovementActionBonusReactionOrSpeed,
    qOpportunityAttackTriggered' = false,
  }

  action recordMovementGrappleState(state: MovementGrappleState): bool = all {
    qActionQuota' = state.turn.actionQuota,
    qBonusActionAvailable' = state.turn.bonusActionAvailable,
    qReactionAvailable' = state.turn.reactionAvailable,
    qDashMovementBonusFeet' = state.turn.dashMovementBonusFeet,
    qDisengaged' = state.turn.disengaged,
    qDodging' = state.turn.dodging,
    qHidden' = state.turn.hidden,
    qHelpAttackHeld' = state.turn.helpAttackHeld,
    qReadiedMovementHeld' = state.turn.readiedMovementHeld,
    qStartOfTurnHookActive' = state.turn.startOfTurnHookActive,
    qEndOfTurnHookActive' = state.turn.endOfTurnHookActive,
    qCurrentActorOwnsTurn' = state.turn.currentActorOwnsTurn,
    qSpeedFeet' = state.speedFeet,
    qMovementSpentFeet' = state.movementSpentFeet,
    qProne' = state.prone,
    qGrapple' = state.grapple,
    resetOpportunityAttackFacts,
  }

  action recordTurnAndGrapple(result: EscapeGrappleResult): bool = all {
    qActionQuota' = result.turn.actionQuota,
    qBonusActionAvailable' = result.turn.bonusActionAvailable,
    qReactionAvailable' = result.turn.reactionAvailable,
    qDashMovementBonusFeet' = result.turn.dashMovementBonusFeet,
    qDisengaged' = result.turn.disengaged,
    qDodging' = result.turn.dodging,
    qHidden' = result.turn.hidden,
    qHelpAttackHeld' = result.turn.helpAttackHeld,
    qReadiedMovementHeld' = result.turn.readiedMovementHeld,
    qStartOfTurnHookActive' = result.turn.startOfTurnHookActive,
    qEndOfTurnHookActive' = result.turn.endOfTurnHookActive,
    qCurrentActorOwnsTurn' = result.turn.currentActorOwnsTurn,
    qSpeedFeet' = qSpeedFeet,
    qMovementSpentFeet' = qMovementSpentFeet,
    qProne' = qProne,
    qGrapple' = result.grapple,
    resetOpportunityAttackFacts,
  }

  action doSpendMovement = {
    nondet distanceFeet = Set(0, 5, 10, 30).oneOf()
    nondet extraCostFeet = Set(0, 5, 10).oneOf()
    all {
      recordMovementGrappleState(spendMovement(qMovementGrappleState, {
        distanceFeet: distanceFeet,
        extraCostFeet: extraCostFeet,
      })),
    }
  }

  action doStandFromProne = all {
    recordMovementGrappleState(standFromProne(qMovementGrappleState)),
  }

  action doDropProne = all {
    recordMovementGrappleState(dropProne(qMovementGrappleState)),
  }

  action doDash = {
    nondet speedFeet = Set(20, 30, 40).oneOf()
    nondet cost = Set(StandardActionCost(DashAction), BonusActionCost).oneOf()
    all {
      recordMovementGrappleState(qMovementGrappleState.with("turn", resolveDash(qTurnProcedureState, speedFeet, cost))),
    }
  }

  action doDisengage = {
    nondet cost = Set(StandardActionCost(DisengageAction), BonusActionCost).oneOf()
    all {
      recordMovementGrappleState(qMovementGrappleState.with("turn", resolveDisengage(qTurnProcedureState, cost))),
    }
  }

  action doApplyGrapple = {
    nondet grapplerSize = Set(SmallSize, MediumSize, LargeSize).oneOf()
    nondet targetSize = Set(TinySize, MediumSize, LargeSize, HugeSize).oneOf()
    nondet hasFreeHand = Set(true, false).oneOf()
    nondet targetSaveTotal = Set(8, 15, 20).oneOf()
    nondet escapeDc = Set(10, 13, 15, 20).oneOf()
    all {
      recordMovementGrappleState(qMovementGrappleState.with("grapple", applyGrappleAttempt(qGrapple, {
        grapplerSize: grapplerSize,
        targetSize: targetSize,
        hasFreeHand: hasFreeHand,
        targetSaveTotal: targetSaveTotal,
        escapeDc: escapeDc,
      }))),
    }
  }

  action doCheckOpportunityAttack = {
    nondet hostileCreature = Set(true, false).oneOf()
    nondet observerCanSee = Set(true, false).oneOf()
    nondet leavesReach = Set(true, false).oneOf()
    nondet movementResource = Set(
      OwnMovementActionBonusReactionOrSpeed,
      TeleportResource,
      ForcedMovementNoOwnResource
    ).oneOf()
    val facts = {
      hostileCreature: hostileCreature,
      observerCanSee: observerCanSee,
      leavesReach: leavesReach,
      movementResource: movementResource,
    }
    all {
      qActionQuota' = qActionQuota,
      qBonusActionAvailable' = qBonusActionAvailable,
      qReactionAvailable' = qReactionAvailable,
      qDashMovementBonusFeet' = qDashMovementBonusFeet,
      qDisengaged' = qDisengaged,
      qDodging' = qDodging,
      qHidden' = qHidden,
      qHelpAttackHeld' = qHelpAttackHeld,
      qReadiedMovementHeld' = qReadiedMovementHeld,
      qStartOfTurnHookActive' = qStartOfTurnHookActive,
      qEndOfTurnHookActive' = qEndOfTurnHookActive,
      qCurrentActorOwnsTurn' = qCurrentActorOwnsTurn,
      qSpeedFeet' = qSpeedFeet,
      qMovementSpentFeet' = qMovementSpentFeet,
      qProne' = qProne,
      qGrapple' = qGrapple,
      qOaHostileCreature' = hostileCreature,
      qOaObserverCanSee' = observerCanSee,
      qOaLeavesReach' = leavesReach,
      qOaMovementResource' = movementResource,
      qOpportunityAttackTriggered' = opportunityAttackTriggered(qTurnProcedureState, facts),
    }
  }

  action doEscapeGrapple = {
    nondet checkTotal = Set(8, 10, 15, 20).oneOf()
    all {
      recordTurnAndGrapple(escapeGrapple(qTurnProcedureState, qGrapple, checkTotal)),
    }
  }

  action doReleaseGrapple = all {
    recordMovementGrappleState(qMovementGrappleState.with("grapple", releaseGrapple(qGrapple))),
  }

  action doStartTurn = all {
    recordMovementGrappleState(startMovementTurn(qMovementGrappleState)),
  }

  action doReset = all {
    recordMovementGrappleState(initialMovementGrappleState),
  }

  action step = any {
    doSpendMovement,
    doStandFromProne,
    doDropProne,
    doDash,
    doDisengage,
    doApplyGrapple,
    doCheckOpportunityAttack,
    doEscapeGrapple,
    doReleaseGrapple,
    doStartTurn,
    doReset,
  }

  val invariant = all {
    qActionQuota.in(Set(ActionAvailable, ActionSpent)),
    qBonusActionAvailable.in(Set(true, false)),
    qReactionAvailable.in(Set(true, false)),
    qDashMovementBonusFeet.in(0.to(80)),
    qDisengaged.in(Set(true, false)),
    qDodging.in(Set(true, false)),
    qHidden.in(Set(true, false)),
    qHelpAttackHeld.in(Set(true, false)),
    qReadiedMovementHeld.in(Set(true, false)),
    qStartOfTurnHookActive.in(Set(true, false)),
    qEndOfTurnHookActive.in(Set(true, false)),
    qCurrentActorOwnsTurn.in(Set(true, false)),
    qSpeedFeet.in(0.to(40)),
    qMovementSpentFeet.in(0.to(120)),
    qProne.in(Set(true, false)),
    qGrapple.in(legalGrappleStates),
    qOaHostileCreature.in(Set(true, false)),
    qOaObserverCanSee.in(Set(true, false)),
    qOaLeavesReach.in(Set(true, false)),
    qOaMovementResource.in(Set(OwnMovementActionBonusReactionOrSpeed, TeleportResource, ForcedMovementNoOwnResource)),
    qOpportunityAttackTriggered.in(Set(true, false)),
    legalMovementGrappleState(qMovementGrappleState),
    activeGrapple(qGrapple) implies effectiveSpeedFeet(qMovementGrappleState) == 0,
    qOpportunityAttackTriggered == opportunityAttackTriggered(qTurnProcedureState, qOpportunityAttackTriggerFacts),
  }

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
