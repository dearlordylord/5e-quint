// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-QCORE11-STAT-BLOCK-CONTROLS-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof stat-block.attack-control

module statBlockControlsInductive {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import movementSpatialGrapple.* from "./movement-spatial-grapple"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"
  import statBlockControls.* from "./stat-block-controls"

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
  var qReactionWindow: ReactionWindowState
  var qInterruptedConcentration: ConcentrationState
  var qReactorConcentration: ConcentrationState
  var qPrimaryDispatchesRemaining: int
  var qSecondaryDispatchesRemaining: int
  var qDailyUsesRemaining: int
  var qDailyUsesMaximum: int
  var qRechargeMinimumRoll: int
  var qRechargeAvailable: bool
  var qRechargeAfterRestAvailable: bool
  var qLegendaryUsesRemaining: int
  var qLegendaryUsesMaximum: int
  var qLegendaryActionWindowOpen: bool

  pure def qTurn: TurnProcedureState = {
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

  pure def qReactionProtocol: ReactionProtocolState = {
    interruptedActor: initialMovementGrappleState,
    reactor: initialMovementGrappleState.with("turn", qTurn),
    reactionWindow: qReactionWindow,
    concentration: {
      interruptedActor: qInterruptedConcentration,
      reactor: qReactorConcentration,
    },
  }

  pure def qMultiattack: StatBlockMultiattackDispatches = {
    primaryRemaining: qPrimaryDispatchesRemaining,
    secondaryRemaining: qSecondaryDispatchesRemaining,
  }

  pure def qResources: StatBlockResourceState = {
    dailyPool: {
      usesRemaining: qDailyUsesRemaining,
      maximumUses: qDailyUsesMaximum,
    },
    recharge: {
      minimumRoll: qRechargeMinimumRoll,
      available: qRechargeAvailable,
    },
    rechargeAfterRestAvailable: qRechargeAfterRestAvailable,
    legendaryUsesRemaining: qLegendaryUsesRemaining,
    legendaryUsesMaximum: qLegendaryUsesMaximum,
  }

  pure def qState: StatBlockControlState = {
    reaction: qReactionProtocol,
    multiattack: qMultiattack,
    resources: qResources,
    legendaryActionWindowOpen: qLegendaryActionWindowOpen,
  }

  action init = all {
    recordState(initialStatBlockControlState),
  }

  action recordTurn(turn: TurnProcedureState): bool = all {
    qActionQuota' = turn.actionQuota,
    qBonusActionAvailable' = turn.bonusActionAvailable,
    qReactionAvailable' = turn.reactionAvailable,
    qDashMovementBonusFeet' = turn.dashMovementBonusFeet,
    qDisengaged' = turn.disengaged,
    qDodging' = turn.dodging,
    qHidden' = turn.hidden,
    qHelpAttackHeld' = turn.helpAttackHeld,
    qReadiedMovementHeld' = turn.readiedMovementHeld,
    qStartOfTurnHookActive' = turn.startOfTurnHookActive,
    qEndOfTurnHookActive' = turn.endOfTurnHookActive,
    qCurrentActorOwnsTurn' = turn.currentActorOwnsTurn,
  }

  action recordState(state: StatBlockControlState): bool = all {
    recordTurn(statBlockActorTurn(state)),
    qReactionWindow' = state.reaction.reactionWindow,
    qInterruptedConcentration' = state.reaction.concentration.interruptedActor,
    qReactorConcentration' = state.reaction.concentration.reactor,
    qPrimaryDispatchesRemaining' = state.multiattack.primaryRemaining,
    qSecondaryDispatchesRemaining' = state.multiattack.secondaryRemaining,
    qDailyUsesRemaining' = state.resources.dailyPool.usesRemaining,
    qDailyUsesMaximum' = state.resources.dailyPool.maximumUses,
    qRechargeMinimumRoll' = state.resources.recharge.minimumRoll,
    qRechargeAvailable' = state.resources.recharge.available,
    qRechargeAfterRestAvailable' = state.resources.rechargeAfterRestAvailable,
    qLegendaryUsesRemaining' = state.resources.legendaryUsesRemaining,
    qLegendaryUsesMaximum' = state.resources.legendaryUsesMaximum,
    qLegendaryActionWindowOpen' = state.legendaryActionWindowOpen,
  }

  action doActionAttack = all {
    recordState(resolveStatBlockActionAttack(qState)),
  }

  action doMultiattack = {
    val profile = {
      firstAttackName: PrimaryStatBlockAttack,
      primaryAttackCount: 2,
      secondaryAttackCount: 1,
    }
    all {
      recordState(startStatBlockMultiattack(qState, profile)),
    }
  }

  action doDispatch = {
    nondet attackName = Set(PrimaryStatBlockAttack, SecondaryStatBlockAttack).oneOf()
    all {
      recordState(resolveStatBlockMultiattackDispatch(qState, attackName)),
    }
  }

  action doBonusAction = all {
    recordState(resolveStatBlockBonusActionOption(qState)),
  }

  action doReaction = {
    val offered = offerStatBlockReactionWindow(qState, true)
    nondet takeReaction = Set(true, false).oneOf()
    val result =
      if (takeReaction) resolveStatBlockReactionOption(offered)
      else declineStatBlockReactionWindow(offered)
    all {
      recordState(result),
    }
  }

  action doLegendaryAction = {
    nondet actorIncapacitated = Set(true, false).oneOf()
    val opened = openLegendaryActionWindowAfterAnotherTurn(qState, actorIncapacitated)
    all {
      recordState(resolveStatBlockLegendaryActionOption(opened, actorIncapacitated)),
    }
  }

  action doDailyUse = {
    val spent = spendStatBlockLimitedUse(qResources, StatBlockDailyUse)
    all {
      recordState(qState.with("resources", spent.resources)),
    }
  }

  action doRechargeUse = {
    val spent = spendStatBlockLimitedUse(qResources, StatBlockRechargeUse)
    all {
      recordState(qState.with("resources", spent.resources)),
    }
  }

  action doRestRechargeUse = {
    val spent = spendStatBlockLimitedUse(qResources, StatBlockRechargeAfterRestUse)
    all {
      recordState(qState.with("resources", spent.resources)),
    }
  }

  action doStartTurn = {
    nondet rechargeRoll = Set(1, 4, 5, 6).oneOf()
    all {
      recordState(startStatBlockTurn(qState, rechargeRoll)),
    }
  }

  action doShortRest = all {
    recordState(qState.with("resources", refreshStatBlockResourcesAfterShortRest(qResources))),
  }

  action doLongRest = all {
    recordState(qState.with("resources", refreshStatBlockResourcesAfterLongRest(qResources))),
  }

  action doEndTurn = all {
    recordState(endStatBlockTurn(qState)),
  }

  action step = any {
    // Branch budget: thirteen stat-block-control branches with bounded
    // resources and two fixture attack names. Catalog breadth stays in
    // projection/parser tests outside QNT.
    doActionAttack,
    doMultiattack,
    doDispatch,
    doBonusAction,
    doReaction,
    doLegendaryAction,
    doDailyUse,
    doRechargeUse,
    doRestRechargeUse,
    doStartTurn,
    doShortRest,
    doLongRest,
    doEndTurn,
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
    legalReactionWindowState(qReactionWindow),
    qInterruptedConcentration.in(Set(NoConcentration, Concentrating)),
    qReactorConcentration.in(Set(NoConcentration, Concentrating)),
    qPrimaryDispatchesRemaining.in(0.to(3)),
    qSecondaryDispatchesRemaining.in(0.to(3)),
    qPrimaryDispatchesRemaining + qSecondaryDispatchesRemaining <= 3,
    qDailyUsesMaximum.in(0.to(6)),
    qDailyUsesRemaining.in(0.to(qDailyUsesMaximum)),
    qRechargeMinimumRoll.in(2.to(6)),
    qRechargeAvailable.in(Set(true, false)),
    qRechargeAfterRestAvailable.in(Set(true, false)),
    qLegendaryUsesMaximum.in(0.to(6)),
    qLegendaryUsesRemaining.in(0.to(qLegendaryUsesMaximum)),
    qLegendaryActionWindowOpen.in(Set(true, false)),
    (qPrimaryDispatchesRemaining + qSecondaryDispatchesRemaining > 0) implies qCurrentActorOwnsTurn,
    qLegendaryActionWindowOpen implies not(qCurrentActorOwnsTurn),
    qLegendaryActionWindowOpen implies qLegendaryUsesRemaining > 0,
    legalTurnProcedureState(qTurn),
    legalReactionProtocolState(qReactionProtocol),
    legalStatBlockMultiattackDispatches(qMultiattack),
    legalStatBlockResourceState(qResources),
    legalStatBlockControlState(qState),
  }
}
