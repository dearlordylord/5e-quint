// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
module actionTurnProcedures {
  import attackDamageComposition.* from "./attack-damage-composition"

  type StandardAction =
    | DashAction
    | DisengageAction
    | DodgeAction
    | HelpAction
    | HideAction
    | SearchAction
    | ReadyAction
    | MagicAction
    | AttackAction
    | EscapeGrappleAction

  type ActionCost = StandardActionCost(StandardAction) | BonusActionCost | FreeCost

  type TurnProcedureState = {
    actionQuota: ActionQuota,
    bonusActionAvailable: bool,
    reactionAvailable: bool,
    dashMovementBonusFeet: int,
    disengaged: bool,
    dodging: bool,
    hidden: bool,
    helpAttackHeld: bool,
    readiedMovementHeld: bool,
    startOfTurnHookActive: bool,
    endOfTurnHookActive: bool,
    currentActorOwnsTurn: bool,
  }

  type HideProcedureFacts = {
    prerequisiteSatisfied: bool,
    checkTotal: int,
    dc: int,
  }

  type SearchProcedureFacts = {
    hiddenTargetExists: bool,
    checkTotal: int,
    dc: int,
  }

  type LightPropertyExtraAttackFacts = {
    priorAttackActionLightWeaponAttack: bool,
    differentLightWeapon: bool,
  }

  type LightPropertyExtraAttackResult = {
    turn: TurnProcedureState,
    admitted: bool,
  }

  type ActionCostSpendResult = {
    turn: TurnProcedureState,
    admitted: bool,
  }

  pure def initialTurnProcedureState: TurnProcedureState = {
    actionQuota: ActionAvailable,
    bonusActionAvailable: true,
    reactionAvailable: true,
    dashMovementBonusFeet: 0,
    disengaged: false,
    dodging: false,
    hidden: false,
    helpAttackHeld: false,
    readiedMovementHeld: false,
    startOfTurnHookActive: false,
    endOfTurnHookActive: false,
    currentActorOwnsTurn: true,
  }

  pure def legalTurnProcedureState(state: TurnProcedureState): bool = all {
    state.actionQuota.in(Set(ActionAvailable, ActionSpent)),
    state.bonusActionAvailable.in(Set(true, false)),
    state.reactionAvailable.in(Set(true, false)),
    state.dashMovementBonusFeet >= 0,
    state.dashMovementBonusFeet <= 80,
    (state.actionQuota == ActionAvailable and state.bonusActionAvailable) implies state.dashMovementBonusFeet == 0,
    (state.actionQuota == ActionSpent and state.bonusActionAvailable) implies state.dashMovementBonusFeet <= 40,
    (state.actionQuota == ActionAvailable and not(state.bonusActionAvailable)) implies state.dashMovementBonusFeet <= 40,
    state.disengaged.in(Set(true, false)),
    state.dodging.in(Set(true, false)),
    state.hidden.in(Set(true, false)),
    state.helpAttackHeld.in(Set(true, false)),
    state.readiedMovementHeld.in(Set(true, false)),
    state.startOfTurnHookActive.in(Set(true, false)),
    state.endOfTurnHookActive.in(Set(true, false)),
    state.currentActorOwnsTurn.in(Set(true, false)),
  }

  pure def canSpendAction(state: TurnProcedureState): bool =
    state.currentActorOwnsTurn and state.actionQuota == ActionAvailable

  pure def canSpendBonusAction(state: TurnProcedureState): bool =
    state.currentActorOwnsTurn and state.bonusActionAvailable

  pure def canSpendActionCost(state: TurnProcedureState, cost: ActionCost): bool =
    if (cost == FreeCost) true
    else if (cost == BonusActionCost) canSpendBonusAction(state)
    else canSpendAction(state)

  pure def spendActionCost(state: TurnProcedureState, cost: ActionCost): ActionCostSpendResult =
    if (not(canSpendActionCost(state, cost))) {
      turn: state,
      admitted: false,
    } else if (cost == FreeCost) {
      turn: state,
      admitted: true,
    } else if (cost == BonusActionCost) {
      turn: {
        actionQuota: state.actionQuota,
        bonusActionAvailable: false,
        reactionAvailable: state.reactionAvailable,
        dashMovementBonusFeet: state.dashMovementBonusFeet,
        disengaged: state.disengaged,
        dodging: state.dodging,
        hidden: state.hidden,
        helpAttackHeld: state.helpAttackHeld,
        readiedMovementHeld: state.readiedMovementHeld,
        startOfTurnHookActive: state.startOfTurnHookActive,
        endOfTurnHookActive: state.endOfTurnHookActive,
        currentActorOwnsTurn: state.currentActorOwnsTurn,
      },
      admitted: true,
    } else {
      turn: {
        actionQuota: ActionSpent,
        bonusActionAvailable: state.bonusActionAvailable,
        reactionAvailable: state.reactionAvailable,
        dashMovementBonusFeet: state.dashMovementBonusFeet,
        disengaged: state.disengaged,
        dodging: state.dodging,
        hidden: state.hidden,
        helpAttackHeld: state.helpAttackHeld,
        readiedMovementHeld: state.readiedMovementHeld,
        startOfTurnHookActive: state.startOfTurnHookActive,
        endOfTurnHookActive: state.endOfTurnHookActive,
        currentActorOwnsTurn: state.currentActorOwnsTurn,
      },
      admitted: true,
    }

