// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE11-STAT-BLOCK-CONTROLS-001

module statBlockControls {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"

  // RAW anchors:
  // - Monsters/Overview.md: Actions, Multiattack, Bonus Action, Reactions,
  //   Legendary Actions, and Limited Usage.
  // - Rules-Glossary.md: Stat Block, Bonus Action, and Reaction.
  // - ASSUMPTIONS.md A18/A44: Multiattack maps to named attack dispatches
  //   inside the Attack action, with only Movement and End Turn interleaving.
  // - ASSUMPTIONS.md A21-A24: Recharge rolls are keyed event arguments,
  //   resource refresh timing is explicit, and Legendary Action per-name
  //   cooldowns are caller-owned.

  type StatBlockAttackName =
    | PrimaryStatBlockAttack
    | SecondaryStatBlockAttack

  type StatBlockLimitedUseKind =
    | StatBlockDailyUse
    | StatBlockRechargeUse
    | StatBlockRechargeAfterRestUse

  type StatBlockDispatchSubject =
    | StatBlockDispatchAttack({ attackName: StatBlockAttackName })
    | StatBlockMovementSubject
    | StatBlockEndTurnSubject
    | StatBlockBonusActionSubject
    | StatBlockOrdinaryActionSubject

  type StatBlockLimitedUsePool = {
    usesRemaining: int,
    maximumUses: int,
  }

  type StatBlockRechargeControl = {
    minimumRoll: int,
    available: bool,
  }

  type StatBlockMultiattackProfile = {
    firstAttackName: StatBlockAttackName,
    primaryAttackCount: int,
    secondaryAttackCount: int,
  }

  type StatBlockMultiattackDispatches = {
    primaryRemaining: int,
    secondaryRemaining: int,
  }

  type StatBlockResourceState = {
    dailyPool: StatBlockLimitedUsePool,
    recharge: StatBlockRechargeControl,
    rechargeAfterRestAvailable: bool,
    legendaryUsesRemaining: int,
    legendaryUsesMaximum: int,
  }

  type StatBlockControlState = {
    reaction: ReactionProtocolState,
    multiattack: StatBlockMultiattackDispatches,
    resources: StatBlockResourceState,
    legendaryActionWindowOpen: bool,
  }

  type StatBlockLimitedUseSpendResult = {
    resources: StatBlockResourceState,
    spent: bool,
  }

  pure def initialStatBlockLimitedUsePool: StatBlockLimitedUsePool = {
    usesRemaining: 1,
    maximumUses: 1,
  }

  pure def initialStatBlockRechargeControl: StatBlockRechargeControl = {
    minimumRoll: 5,
    available: true,
  }

  pure def initialStatBlockMultiattackDispatches: StatBlockMultiattackDispatches = {
    primaryRemaining: 0,
    secondaryRemaining: 0,
  }

  pure def initialStatBlockResourceState: StatBlockResourceState = {
    dailyPool: initialStatBlockLimitedUsePool,
    recharge: initialStatBlockRechargeControl,
    rechargeAfterRestAvailable: true,
    legendaryUsesRemaining: 2,
    legendaryUsesMaximum: 2,
  }

  pure def initialStatBlockControlState: StatBlockControlState = {
    reaction: initialReactionProtocolState,
    multiattack: initialStatBlockMultiattackDispatches,
    resources: initialStatBlockResourceState,
    legendaryActionWindowOpen: false,
  }

  pure def legalStatBlockLimitedUsePool(pool: StatBlockLimitedUsePool): bool = all {
    pool.maximumUses >= 0,
    pool.maximumUses <= 6,
    pool.usesRemaining >= 0,
    pool.usesRemaining <= pool.maximumUses,
  }

  pure def legalStatBlockRechargeControl(control: StatBlockRechargeControl): bool = all {
    control.minimumRoll >= 2,
    control.minimumRoll <= 6,
    control.available.in(Set(true, false)),
  }

