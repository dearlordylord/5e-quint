// -*- mode: Bluespec; -*-

module battleRuntimeMovementBridge {
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import movementSpatialGrapple.* from "../shared-algebras/proofs/rule-core/movement-spatial-grapple"

  type BattleRuntimeMovementProjection = {
    currentActorOwnsTurn: bool,
    actionAvailable: bool,
    bonusActionAvailable: bool,
    reactionAvailable: bool,
    dashMovementBonus: int,
    disengaged: bool,
    dodging: bool,
    hidden: bool,
    helpAttackHeld: bool,
    readiedMovementHeld: bool,
    speedFeet: int,
    movementSpentFeet: int,
    prone: bool,
    grappleEscapeDc: int,
  }

  type BattleRuntimeMovementStep = {
    actionAvailable: bool,
    bonusActionAvailable: bool,
    reactionAvailable: bool,
    dashMovementBonus: int,
    disengaged: bool,
    dodging: bool,
    hidden: bool,
    helpAttackHeld: bool,
    readiedMovementHeld: bool,
    movementSpentFeet: int,
    prone: bool,
    grappleActive: bool,
  }

  pure def battleRuntimeStepFromTurn(
    projection: BattleRuntimeMovementProjection,
    turn: TurnProcedureState
  ): BattleRuntimeMovementStep = {
    actionAvailable: turn.actionQuota == ActionAvailable,
    bonusActionAvailable: turn.bonusActionAvailable,
    reactionAvailable: turn.reactionAvailable,
    dashMovementBonus: turn.dashMovementBonusFeet,
    disengaged: turn.disengaged,
    dodging: turn.dodging,
    hidden: turn.hidden,
    helpAttackHeld: turn.helpAttackHeld,
    readiedMovementHeld: turn.readiedMovementHeld,
    movementSpentFeet: projection.movementSpentFeet,
    prone: projection.prone,
    grappleActive: legalGrappleEscapeDc(projection.grappleEscapeDc),
  }

  pure def battleRuntimeTurnProjection(projection: BattleRuntimeMovementProjection): TurnProcedureState = {
    actionQuota: if (projection.actionAvailable) ActionAvailable else ActionSpent,
    bonusActionAvailable: projection.bonusActionAvailable,
    reactionAvailable: projection.reactionAvailable,
    dashMovementBonusFeet: projection.dashMovementBonus,
    disengaged: projection.disengaged,
    dodging: projection.dodging,
    hidden: projection.hidden,
    helpAttackHeld: projection.helpAttackHeld,
    readiedMovementHeld: projection.readiedMovementHeld,
    startOfTurnHookActive: false,
    endOfTurnHookActive: false,
    currentActorOwnsTurn: projection.currentActorOwnsTurn,
  }

  pure def battleRuntimeGrappleProjection(projection: BattleRuntimeMovementProjection): GrappleState =
    if (legalGrappleEscapeDc(projection.grappleEscapeDc)) Grappled({ escapeDc: projection.grappleEscapeDc }) else NoGrapple

  pure def battleRuntimeMovementProjection(projection: BattleRuntimeMovementProjection): MovementGrappleState = {
    turn: battleRuntimeTurnProjection(projection),
    speedFeet: projection.speedFeet,
    movementSpentFeet: projection.movementSpentFeet,
    prone: projection.prone,
    grapple: battleRuntimeGrappleProjection(projection),
  }

  pure def battleRuntimeMovementRemaining(projection: BattleRuntimeMovementProjection): int =
    movementRemainingFeet(battleRuntimeMovementProjection(projection))

  pure def battleRuntimeCanSpendMovement(projection: BattleRuntimeMovementProjection, movementCost: int): bool =
    canSpendMovement(battleRuntimeMovementProjection(projection), {
      distanceFeet: movementCost,
      extraCostFeet: 0,
    })

  pure def battleRuntimeStartTurn(projection: BattleRuntimeMovementProjection): BattleRuntimeMovementStep = {
    val step = battleRuntimeStepFromTurn(projection, startTurn(battleRuntimeTurnProjection(projection)))
    { ...step, movementSpentFeet: 0 }
  }

