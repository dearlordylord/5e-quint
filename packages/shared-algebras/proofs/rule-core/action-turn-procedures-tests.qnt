module actionTurnProceduresTests {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"

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

  run test_action_cost_spend_distinguishes_free_cost_from_rejected_unchanged = {
    val inactiveTurn = initialTurnProcedureState.with("currentActorOwnsTurn", false)
    val freeSpend = spendActionCost(inactiveTurn, FreeCost)
    val rejectedSpend = spendActionCost(inactiveTurn, BonusActionCost)
    all {
      assert(freeSpend.admitted),
      assert(freeSpend.turn == inactiveTurn),
      assert(not(rejectedSpend.admitted)),
      assert(rejectedSpend.turn == inactiveTurn),
    }
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