  pure def legalStatBlockMultiattackProfile(profile: StatBlockMultiattackProfile): bool = {
    val totalAttacks = profile.primaryAttackCount + profile.secondaryAttackCount
    val firstAttackCount =
      if (profile.firstAttackName == PrimaryStatBlockAttack) {
        profile.primaryAttackCount
      } else {
        profile.secondaryAttackCount
      }
    all {
      profile.firstAttackName.in(Set(PrimaryStatBlockAttack, SecondaryStatBlockAttack)),
      profile.primaryAttackCount >= 0,
      profile.primaryAttackCount <= 3,
      profile.secondaryAttackCount >= 0,
      profile.secondaryAttackCount <= 3,
      totalAttacks >= 1,
      totalAttacks <= 4,
      firstAttackCount >= 1,
    }
  }

  pure def legalStatBlockMultiattackDispatches(
    dispatches: StatBlockMultiattackDispatches
  ): bool = all {
    dispatches.primaryRemaining >= 0,
    dispatches.primaryRemaining <= 3,
    dispatches.secondaryRemaining >= 0,
    dispatches.secondaryRemaining <= 3,
    dispatches.primaryRemaining + dispatches.secondaryRemaining <= 3,
  }

  pure def legalStatBlockResourceState(resources: StatBlockResourceState): bool = all {
    legalStatBlockLimitedUsePool(resources.dailyPool),
    legalStatBlockRechargeControl(resources.recharge),
    resources.rechargeAfterRestAvailable.in(Set(true, false)),
    resources.legendaryUsesMaximum >= 0,
    resources.legendaryUsesMaximum <= 6,
    resources.legendaryUsesRemaining >= 0,
    resources.legendaryUsesRemaining <= resources.legendaryUsesMaximum,
  }

  pure def legalStatBlockControlState(state: StatBlockControlState): bool = all {
    legalReactionProtocolState(state.reaction),
    legalStatBlockMultiattackDispatches(state.multiattack),
    legalStatBlockResourceState(state.resources),
    state.legendaryActionWindowOpen.in(Set(true, false)),
    statBlockMultiattackContinuationOpen(state) implies statBlockActorTurn(state).currentActorOwnsTurn,
    state.legendaryActionWindowOpen implies not(statBlockActorTurn(state).currentActorOwnsTurn),
    state.legendaryActionWindowOpen implies state.resources.legendaryUsesRemaining > 0,
  }

  pure def statBlockActorTurn(state: StatBlockControlState): TurnProcedureState =
    state.reaction.reactor.turn

  pure def withStatBlockActorTurn(
    state: StatBlockControlState,
    turn: TurnProcedureState
  ): StatBlockControlState =
    state.with(
      "reaction",
      state.reaction.with("reactor", state.reaction.reactor.with("turn", turn))
    )

  pure def withStatBlockReactionProtocol(
    state: StatBlockControlState,
    reaction: ReactionProtocolState
  ): StatBlockControlState =
    state.with("reaction", reaction)

  pure def statBlockReactionWindowOpen(state: StatBlockControlState): bool =
    reactionWindowIsKind(state.reaction.reactionWindow, StatBlockReactionWindow)

  pure def closeStatBlockReactionWindow(window: ReactionWindowState): ReactionWindowState =
    if (reactionWindowIsKind(window, StatBlockReactionWindow)) {
      advanceContinuation(window)
    } else {
      window
    }

  pure def multiattackDispatchesRemaining(
    dispatches: StatBlockMultiattackDispatches
  ): int =
    dispatches.primaryRemaining + dispatches.secondaryRemaining

  pure def statBlockMultiattackContinuationOpen(state: StatBlockControlState): bool =
    multiattackDispatchesRemaining(state.multiattack) > 0

  pure def dispatchCountForAttackName(
    dispatches: StatBlockMultiattackDispatches,
    attackName: StatBlockAttackName
  ): int =
    if (attackName == PrimaryStatBlockAttack) {
      dispatches.primaryRemaining
    } else {
      dispatches.secondaryRemaining
    }

  pure def decrementDispatch(
    dispatches: StatBlockMultiattackDispatches,
    attackName: StatBlockAttackName
  ): StatBlockMultiattackDispatches =
    if (attackName == PrimaryStatBlockAttack and dispatches.primaryRemaining > 0) {
      dispatches.with("primaryRemaining", dispatches.primaryRemaining - 1)
    } else if (attackName == SecondaryStatBlockAttack and dispatches.secondaryRemaining > 0) {
      dispatches.with("secondaryRemaining", dispatches.secondaryRemaining - 1)
    } else {
      dispatches
    }

