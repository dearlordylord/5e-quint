// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
module battleRuntimeMovementBridge {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import creatureSizeOrder.* from "../shared-algebras/proofs/rule-core/creature-size-order"
  import movementSpatialGrapple as MovementRule from "../shared-algebras/proofs/rule-core/movement-spatial-grapple"

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

  type BattleRuntimeActionCostSpendResult = {
    step: BattleRuntimeMovementStep,
    admitted: bool,
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
    grappleActive: MovementRule::legalGrappleEscapeDc(projection.grappleEscapeDc),
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

  pure def battleRuntimeGrappleProjection(projection: BattleRuntimeMovementProjection): MovementRule::GrappleState =
    if (MovementRule::legalGrappleEscapeDc(projection.grappleEscapeDc))
      MovementRule::Grappled({ escapeDc: projection.grappleEscapeDc })
    else
      MovementRule::NoGrapple

  pure def battleRuntimeMovementProjection(projection: BattleRuntimeMovementProjection): MovementRule::MovementGrappleState = {
    turn: battleRuntimeTurnProjection(projection),
    speedFeet: projection.speedFeet,
    movementSpentFeet: projection.movementSpentFeet,
    prone: projection.prone,
    grapple: battleRuntimeGrappleProjection(projection),
  }

  pure def battleRuntimeMovementRemaining(projection: BattleRuntimeMovementProjection): int =
    MovementRule::movementRemainingFeet(battleRuntimeMovementProjection(projection))

  pure def battleRuntimeCanSpendMovement(projection: BattleRuntimeMovementProjection, movementCost: int): bool =
    MovementRule::canSpendMovement(battleRuntimeMovementProjection(projection), {
      distanceFeet: movementCost,
      extraCostFeet: 0,
    })

  pure def battleRuntimeStartTurn(projection: BattleRuntimeMovementProjection): BattleRuntimeMovementStep = {
    val step = battleRuntimeStepFromTurn(projection, startTurn(battleRuntimeTurnProjection(projection)))
    { ...step, movementSpentFeet: 0 }
  }

  pure def battleRuntimeSpendMovement(projection: BattleRuntimeMovementProjection, movementCost: int): BattleRuntimeMovementStep = {
    val spent = MovementRule::spendMovement(battleRuntimeMovementProjection(projection), {
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
      grappleActive: MovementRule::activeGrapple(spent.grapple),
    }
  }

  pure def battleRuntimeStandFromProne(projection: BattleRuntimeMovementProjection): BattleRuntimeMovementStep = {
    val stood = MovementRule::standFromProne(battleRuntimeMovementProjection(projection))
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
      grappleActive: MovementRule::activeGrapple(stood.grapple),
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

  pure def battleRuntimeSpendActionCost(
    projection: BattleRuntimeMovementProjection,
    cost: ActionCost
  ): BattleRuntimeActionCostSpendResult = {
    val spend = spendActionCost(battleRuntimeTurnProjection(projection), cost)
    {
      step: battleRuntimeStepFromTurn(projection, spend.turn),
      admitted: spend.admitted,
    }
  }

  pure def battleRuntimeSpendAttackAction(projection: BattleRuntimeMovementProjection): BattleRuntimeActionCostSpendResult =
    battleRuntimeSpendActionCost(projection, StandardActionCost(AttackAction))

  pure def battleRuntimeSpendMagicAction(projection: BattleRuntimeMovementProjection): BattleRuntimeActionCostSpendResult =
    battleRuntimeSpendActionCost(projection, StandardActionCost(MagicAction))

  pure def battleRuntimeSpendBonusAction(projection: BattleRuntimeMovementProjection): BattleRuntimeActionCostSpendResult =
    battleRuntimeSpendActionCost(projection, BonusActionCost)

  pure def battleRuntimeLightPropertyExtraAttackResult(
    projection: BattleRuntimeMovementProjection,
    priorAttackActionLightWeaponAttack: bool,
    differentLightWeapon: bool
  ): LightPropertyExtraAttackResult =
    resolveLightPropertyExtraAttack(
      battleRuntimeTurnProjection(projection),
      {
        priorAttackActionLightWeaponAttack: priorAttackActionLightWeaponAttack,
        differentLightWeapon: differentLightWeapon,
      },
    )

  pure def battleRuntimeLightPropertyExtraAttack(
    projection: BattleRuntimeMovementProjection,
    priorAttackActionLightWeaponAttack: bool,
    differentLightWeapon: bool
  ): BattleRuntimeMovementStep =
    battleRuntimeStepFromTurn(
      projection,
      battleRuntimeLightPropertyExtraAttackResult(
        projection,
        priorAttackActionLightWeaponAttack,
        differentLightWeapon,
      ).turn,
    )

  pure def battleRuntimeLightPropertyExtraAttackAdmitted(
    projection: BattleRuntimeMovementProjection,
    priorAttackActionLightWeaponAttack: bool,
    differentLightWeapon: bool
  ): bool =
    battleRuntimeLightPropertyExtraAttackResult(
      projection,
      priorAttackActionLightWeaponAttack,
      differentLightWeapon,
    ).admitted

  pure def battleRuntimeLightPropertyExtraAttackDamageAmount(
    rolledDamage: int,
    abilityModifier: int,
    damageAbilityModifier: LightExtraAttackDamageAbilityModifierFact,
    twoWeaponFightingSelected: bool,
    choice: LightExtraAttackDamageAbilityModifierChoice
  ): int =
    lightPropertyExtraAttackDamageAmount(
      rolledDamage,
      abilityModifier,
      damageAbilityModifier,
      twoWeaponFightingSelected,
      choice
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
    MovementRule::opportunityAttackTriggered(
      battleRuntimeTurnProjection(projection),
      {
        hostileCreature: hostileCreature,
        observerCanSee: observerCanSee,
        leavesReach: leavesReach,
        movementResource:
          if (usesOwnMovementResource)
            MovementRule::OwnMovementActionBonusReactionOrSpeed
          else
            MovementRule::ForcedMovementNoOwnResource,
      }
    )

  pure def battleRuntimeGrappleAttemptSucceeds(
    grapplerSize: RuleSize,
    targetSize: RuleSize,
    hasFreeHand: bool,
    targetSaveTotal: int,
    escapeDc: int
  ): bool =
    MovementRule::activeGrapple(MovementRule::applyGrappleAttempt(MovementRule::NoGrapple, {
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
    MovementRule::legalGrappleEscapeDc(escapeDc),
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
    MovementRule::legalGrappleEscapeDc(escapeDc),
    hasFreeHand,
    targetSizeRank <= grapplerSizeRank + 1,
  }

  pure def battleRuntimeEscapeGrapple(projection: BattleRuntimeMovementProjection, checkTotal: int): BattleRuntimeMovementStep = {
    val escaped = MovementRule::escapeGrapple(
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
      grappleActive: MovementRule::activeGrapple(escaped.grapple),
    }
  }

  pure def battleRuntimeGrappledAttackRollHasDisadvantage(grappleActive: bool, targetIsGrappler: bool): bool =
    MovementRule::grappledAttackRollHasDisadvantage(
      if (grappleActive)
        MovementRule::Grappled({ escapeDc: MovementRule::minimumGrappleEscapeDc })
      else
        MovementRule::NoGrapple,
      targetIsGrappler,
    )

  pure def battleRuntimeDifficultTerrainMovementCost(active: bool, totalDistanceFeet: int, difficultTerrainDistanceFeet: int): int =
    if (active and totalDistanceFeet > 0 and difficultTerrainDistanceFeet > 0 and difficultTerrainDistanceFeet <= totalDistanceFeet)
      totalDistanceFeet + difficultTerrainDistanceFeet
    else
      0

  pure def movementSpeed(combatant: Combatant, speedKind: MovementSpeedKind): int = {
    val speedDelta = if (combatant.activeEffects.contains(LongstriderSpeedDelta)) 10 else 0
    val walkSpeed = combatant.speed + speedDelta
    val hasSpiderClimbSpeedGrant = combatant.activeEffects.exists(effect => match effect {
      | SpiderClimbClimbSpeedGrant(_) => true
      | _ => false
    })
    val hasSelfTransformationSwimSpeedGrant = combatant.activeEffects.exists(effect => match effect {
      | SelfTransformationModeEffect(data) => data.mode == AquaticAdaptationMode
      | _ => false
    })
    val hasFlySpeedGrant = combatant.activeEffects.exists(effect => match effect {
      | FlySpeedHoverGrant(_) => true
      | _ => false
    })
    match speedKind {
      | WalkSpeedKind => walkSpeed
      | ClimbSpeedKind => if (combatant.hasRovingSpeedKindGrants or hasSpiderClimbSpeedGrant) walkSpeed else 0
      | SwimSpeedKind => if (combatant.hasRovingSpeedKindGrants or hasSelfTransformationSwimSpeedGrant) walkSpeed else 0
      | FlySpeedKind => if (hasFlySpeedGrant) 60 + speedDelta else 0
    }
  }

  pure def movementProjectionForFighter(state: BattleState, speedKind: MovementSpeedKind): BattleRuntimeMovementProjection = {
    currentActorOwnsTurn: currentActor(state) == Fighter and not(state.fighter.unconscious) and not(state.fighter.incapacitated),
    actionAvailable: state.actionAvailable,
    bonusActionAvailable: state.bonusActionAvailable,
    reactionAvailable: state.fighter.reactionAvailable,
    dashMovementBonus: state.dashMovementBonus,
    disengaged: state.disengaged,
    dodging: state.fighter.dodging,
    hidden: fighterIsHidden(state),
    helpAttackHeld: state.fighterHelpAttackGoblinForGoblin,
    readiedMovementHeld: state.fighter.readiedMovementHeld,
    speedFeet: movementSpeed(state.fighter, speedKind),
    movementSpentFeet: state.fighter.movementSpent,
    prone: state.fighter.prone,
    grappleEscapeDc: 0,
  }

  pure def movementProjectionForGoblin(state: BattleState, speedKind: MovementSpeedKind): BattleRuntimeMovementProjection = {
    currentActorOwnsTurn: currentActor(state) == Goblin and not(state.goblin.unconscious) and not(state.goblin.incapacitated),
    actionAvailable: state.actionAvailable,
    bonusActionAvailable: state.bonusActionAvailable,
    reactionAvailable: state.goblin.reactionAvailable,
    dashMovementBonus: state.dashMovementBonus,
    disengaged: state.disengaged,
    dodging: state.goblin.dodging,
    hidden: false,
    helpAttackHeld: false,
    readiedMovementHeld: false,
    speedFeet: movementSpeed(state.goblin, speedKind),
    movementSpentFeet: state.goblin.movementSpent,
    prone: state.goblin.prone,
    grappleEscapeDc: 0,
  }

  pure def movementProjectionForActor(
    state: BattleState,
    actor: Actor,
    speedKind: MovementSpeedKind,
  ): BattleRuntimeMovementProjection =
    match actor {
      | Fighter => movementProjectionForFighter(state, speedKind)
      | Goblin => movementProjectionForGoblin(state, speedKind)
    }

  pure def movementProjectionForGrappledGoblin(state: BattleState): BattleRuntimeMovementProjection =
    match state.grapple {
      | NoGrapple => { ...movementProjectionForGoblin(state, WalkSpeedKind), grappleEscapeDc: 0 }
      | FighterGrapplesGoblin(link) => { ...movementProjectionForGoblin(state, WalkSpeedKind), grappleEscapeDc: link.escapeDc }
    }
}
