// -*- mode: Bluespec; -*-

module statBlockControlsExamples {
  import attackDamageComposition.* from "./attack-damage-composition"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"
  import statBlockControls.* from "./stat-block-controls"

  run test_stat_block_action_attack_spends_attack_action = {
    val result = resolveStatBlockActionAttack(initialStatBlockControlState)
    all {
      assert(result.reaction.reactor.turn.actionQuota == ActionSpent),
      assert(legalStatBlockControlState(result)),
    }
  }

  run test_multiattack_spends_one_attack_action_and_opens_named_dispatches = {
    val profile = {
      firstAttackName: PrimaryStatBlockAttack,
      primaryAttackCount: 2,
      secondaryAttackCount: 1,
    }
    val started = startStatBlockMultiattack(initialStatBlockControlState, profile)
    val firstDispatch = resolveStatBlockMultiattackDispatch(started, PrimaryStatBlockAttack)
    val secondDispatch = resolveStatBlockMultiattackDispatch(firstDispatch, SecondaryStatBlockAttack)
    all {
      assert(started.reaction.reactor.turn.actionQuota == ActionSpent),
      assert(started.multiattack.primaryRemaining == 1),
      assert(started.multiattack.secondaryRemaining == 1),
      assert(multiattackDispatchSubjectPermitted(
        started,
        StatBlockDispatchAttack({ attackName: PrimaryStatBlockAttack })
      )),
      assert(multiattackDispatchSubjectPermitted(started, StatBlockMovementSubject)),
      assert(not(multiattackDispatchSubjectPermitted(started, StatBlockBonusActionSubject))),
      assert(not(statBlockMultiattackContinuationOpen(secondDispatch))),
    }
  }

  run test_end_turn_closes_multiattack_dispatches = {
    val profile = {
      firstAttackName: PrimaryStatBlockAttack,
      primaryAttackCount: 2,
      secondaryAttackCount: 0,
    }
    val started = startStatBlockMultiattack(initialStatBlockControlState, profile)
    val ended = endStatBlockTurn(started)
    all {
      assert(statBlockMultiattackContinuationOpen(started)),
      assert(not(statBlockMultiattackContinuationOpen(ended))),
      assert(not(ended.reaction.reactor.turn.currentActorOwnsTurn)),
    }
  }

  run test_bonus_action_option_spends_bonus_action = {
    val result = resolveStatBlockBonusActionOption(initialStatBlockControlState)
    all {
      assert(not(result.reaction.reactor.turn.bonusActionAvailable)),
      assert(result.reaction.reactor.turn.actionQuota == ActionAvailable),
    }
  }

  run test_reaction_option_uses_window_and_reaction_quota = {
    val offered = offerStatBlockReactionWindow(initialStatBlockControlState, true)
    val declined = declineStatBlockReactionWindow(offered)
    val resolved = resolveStatBlockReactionOption(offered)
    all {
      assert(statBlockReactionWindowOpen(offered)),
      assert(not(statBlockReactionWindowOpen(declined))),
      assert(declined.reaction.reactionWindow == NoReactionWindow),
      assert(declined.reaction.reactor.turn.reactionAvailable),
      assert(not(statBlockReactionWindowOpen(resolved))),
      assert(resolved.reaction.reactionWindow == NoReactionWindow),
      assert(not(resolved.reaction.reactor.turn.reactionAvailable)),
    }
  }

  run test_stat_block_reaction_window_reuses_nested_reaction_protocol = {
    val outerWindow = offerReactionWindow(
      NoReactionWindow,
      OpportunityAttackReactionWindow
    )
    val offered = offerStatBlockReactionWindow(
      initialStatBlockControlState.with(
        "reaction",
        initialReactionProtocolState.with("reactionWindow", outerWindow)
      ),
      true
    )
    val declined = declineStatBlockReactionWindow(offered)
    val resolved = resolveStatBlockReactionOption(offered)
    all {
      assert(statBlockReactionWindowOpen(offered)),
      assert(declined.reaction.reactionWindow == outerWindow),
      assert(resolved.reaction.reactionWindow == outerWindow),
      assert(not(resolved.reaction.reactor.turn.reactionAvailable)),
      assert(legalStatBlockControlState(resolved)),
    }
  }

  run test_stat_block_decline_does_not_close_other_reaction_window = {
    val outerWindow = offerReactionWindow(
      NoReactionWindow,
      OpportunityAttackReactionWindow
    )
    val state = initialStatBlockControlState.with(
      "reaction",
      initialReactionProtocolState.with("reactionWindow", outerWindow)
    )
    val declined = declineStatBlockReactionWindow(state)
    all {
      assert(declined.reaction.reactionWindow == outerWindow),
      assert(declined.reaction.reactor.turn.reactionAvailable),
    }
  }

  run test_legendary_action_window_spends_use_and_closes = {
    val waiting = endStatBlockTurn(initialStatBlockControlState)
    val opened = openLegendaryActionWindowAfterAnotherTurn(waiting, false)
    val resolved = resolveStatBlockLegendaryActionOption(opened, false)
    all {
      assert(opened.legendaryActionWindowOpen),
      assert(not(resolved.legendaryActionWindowOpen)),
      assert(resolved.resources.legendaryUsesRemaining == 1),
    }
  }

  run test_limited_use_daily_recharge_and_rest_recharge_controls = {
    val daily = spendStatBlockLimitedUse(initialStatBlockResourceState, StatBlockDailyUse)
    val recharge = spendStatBlockLimitedUse(daily.resources, StatBlockRechargeUse)
    val failedRoll = processStatBlockRechargeRoll(recharge.resources, 4)
    val successfulRoll = processStatBlockRechargeRoll(failedRoll, 5)
    val restRecharge = spendStatBlockLimitedUse(successfulRoll, StatBlockRechargeAfterRestUse)
    val shortRested = refreshStatBlockResourcesAfterShortRest(restRecharge.resources)
    val longRested = refreshStatBlockResourcesAfterLongRest(shortRested)
    all {
      assert(daily.spent),
      assert(daily.resources.dailyPool.usesRemaining == 0),
      assert(recharge.spent),
      assert(not(recharge.resources.recharge.available)),
      assert(not(failedRoll.recharge.available)),
      assert(successfulRoll.recharge.available),
      assert(restRecharge.spent),
      assert(not(restRecharge.resources.rechargeAfterRestAvailable)),
      assert(shortRested.rechargeAfterRestAvailable),
      assert(longRested.dailyPool.usesRemaining == longRested.dailyPool.maximumUses),
    }
  }

  run test_start_turn_refreshes_legendary_and_processes_recharge_roll = {
    val spentRecharge = spendStatBlockLimitedUse(initialStatBlockResourceState, StatBlockRechargeUse)
    val spentLegendary = initialStatBlockControlState
      .with("resources", spentRecharge.resources.with("legendaryUsesRemaining", 0))
    val started = startStatBlockTurn(spentLegendary, 5)
    all {
      assert(started.resources.legendaryUsesRemaining == started.resources.legendaryUsesMaximum),
      assert(started.resources.recharge.available),
      assert(started.reaction.reactor.turn.reactionAvailable),
    }
  }
}