  pure def multiattackDispatchSubjectPermitted(
    state: StatBlockControlState,
    subject: StatBlockDispatchSubject
  ): bool =
    if (not(statBlockMultiattackContinuationOpen(state))) {
      true
    } else {
      match subject {
        | StatBlockMovementSubject => true
        | StatBlockEndTurnSubject => true
        | StatBlockDispatchAttack(v) =>
          dispatchCountForAttackName(state.multiattack, v.attackName) > 0
        | _ => false
      }
    }

  pure def multiattackDispatchesAfterFirstAttack(
    profile: StatBlockMultiattackProfile
  ): StatBlockMultiattackDispatches =
    decrementDispatch(
      {
        primaryRemaining: profile.primaryAttackCount,
        secondaryRemaining: profile.secondaryAttackCount,
      },
      profile.firstAttackName
    )

  pure def startStatBlockMultiattack(
    state: StatBlockControlState,
    profile: StatBlockMultiattackProfile
  ): StatBlockControlState = {
    val spentTurn = spendActionCost(statBlockActorTurn(state), StandardActionCost(AttackAction))
    if (
      not(legalStatBlockMultiattackProfile(profile))
        or statBlockMultiattackContinuationOpen(state)
        or spentTurn == statBlockActorTurn(state)
    ) {
      state
    } else {
      withStatBlockActorTurn(
        state.with("multiattack", multiattackDispatchesAfterFirstAttack(profile)),
        spentTurn
      )
    }
  }

  pure def resolveStatBlockActionAttack(
    state: StatBlockControlState
  ): StatBlockControlState = {
    val spentTurn = spendActionCost(statBlockActorTurn(state), StandardActionCost(AttackAction))
    if (statBlockMultiattackContinuationOpen(state) or spentTurn == statBlockActorTurn(state)) {
      state
    } else {
      withStatBlockActorTurn(state, spentTurn)
    }
  }

  pure def resolveStatBlockMultiattackDispatch(
    state: StatBlockControlState,
    attackName: StatBlockAttackName
  ): StatBlockControlState =
    if (
      not(statBlockMultiattackContinuationOpen(state))
        or dispatchCountForAttackName(state.multiattack, attackName) <= 0
    ) {
      state
    } else {
      state.with("multiattack", decrementDispatch(state.multiattack, attackName))
    }

  pure def resolveStatBlockBonusActionOption(
    state: StatBlockControlState
  ): StatBlockControlState = {
    val spentTurn = spendActionCost(statBlockActorTurn(state), BonusActionCost)
    if (statBlockMultiattackContinuationOpen(state) or spentTurn == statBlockActorTurn(state)) {
      state
    } else {
      withStatBlockActorTurn(state, spentTurn)
    }
  }

  pure def offerStatBlockReactionWindow(
    state: StatBlockControlState,
    triggerSatisfied: bool
  ): StatBlockControlState =
    if (triggerSatisfied) {
      withStatBlockReactionProtocol(
        state,
        state.reaction.with(
          "reactionWindow",
          offerReactionWindow(state.reaction.reactionWindow, StatBlockReactionWindow)
        )
      )
    }
    else state

  pure def declineStatBlockReactionWindow(state: StatBlockControlState): StatBlockControlState = {
    val choice = resolveReactionChoice(
      statBlockActorTurn(state),
      state.reaction.reactionWindow,
      DeclineReaction
    )
    if (not(statBlockReactionWindowOpen(state))) {
      state
    } else {
      withStatBlockReactionProtocol(
        state,
        state.reaction
          .with("reactor", state.reaction.reactor.with("turn", choice.turn))
          .with("reactionWindow", choice.reactionWindow)
      )
    }
  }

  pure def resolveStatBlockReactionOption(state: StatBlockControlState): StatBlockControlState = {
    val choice = resolveReactionChoice(
      statBlockActorTurn(state),
      state.reaction.reactionWindow,
      TakeStatBlockReaction
    )
    if (choice.reactionWindow == state.reaction.reactionWindow) {
      state
    } else {
      withStatBlockReactionProtocol(
        state,
        state.reaction
          .with("reactor", state.reaction.reactor.with("turn", choice.turn))
          .with("reactionWindow", choice.reactionWindow)
      )
    }
  }

