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

  pure def spendActionCost(state: TurnProcedureState, cost: ActionCost): TurnProcedureState =
    if (not(canSpendActionCost(state, cost))) state
    else if (cost == FreeCost) state
    else if (cost == BonusActionCost) {
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
    } else {
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
    }

  pure def resolveDash(state: TurnProcedureState, speedFeet: int, cost: ActionCost): TurnProcedureState = {
    val spent = spendActionCost(state, cost)
    if (spent == state and cost != FreeCost) state
    else {
      actionQuota: spent.actionQuota,
      bonusActionAvailable: spent.bonusActionAvailable,
      reactionAvailable: spent.reactionAvailable,
      dashMovementBonusFeet: spent.dashMovementBonusFeet + speedFeet,
      disengaged: spent.disengaged,
      dodging: spent.dodging,
      hidden: spent.hidden,
      helpAttackHeld: spent.helpAttackHeld,
      readiedMovementHeld: spent.readiedMovementHeld,
      startOfTurnHookActive: spent.startOfTurnHookActive,
      endOfTurnHookActive: spent.endOfTurnHookActive,
      currentActorOwnsTurn: spent.currentActorOwnsTurn,
    }
  }

  pure def resolveDisengage(state: TurnProcedureState, cost: ActionCost): TurnProcedureState = {
    val spent = spendActionCost(state, cost)
    if (spent == state and cost != FreeCost) state
    else {
      actionQuota: spent.actionQuota,
      bonusActionAvailable: spent.bonusActionAvailable,
      reactionAvailable: spent.reactionAvailable,
      dashMovementBonusFeet: spent.dashMovementBonusFeet,
      disengaged: true,
      dodging: spent.dodging,
      hidden: spent.hidden,
      helpAttackHeld: spent.helpAttackHeld,
      readiedMovementHeld: spent.readiedMovementHeld,
      startOfTurnHookActive: spent.startOfTurnHookActive,
      endOfTurnHookActive: spent.endOfTurnHookActive,
      currentActorOwnsTurn: spent.currentActorOwnsTurn,
    }
  }

  pure def resolveDodge(state: TurnProcedureState): TurnProcedureState = {
    val spent = spendActionCost(state, StandardActionCost(DodgeAction))
    if (spent == state) state
    else {
      actionQuota: spent.actionQuota,
      bonusActionAvailable: spent.bonusActionAvailable,
      reactionAvailable: spent.reactionAvailable,
      dashMovementBonusFeet: spent.dashMovementBonusFeet,
      disengaged: spent.disengaged,
      dodging: true,
      hidden: spent.hidden,
      helpAttackHeld: spent.helpAttackHeld,
      readiedMovementHeld: spent.readiedMovementHeld,
      startOfTurnHookActive: spent.startOfTurnHookActive,
      endOfTurnHookActive: spent.endOfTurnHookActive,
      currentActorOwnsTurn: spent.currentActorOwnsTurn,
    }
  }

  pure def resolveHelpAttack(state: TurnProcedureState, targetFactSatisfied: bool): TurnProcedureState = {
    val spent = spendActionCost(state, StandardActionCost(HelpAction))
    if (not(targetFactSatisfied) or spent == state) state
    else {
      actionQuota: spent.actionQuota,
      bonusActionAvailable: spent.bonusActionAvailable,
      reactionAvailable: spent.reactionAvailable,
      dashMovementBonusFeet: spent.dashMovementBonusFeet,
      disengaged: spent.disengaged,
      dodging: spent.dodging,
      hidden: spent.hidden,
      helpAttackHeld: true,
      readiedMovementHeld: spent.readiedMovementHeld,
      startOfTurnHookActive: spent.startOfTurnHookActive,
      endOfTurnHookActive: spent.endOfTurnHookActive,
      currentActorOwnsTurn: spent.currentActorOwnsTurn,
    }
  }

  pure def resolveHide(state: TurnProcedureState, facts: HideProcedureFacts, cost: ActionCost): TurnProcedureState = {
    val spent = spendActionCost(state, cost)
    if (not(facts.prerequisiteSatisfied) or spent == state) state
    else {
      actionQuota: spent.actionQuota,
      bonusActionAvailable: spent.bonusActionAvailable,
      reactionAvailable: spent.reactionAvailable,
      dashMovementBonusFeet: spent.dashMovementBonusFeet,
      disengaged: spent.disengaged,
      dodging: spent.dodging,
      hidden: facts.checkTotal >= facts.dc,
      helpAttackHeld: spent.helpAttackHeld,
      readiedMovementHeld: spent.readiedMovementHeld,
      startOfTurnHookActive: spent.startOfTurnHookActive,
      endOfTurnHookActive: spent.endOfTurnHookActive,
      currentActorOwnsTurn: spent.currentActorOwnsTurn,
    }
  }

  pure def resolveSearch(state: TurnProcedureState, facts: SearchProcedureFacts): TurnProcedureState = {
    val spent = spendActionCost(state, StandardActionCost(SearchAction))
    if (not(facts.hiddenTargetExists) or spent == state) state
    else {
      actionQuota: spent.actionQuota,
      bonusActionAvailable: spent.bonusActionAvailable,
      reactionAvailable: spent.reactionAvailable,
      dashMovementBonusFeet: spent.dashMovementBonusFeet,
      disengaged: spent.disengaged,
      dodging: spent.dodging,
      hidden: if (facts.checkTotal >= facts.dc) false else spent.hidden,
      helpAttackHeld: spent.helpAttackHeld,
      readiedMovementHeld: spent.readiedMovementHeld,
      startOfTurnHookActive: spent.startOfTurnHookActive,
      endOfTurnHookActive: spent.endOfTurnHookActive,
      currentActorOwnsTurn: spent.currentActorOwnsTurn,
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
      turn: if (admitted) spendActionCost(state, BonusActionCost) else state,
      admitted: admitted,
    }
  }

  run test_light_property_extra_attack_requires_prior_attack_and_spends_bonus_action = {
    val admitted = resolveLightPropertyExtraAttack(
      initialTurnProcedureState,
      {
        priorAttackActionLightWeaponAttack: true,
        differentLightWeapon: true,
      },
    )
    val rejected = resolveLightPropertyExtraAttack(
      initialTurnProcedureState,
      {
        priorAttackActionLightWeaponAttack: false,
        differentLightWeapon: true,
      },
    )
    all {
      assert(admitted.admitted),
      assert(admitted.turn.actionQuota == ActionAvailable),
      assert(not(admitted.turn.bonusActionAvailable)),
      assert(not(rejected.admitted)),
      assert(rejected.turn == initialTurnProcedureState),
    }
  }

  pure def resolveReadyMovement(state: TurnProcedureState, triggerSelected: bool): TurnProcedureState = {
    val spent = spendActionCost(state, StandardActionCost(ReadyAction))
    if (not(triggerSelected) or spent == state) state
    else {
      actionQuota: spent.actionQuota,
      bonusActionAvailable: spent.bonusActionAvailable,
      reactionAvailable: spent.reactionAvailable,
      dashMovementBonusFeet: spent.dashMovementBonusFeet,
      disengaged: spent.disengaged,
      dodging: spent.dodging,
      hidden: spent.hidden,
      helpAttackHeld: spent.helpAttackHeld,
      readiedMovementHeld: true,
      startOfTurnHookActive: true,
      endOfTurnHookActive: spent.endOfTurnHookActive,
      currentActorOwnsTurn: spent.currentActorOwnsTurn,
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

  run test_dash_spends_action_and_adds_speed_to_movement_budget = {
    val result = resolveDash(initialTurnProcedureState, 30, StandardActionCost(DashAction))
    all {
      assert(result.actionQuota == ActionSpent),
      assert(result.dashMovementBonusFeet == 30),
      assert(legalTurnProcedureState(result)),
    }
  }

  run test_bonus_action_dash_spends_bonus_action_not_action = {
    val result = resolveDash(initialTurnProcedureState, 30, BonusActionCost)
    all {
      assert(result.actionQuota == ActionAvailable),
      assert(not(result.bonusActionAvailable)),
      assert(result.dashMovementBonusFeet == 30),
    }
  }

  run test_disengage_and_dodge_store_turn_facts = {
    val disengaged = resolveDisengage(initialTurnProcedureState, StandardActionCost(DisengageAction))
    val dodged = resolveDodge(initialTurnProcedureState)
    all {
      assert(disengaged.disengaged),
      assert(disengaged.actionQuota == ActionSpent),
      assert(dodged.dodging),
      assert(dodged.actionQuota == ActionSpent),
    }
  }

  run test_hide_uses_caller_prerequisite_and_check = {
    val hidden = resolveHide(initialTurnProcedureState, {
      prerequisiteSatisfied: true,
      checkTotal: 18,
      dc: 15,
    }, StandardActionCost(HideAction))
    val notHidden = resolveHide(initialTurnProcedureState, {
      prerequisiteSatisfied: false,
      checkTotal: 18,
      dc: 15,
    }, StandardActionCost(HideAction))
    all {
      assert(hidden.hidden),
      assert(hidden.actionQuota == ActionSpent),
      assert(not(notHidden.hidden)),
      assert(notHidden.actionQuota == ActionAvailable),
    }
  }

  run test_search_uses_caller_hidden_target_and_check = {
    val state = {
      actionQuota: ActionAvailable,
      bonusActionAvailable: true,
      reactionAvailable: true,
      dashMovementBonusFeet: 0,
      disengaged: false,
      dodging: false,
      hidden: true,
      helpAttackHeld: false,
      readiedMovementHeld: false,
      startOfTurnHookActive: false,
      endOfTurnHookActive: false,
      currentActorOwnsTurn: true,
    }
    val found = resolveSearch(state, { hiddenTargetExists: true, checkTotal: 16, dc: 15 })
    all {
      assert(not(found.hidden)),
      assert(found.actionQuota == ActionSpent),
    }
  }

  run test_ready_holds_reaction_movement_until_start_turn = {
    val readied = resolveReadyMovement(initialTurnProcedureState, true)
    val nextTurn = startTurn(readied)
    all {
      assert(readied.readiedMovementHeld),
      assert(readied.startOfTurnHookActive),
      assert(not(nextTurn.readiedMovementHeld)),
      assert(not(nextTurn.startOfTurnHookActive)),
    }
  }

  run test_reaction_resets_at_start_turn = {
    val spent = spendReaction(initialTurnProcedureState)
    all {
      assert(not(spent.reactionAvailable)),
      assert(startTurn(spent).reactionAvailable),
    }
  }

  run test_end_turn_expires_end_turn_hooks_and_releases_actor = {
    val state = {
      actionQuota: ActionSpent,
      bonusActionAvailable: false,
      reactionAvailable: false,
      dashMovementBonusFeet: 30,
      disengaged: true,
      dodging: true,
      hidden: true,
      helpAttackHeld: true,
      readiedMovementHeld: true,
      startOfTurnHookActive: true,
      endOfTurnHookActive: true,
      currentActorOwnsTurn: true,
    }
    val ended = endTurn(state)
    all {
      assert(not(ended.endOfTurnHookActive)),
      assert(not(ended.currentActorOwnsTurn)),
      assert(ended.actionQuota == ActionSpent),
    }
  }
}