  pure def resolveDash(state: TurnProcedureState, speedFeet: int, cost: ActionCost): TurnProcedureState = {
    val spend = spendActionCost(state, cost)
    if (not(spend.admitted)) state
    else {
      actionQuota: spend.turn.actionQuota,
      bonusActionAvailable: spend.turn.bonusActionAvailable,
      reactionAvailable: spend.turn.reactionAvailable,
      dashMovementBonusFeet: spend.turn.dashMovementBonusFeet + speedFeet,
      disengaged: spend.turn.disengaged,
      dodging: spend.turn.dodging,
      hidden: spend.turn.hidden,
      helpAttackHeld: spend.turn.helpAttackHeld,
      readiedMovementHeld: spend.turn.readiedMovementHeld,
      startOfTurnHookActive: spend.turn.startOfTurnHookActive,
      endOfTurnHookActive: spend.turn.endOfTurnHookActive,
      currentActorOwnsTurn: spend.turn.currentActorOwnsTurn,
    }
  }

  pure def resolveDisengage(state: TurnProcedureState, cost: ActionCost): TurnProcedureState = {
    val spend = spendActionCost(state, cost)
    if (not(spend.admitted)) state
    else {
      actionQuota: spend.turn.actionQuota,
      bonusActionAvailable: spend.turn.bonusActionAvailable,
      reactionAvailable: spend.turn.reactionAvailable,
      dashMovementBonusFeet: spend.turn.dashMovementBonusFeet,
      disengaged: true,
      dodging: spend.turn.dodging,
      hidden: spend.turn.hidden,
      helpAttackHeld: spend.turn.helpAttackHeld,
      readiedMovementHeld: spend.turn.readiedMovementHeld,
      startOfTurnHookActive: spend.turn.startOfTurnHookActive,
      endOfTurnHookActive: spend.turn.endOfTurnHookActive,
      currentActorOwnsTurn: spend.turn.currentActorOwnsTurn,
    }
  }

  pure def resolveDodge(state: TurnProcedureState): TurnProcedureState = {
    val spend = spendActionCost(state, StandardActionCost(DodgeAction))
    if (not(spend.admitted)) state
    else {
      actionQuota: spend.turn.actionQuota,
      bonusActionAvailable: spend.turn.bonusActionAvailable,
      reactionAvailable: spend.turn.reactionAvailable,
      dashMovementBonusFeet: spend.turn.dashMovementBonusFeet,
      disengaged: spend.turn.disengaged,
      dodging: true,
      hidden: spend.turn.hidden,
      helpAttackHeld: spend.turn.helpAttackHeld,
      readiedMovementHeld: spend.turn.readiedMovementHeld,
      startOfTurnHookActive: spend.turn.startOfTurnHookActive,
      endOfTurnHookActive: spend.turn.endOfTurnHookActive,
      currentActorOwnsTurn: spend.turn.currentActorOwnsTurn,
    }
  }

  pure def resolveHelpAttack(state: TurnProcedureState, targetFactSatisfied: bool): TurnProcedureState = {
    val spend = spendActionCost(state, StandardActionCost(HelpAction))
    if (not(targetFactSatisfied) or not(spend.admitted)) state
    else {
      actionQuota: spend.turn.actionQuota,
      bonusActionAvailable: spend.turn.bonusActionAvailable,
      reactionAvailable: spend.turn.reactionAvailable,
      dashMovementBonusFeet: spend.turn.dashMovementBonusFeet,
      disengaged: spend.turn.disengaged,
      dodging: spend.turn.dodging,
      hidden: spend.turn.hidden,
      helpAttackHeld: true,
      readiedMovementHeld: spend.turn.readiedMovementHeld,
      startOfTurnHookActive: spend.turn.startOfTurnHookActive,
      endOfTurnHookActive: spend.turn.endOfTurnHookActive,
      currentActorOwnsTurn: spend.turn.currentActorOwnsTurn,
    }
  }

  pure def resolveHide(state: TurnProcedureState, facts: HideProcedureFacts, cost: ActionCost): TurnProcedureState = {
    val spend = spendActionCost(state, cost)
    if (not(facts.prerequisiteSatisfied) or not(spend.admitted)) state
    else {
      actionQuota: spend.turn.actionQuota,
      bonusActionAvailable: spend.turn.bonusActionAvailable,
      reactionAvailable: spend.turn.reactionAvailable,
      dashMovementBonusFeet: spend.turn.dashMovementBonusFeet,
      disengaged: spend.turn.disengaged,
      dodging: spend.turn.dodging,
      hidden: facts.checkTotal >= facts.dc,
      helpAttackHeld: spend.turn.helpAttackHeld,
      readiedMovementHeld: spend.turn.readiedMovementHeld,
      startOfTurnHookActive: spend.turn.startOfTurnHookActive,
      endOfTurnHookActive: spend.turn.endOfTurnHookActive,
      currentActorOwnsTurn: spend.turn.currentActorOwnsTurn,
    }
  }