  pure def battleRuntimeSpendMovement(projection: BattleRuntimeMovementProjection, movementCost: int): BattleRuntimeMovementStep = {
    val spent = spendMovement(battleRuntimeMovementProjection(projection), {
      distanceFeet: movementCost,
      extraCostFeet: 0,
    })
    {
      actionAvailable: spent.turn.actionQuota == ActionAvailable,
      bonusActionAvailable: spent.turn.bonusActionAvailable,
      reactionAvailable: spent.turn.reactionAvailable,
      dashMovementBonus: spent.turn.dashMovementBonusFeet,
      disengaged: spent.turn.disengaged,
      dodging: spent.turn.dodging,
      hidden: spent.turn.hidden,
      helpAttackHeld: spent.turn.helpAttackHeld,
      readiedMovementHeld: spent.turn.readiedMovementHeld,
      movementSpentFeet: spent.movementSpentFeet,
      prone: spent.prone,
      grappleActive: activeGrapple(spent.grapple),
    }
  }

  pure def battleRuntimeStandFromProne(projection: BattleRuntimeMovementProjection): BattleRuntimeMovementStep = {
    val stood = standFromProne(battleRuntimeMovementProjection(projection))
    {
      actionAvailable: stood.turn.actionQuota == ActionAvailable,
      bonusActionAvailable: stood.turn.bonusActionAvailable,
      reactionAvailable: stood.turn.reactionAvailable,
      dashMovementBonus: stood.turn.dashMovementBonusFeet,
      disengaged: stood.turn.disengaged,
      dodging: stood.turn.dodging,
      hidden: stood.turn.hidden,
      helpAttackHeld: stood.turn.helpAttackHeld,
      readiedMovementHeld: stood.turn.readiedMovementHeld,
      movementSpentFeet: stood.movementSpentFeet,
      prone: stood.prone,
      grappleActive: activeGrapple(stood.grapple),
    }
  }

  pure def battleRuntimeDash(projection: BattleRuntimeMovementProjection, speedFeet: int): BattleRuntimeMovementStep = {
    val turn = resolveDash(battleRuntimeTurnProjection(projection), speedFeet, StandardActionCost(DashAction))
    battleRuntimeStepFromTurn(projection, turn)
  }

  pure def battleRuntimeBonusActionDash(projection: BattleRuntimeMovementProjection, speedFeet: int): BattleRuntimeMovementStep = {
    val turn = resolveDash(battleRuntimeTurnProjection(projection), speedFeet, BonusActionCost)
    battleRuntimeStepFromTurn(projection, turn)
  }

  pure def battleRuntimeSpendAttackAction(projection: BattleRuntimeMovementProjection): BattleRuntimeMovementStep =
    battleRuntimeStepFromTurn(
      projection,
      spendActionCost(battleRuntimeTurnProjection(projection), StandardActionCost(AttackAction)),
    )

  pure def battleRuntimeSpendMagicAction(projection: BattleRuntimeMovementProjection): BattleRuntimeMovementStep =
    battleRuntimeStepFromTurn(
      projection,
      spendActionCost(battleRuntimeTurnProjection(projection), StandardActionCost(MagicAction)),
    )

  pure def battleRuntimeSpendBonusAction(projection: BattleRuntimeMovementProjection): BattleRuntimeMovementStep =
    battleRuntimeStepFromTurn(
      projection,
      spendActionCost(battleRuntimeTurnProjection(projection), BonusActionCost),
    )

  pure def battleRuntimeDisengage(projection: BattleRuntimeMovementProjection): BattleRuntimeMovementStep =
    battleRuntimeStepFromTurn(
      projection,
      resolveDisengage(battleRuntimeTurnProjection(projection), StandardActionCost(DisengageAction)),
    )

  pure def battleRuntimeDodge(projection: BattleRuntimeMovementProjection): BattleRuntimeMovementStep =
    battleRuntimeStepFromTurn(projection, resolveDodge(battleRuntimeTurnProjection(projection)))

