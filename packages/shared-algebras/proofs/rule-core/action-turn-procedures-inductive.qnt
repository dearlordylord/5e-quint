// -*- mode: Bluespec; -*-

module actionTurnProceduresInductive {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"

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

  action init = recordTurnProcedureState(initialTurnProcedureState)

  action recordTurnProcedureState(state: TurnProcedureState): bool = all {
    qActionQuota' = state.actionQuota,
    qBonusActionAvailable' = state.bonusActionAvailable,
    qReactionAvailable' = state.reactionAvailable,
    qDashMovementBonusFeet' = state.dashMovementBonusFeet,
    qDisengaged' = state.disengaged,
    qDodging' = state.dodging,
    qHidden' = state.hidden,
    qHelpAttackHeld' = state.helpAttackHeld,
    qReadiedMovementHeld' = state.readiedMovementHeld,
    qStartOfTurnHookActive' = state.startOfTurnHookActive,
    qEndOfTurnHookActive' = state.endOfTurnHookActive,
    qCurrentActorOwnsTurn' = state.currentActorOwnsTurn,
  }

  action doDash = {
    nondet speedFeet = Set(20, 30, 40).oneOf()
    nondet cost = Set(StandardActionCost(DashAction), BonusActionCost).oneOf()
    all {
      recordTurnProcedureState(resolveDash(qTurnProcedureState, speedFeet, cost)),
    }
  }

  action doDisengage = {
    nondet cost = Set(StandardActionCost(DisengageAction), BonusActionCost).oneOf()
    all {
      recordTurnProcedureState(resolveDisengage(qTurnProcedureState, cost)),
    }
  }

  action doDodge = all {
    recordTurnProcedureState(resolveDodge(qTurnProcedureState)),
  }

  action doHelpAttack = {
    nondet targetFactSatisfied = Set(true, false).oneOf()
    all {
      recordTurnProcedureState(resolveHelpAttack(qTurnProcedureState, targetFactSatisfied)),
    }
  }

  action doHide = {
    nondet prerequisiteSatisfied = Set(true, false).oneOf()
    nondet checkTotal = Set(8, 15, 18).oneOf()
    nondet cost = Set(StandardActionCost(HideAction), BonusActionCost).oneOf()
    all {
      recordTurnProcedureState(resolveHide(qTurnProcedureState, {
        prerequisiteSatisfied: prerequisiteSatisfied,
        checkTotal: checkTotal,
        dc: 15,
      }, cost)),
    }
  }

  action doSearch = {
    nondet hiddenTargetExists = Set(true, false).oneOf()
    nondet checkTotal = Set(8, 15, 18).oneOf()
    all {
      recordTurnProcedureState(resolveSearch(qTurnProcedureState, {
        hiddenTargetExists: hiddenTargetExists,
        checkTotal: checkTotal,
        dc: 15,
      })),
    }
  }

  action doReady = {
    nondet triggerSelected = Set(true, false).oneOf()
    all {
      recordTurnProcedureState(resolveReadyMovement(qTurnProcedureState, triggerSelected)),
    }
  }

  action doSpendReaction = all {
    recordTurnProcedureState(spendReaction(qTurnProcedureState)),
  }

  action doStartTurn = all {
    recordTurnProcedureState(startTurn(qTurnProcedureState)),
  }

  action doEndTurn = all {
    recordTurnProcedureState(endTurn(qTurnProcedureState)),
  }

  action doReset = all {
    recordTurnProcedureState(initialTurnProcedureState),
  }

  // Branch budget: 6 Dash choices + 2 Disengage choices + 1 Dodge +
  // 2 Help choices + 12 Hide choices + 6 Search choices + 2 Ready choices +
  // Reaction/Start/End/Reset singletons = 36 transition choices.
  action step = any {
    doDash,
    doDisengage,
    doDodge,
    doHelpAttack,
    doHide,
    doSearch,
    doReady,
    doSpendReaction,
    doStartTurn,
    doEndTurn,
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
    legalTurnProcedureState(qTurnProcedureState),
  }
}
