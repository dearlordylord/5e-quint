// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE11-STAT-BLOCK-CONTROLS-001
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.attack-control
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL

module statBlockControls {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"

  // RAW anchors:
  // - Monsters/Overview.md: Actions, Multiattack, Bonus Action, Reactions,
  //   Legendary Actions, and Limited Usage.
  // - Rules-Glossary.md: Stat Block, Bonus Action, and Reaction.
  // - ASSUMPTIONS.md A44: Multiattack maps to named attack dispatches
  //   inside the Attack action, with only Movement and End Turn interleaving.
  // - Recharge rolls are keyed event arguments, resource refresh timing is
  //   explicit, and Legendary Action per-name cooldowns are caller-owned.

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

}