  pure def openLegendaryActionWindowAfterAnotherTurn(
    state: StatBlockControlState,
    actorIncapacitated: bool
  ): StatBlockControlState =
    if (
      actorIncapacitated
        or statBlockActorTurn(state).currentActorOwnsTurn
        or state.resources.legendaryUsesRemaining <= 0
    ) {
      state.with("legendaryActionWindowOpen", false)
    } else {
      state.with("legendaryActionWindowOpen", true)
    }

  pure def resolveStatBlockLegendaryActionOption(
    state: StatBlockControlState,
    actorIncapacitated: bool
  ): StatBlockControlState =
    if (
      actorIncapacitated
        or not(state.legendaryActionWindowOpen)
        or state.resources.legendaryUsesRemaining <= 0
    ) {
      state
    } else {
      state
        .with("legendaryActionWindowOpen", false)
        .with(
          "resources",
          state.resources.with(
            "legendaryUsesRemaining",
            state.resources.legendaryUsesRemaining - 1
          )
        )
    }

  pure def spendStatBlockLimitedUse(
    resources: StatBlockResourceState,
    kind: StatBlockLimitedUseKind
  ): StatBlockLimitedUseSpendResult =
    if (kind == StatBlockDailyUse) {
      if (resources.dailyPool.usesRemaining <= 0) {
        { resources: resources, spent: false }
      } else {
        {
          resources: resources.with(
            "dailyPool",
            resources.dailyPool.with(
              "usesRemaining",
              resources.dailyPool.usesRemaining - 1
            )
          ),
          spent: true,
        }
      }
    } else if (kind == StatBlockRechargeUse) {
      if (not(resources.recharge.available)) {
        { resources: resources, spent: false }
      } else {
        {
          resources: resources.with(
            "recharge",
            resources.recharge.with("available", false)
          ),
          spent: true,
        }
      }
    } else {
      if (not(resources.rechargeAfterRestAvailable)) {
        { resources: resources, spent: false }
      } else {
        {
          resources: resources.with("rechargeAfterRestAvailable", false),
          spent: true,
        }
      }
    }

  pure def processStatBlockRechargeRoll(
    resources: StatBlockResourceState,
    roll: int
  ): StatBlockResourceState =
    if (resources.recharge.available) {
      resources
    } else if (roll >= resources.recharge.minimumRoll and roll <= 6) {
      resources.with("recharge", resources.recharge.with("available", true))
    } else {
      resources
    }

  pure def refreshStatBlockResourcesAfterShortRest(
    resources: StatBlockResourceState
  ): StatBlockResourceState =
    resources
      .with("recharge", resources.recharge.with("available", true))
      .with("rechargeAfterRestAvailable", true)

  pure def refreshStatBlockResourcesAfterLongRest(
    resources: StatBlockResourceState
  ): StatBlockResourceState =
    refreshStatBlockResourcesAfterShortRest(resources)
      .with(
        "dailyPool",
        resources.dailyPool.with("usesRemaining", resources.dailyPool.maximumUses)
      )

  pure def startStatBlockTurn(
    state: StatBlockControlState,
    rechargeRoll: int
  ): StatBlockControlState =
    withStatBlockActorTurn(
      state
        .with("multiattack", initialStatBlockMultiattackDispatches)
        .with("legendaryActionWindowOpen", false)
        .with(
          "reaction",
          state.reaction.with(
            "reactionWindow",
            closeStatBlockReactionWindow(state.reaction.reactionWindow)
          )
        )
        .with(
          "resources",
          processStatBlockRechargeRoll(
            state.resources.with(
              "legendaryUsesRemaining",
              state.resources.legendaryUsesMaximum
            ),
            rechargeRoll
          )
        ),
      startTurn(statBlockActorTurn(state))
    )

  pure def endStatBlockTurn(state: StatBlockControlState): StatBlockControlState =
    withStatBlockActorTurn(
      state
        .with("multiattack", initialStatBlockMultiattackDispatches)
        .with("legendaryActionWindowOpen", false),
      endTurn(statBlockActorTurn(state))
    )

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