  pure def battleRuntimeReadyMovement(
    projection: BattleRuntimeMovementProjection,
    triggerSelected: bool
  ): BattleRuntimeMovementStep =
    battleRuntimeStepFromTurn(projection, resolveReadyMovement(battleRuntimeTurnProjection(projection), triggerSelected))

  pure def battleRuntimeHelpAttack(
    projection: BattleRuntimeMovementProjection,
    targetFactSatisfied: bool
  ): BattleRuntimeMovementStep =
    battleRuntimeStepFromTurn(projection, resolveHelpAttack(battleRuntimeTurnProjection(projection), targetFactSatisfied))

  pure def battleRuntimeHide(
    projection: BattleRuntimeMovementProjection,
    prerequisiteSatisfied: bool,
    checkTotal: int,
    dc: int
  ): BattleRuntimeMovementStep =
    battleRuntimeStepFromTurn(
      projection,
      resolveHide(
        battleRuntimeTurnProjection(projection),
        {
          prerequisiteSatisfied: prerequisiteSatisfied,
          checkTotal: checkTotal,
          dc: dc,
        },
        StandardActionCost(HideAction),
      ),
    )

  pure def battleRuntimeSearch(
    projection: BattleRuntimeMovementProjection,
    hiddenTargetExists: bool,
    checkTotal: int,
    dc: int
  ): BattleRuntimeMovementStep =
    battleRuntimeStepFromTurn(
      projection,
      resolveSearch(
        battleRuntimeTurnProjection(projection),
        {
          hiddenTargetExists: hiddenTargetExists,
          checkTotal: checkTotal,
          dc: dc,
        },
      ),
    )

  pure def battleRuntimeOpportunityAttackTriggered(
    projection: BattleRuntimeMovementProjection,
    hostileCreature: bool,
    observerCanSee: bool,
    leavesReach: bool,
    usesOwnMovementResource: bool
  ): bool =
    opportunityAttackTriggered(
      battleRuntimeTurnProjection(projection),
      {
        hostileCreature: hostileCreature,
        observerCanSee: observerCanSee,
        leavesReach: leavesReach,
        movementResource: if (usesOwnMovementResource) OwnMovementActionBonusReactionOrSpeed else ForcedMovementNoOwnResource,
      }
    )

  pure def battleRuntimeGrappleAttemptSucceeds(
    grapplerSize: RuleSize,
    targetSize: RuleSize,
    hasFreeHand: bool,
    targetSaveTotal: int,
    escapeDc: int
  ): bool =
    activeGrapple(applyGrappleAttempt(NoGrapple, {
      grapplerSize: grapplerSize,
      targetSize: targetSize,
      hasFreeHand: hasFreeHand,
      targetSaveTotal: targetSaveTotal,
      escapeDc: escapeDc,
    }))

  pure def battleRuntimeGrappleAttemptSucceedsBySizeRank(
    grapplerSizeRank: int,
    targetSizeRank: int,
    hasFreeHand: bool,
    targetSaveTotal: int,
    escapeDc: int
  ): bool = all {
    legalGrappleEscapeDc(escapeDc),
    hasFreeHand,
    targetSizeRank <= grapplerSizeRank + 1,
    targetSaveTotal < escapeDc,
  }

  pure def battleRuntimeCanAttemptGrappleBySizeRank(
    grapplerSizeRank: int,
    targetSizeRank: int,
    hasFreeHand: bool,
    escapeDc: int
  ): bool = all {
    legalGrappleEscapeDc(escapeDc),
    hasFreeHand,
    targetSizeRank <= grapplerSizeRank + 1,
  }