  pure def resolveSearch(state: TurnProcedureState, facts: SearchProcedureFacts): TurnProcedureState = {
    val spend = spendActionCost(state, StandardActionCost(SearchAction))
    if (not(facts.hiddenTargetExists) or not(spend.admitted)) state
    else {
      actionQuota: spend.turn.actionQuota,
      bonusActionAvailable: spend.turn.bonusActionAvailable,
      reactionAvailable: spend.turn.reactionAvailable,
      dashMovementBonusFeet: spend.turn.dashMovementBonusFeet,
      disengaged: spend.turn.disengaged,
      dodging: spend.turn.dodging,
      hidden: if (facts.checkTotal >= facts.dc) false else spend.turn.hidden,
      helpAttackHeld: spend.turn.helpAttackHeld,
      readiedMovementHeld: spend.turn.readiedMovementHeld,
      startOfTurnHookActive: spend.turn.startOfTurnHookActive,
      endOfTurnHookActive: spend.turn.endOfTurnHookActive,
      currentActorOwnsTurn: spend.turn.currentActorOwnsTurn,
    }
  }

  pure def resolveLightPropertyExtraAttack(
    state: TurnProcedureState,
    facts: LightPropertyExtraAttackFacts
  ): LightPropertyExtraAttackResult = {
    val admitted = all {
      legalTurnProcedureState(state),
      canSpendBonusAction(state),
      facts.priorAttackActionLightWeaponAttack,
      facts.differentLightWeapon,
    }
    {
      turn: if (admitted) spendActionCost(state, BonusActionCost).turn else state,
      admitted: admitted,
    }
  }

  pure def resolveReadyMovement(state: TurnProcedureState, triggerSelected: bool): TurnProcedureState = {
    val spend = spendActionCost(state, StandardActionCost(ReadyAction))
    if (not(triggerSelected) or not(spend.admitted)) state
    else {
      actionQuota: spend.turn.actionQuota,
      bonusActionAvailable: spend.turn.bonusActionAvailable,
      reactionAvailable: spend.turn.reactionAvailable,
      dashMovementBonusFeet: spend.turn.dashMovementBonusFeet,
      disengaged: spend.turn.disengaged,
      dodging: spend.turn.dodging,
      hidden: spend.turn.hidden,
      helpAttackHeld: spend.turn.helpAttackHeld,
      readiedMovementHeld: true,
      startOfTurnHookActive: true,
      endOfTurnHookActive: spend.turn.endOfTurnHookActive,
      currentActorOwnsTurn: spend.turn.currentActorOwnsTurn,
    }
  }

  pure def spendReaction(state: TurnProcedureState): TurnProcedureState =
    if (not(state.reactionAvailable)) state
    else {
      actionQuota: state.actionQuota,
      bonusActionAvailable: state.bonusActionAvailable,
      reactionAvailable: false,
      dashMovementBonusFeet: state.dashMovementBonusFeet,
      disengaged: state.disengaged,
      dodging: state.dodging,
      hidden: state.hidden,
      helpAttackHeld: state.helpAttackHeld,
      readiedMovementHeld: state.readiedMovementHeld,
      startOfTurnHookActive: state.startOfTurnHookActive,
      endOfTurnHookActive: state.endOfTurnHookActive,
      currentActorOwnsTurn: state.currentActorOwnsTurn,
    }

  pure def startTurn(state: TurnProcedureState): TurnProcedureState = {
    val reset = initialTurnProcedureState
    {
      actionQuota: reset.actionQuota,
      bonusActionAvailable: reset.bonusActionAvailable,
      reactionAvailable: true,
      dashMovementBonusFeet: reset.dashMovementBonusFeet,
      disengaged: reset.disengaged,
      dodging: reset.dodging,
      hidden: state.hidden,
      helpAttackHeld: false,
      readiedMovementHeld: false,
      startOfTurnHookActive: false,
      endOfTurnHookActive: state.endOfTurnHookActive,
      currentActorOwnsTurn: true,
    }
  }

  pure def endTurn(state: TurnProcedureState): TurnProcedureState = {
    actionQuota: state.actionQuota,
    bonusActionAvailable: state.bonusActionAvailable,
    reactionAvailable: state.reactionAvailable,
    dashMovementBonusFeet: state.dashMovementBonusFeet,
    disengaged: state.disengaged,
    dodging: state.dodging,
    hidden: state.hidden,
    helpAttackHeld: state.helpAttackHeld,
    readiedMovementHeld: state.readiedMovementHeld,
    startOfTurnHookActive: state.startOfTurnHookActive,
    endOfTurnHookActive: false,
    currentActorOwnsTurn: false,
  }

}