  pure def battleRuntimeEscapeGrapple(projection: BattleRuntimeMovementProjection, checkTotal: int): BattleRuntimeMovementStep = {
    val escaped = escapeGrapple(
      battleRuntimeTurnProjection(projection),
      battleRuntimeGrappleProjection(projection),
      checkTotal,
    )
    {
      actionAvailable: escaped.turn.actionQuota == ActionAvailable,
      bonusActionAvailable: escaped.turn.bonusActionAvailable,
      reactionAvailable: escaped.turn.reactionAvailable,
      dashMovementBonus: escaped.turn.dashMovementBonusFeet,
      disengaged: escaped.turn.disengaged,
      dodging: escaped.turn.dodging,
      hidden: escaped.turn.hidden,
      helpAttackHeld: escaped.turn.helpAttackHeld,
      readiedMovementHeld: escaped.turn.readiedMovementHeld,
      movementSpentFeet: projection.movementSpentFeet,
      prone: projection.prone,
      grappleActive: activeGrapple(escaped.grapple),
    }
  }

  pure def battleRuntimeGrappledAttackRollHasDisadvantage(grappleActive: bool, targetIsGrappler: bool): bool =
    grappledAttackRollHasDisadvantage(
      if (grappleActive) Grappled({ escapeDc: minimumGrappleEscapeDc }) else NoGrapple,
      targetIsGrappler,
    )

  run test_start_turn_resets_runtime_turn_resources = {
    val started = battleRuntimeStartTurn({
      currentActorOwnsTurn: true,
      actionAvailable: false,
      bonusActionAvailable: false,
      reactionAvailable: false,
      dashMovementBonus: 30,
      disengaged: true,
      dodging: true,
      hidden: true,
      helpAttackHeld: true,
      readiedMovementHeld: true,
      speedFeet: 30,
      movementSpentFeet: 25,
      prone: false,
      grappleEscapeDc: 0,
    })
    all {
      assert(started.actionAvailable),
      assert(started.bonusActionAvailable),
      assert(started.reactionAvailable),
      assert(started.dashMovementBonus == 0),
      assert(not(started.disengaged)),
      assert(not(started.dodging)),
      assert(started.hidden),
      assert(not(started.helpAttackHeld)),
      assert(not(started.readiedMovementHeld)),
      assert(started.movementSpentFeet == 0),
    }
  }

  run test_battle_runtime_bonus_action_dash_spends_bonus_action_not_action = {
    val dashed = battleRuntimeBonusActionDash({
      currentActorOwnsTurn: true,
      actionAvailable: true,
      bonusActionAvailable: true,
      reactionAvailable: true,
      dashMovementBonus: 0,
      disengaged: false,
      dodging: false,
      hidden: false,
      helpAttackHeld: false,
      readiedMovementHeld: false,
      speedFeet: 30,
      movementSpentFeet: 0,
      prone: false,
      grappleEscapeDc: 0,
    }, 30)
    all {
      assert(dashed.actionAvailable),
      assert(not(dashed.bonusActionAvailable)),
      assert(dashed.dashMovementBonus == 30),
    }
  }

  run test_battle_runtime_attack_and_magic_actions_spend_action = {
    val projection = {
      currentActorOwnsTurn: true,
      actionAvailable: true,
      bonusActionAvailable: true,
      reactionAvailable: true,
      dashMovementBonus: 0,
      disengaged: false,
      dodging: false,
      hidden: false,
      helpAttackHeld: false,
      readiedMovementHeld: false,
      speedFeet: 30,
      movementSpentFeet: 0,
      prone: false,
      grappleEscapeDc: 0,
    }
    all {
      assert(not(battleRuntimeSpendAttackAction(projection).actionAvailable)),
      assert(not(battleRuntimeSpendMagicAction(projection).actionAvailable)),
    }
  }

  run test_battle_runtime_bonus_action_spends_bonus_action_only = {
    val spent = battleRuntimeSpendBonusAction({
      currentActorOwnsTurn: true,
      actionAvailable: true,
      bonusActionAvailable: true,
      reactionAvailable: true,
      dashMovementBonus: 0,
      disengaged: false,
      dodging: false,
      hidden: false,
      helpAttackHeld: false,
      readiedMovementHeld: false,
      speedFeet: 30,
      movementSpentFeet: 0,
      prone: false,
      grappleEscapeDc: 0,
    })
    all {
      assert(spent.actionAvailable),
      assert(not(spent.bonusActionAvailable)),
    }
  }
}
