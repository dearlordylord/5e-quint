// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-expeditious-retreat-dash spell.invocation-forced-reaction-movement
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.bonus-action-dash-temporary-hit-points

module battleRuntimeMovement {
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"

  pure def dashFighter(state: BattleState): BattleState =
    dashFighterWithSpeedKind(state, WalkSpeedKind)

  pure def movementProjectionForFighter(state: BattleState, speedKind: MovementSpeedKind): BattleRuntimeMovementProjection = {
    currentActorOwnsTurn:
      currentActor(state) == Fighter
        and not(state.fighter.unconscious)
        and not(state.fighter.incapacitated),
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
    currentActorOwnsTurn:
      currentActor(state) == Goblin
        and not(state.goblin.unconscious)
        and not(state.goblin.incapacitated),
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

  pure def movementProjectionForGrappledGoblin(state: BattleState): BattleRuntimeMovementProjection =
    match state.grapple {
      | NoGrapple => {
          currentActorOwnsTurn:
            currentActor(state) == Goblin
              and not(state.goblin.unconscious)
              and not(state.goblin.incapacitated),
          actionAvailable: state.actionAvailable,
          bonusActionAvailable: state.bonusActionAvailable,
          reactionAvailable: state.goblin.reactionAvailable,
          dashMovementBonus: state.dashMovementBonus,
          disengaged: state.disengaged,
          dodging: state.goblin.dodging,
          hidden: false,
          helpAttackHeld: false,
          readiedMovementHeld: false,
          speedFeet: movementSpeed(state.goblin, WalkSpeedKind),
          movementSpentFeet: state.goblin.movementSpent,
          prone: state.goblin.prone,
          grappleEscapeDc: 0,
        }
      | FighterGrapplesGoblin(link) => {
          currentActorOwnsTurn:
            currentActor(state) == Goblin
              and not(state.goblin.unconscious)
              and not(state.goblin.incapacitated),
          actionAvailable: state.actionAvailable,
          bonusActionAvailable: state.bonusActionAvailable,
          reactionAvailable: state.goblin.reactionAvailable,
          dashMovementBonus: state.dashMovementBonus,
          disengaged: state.disengaged,
          dodging: state.goblin.dodging,
          hidden: false,
          helpAttackHeld: false,
          readiedMovementHeld: false,
          speedFeet: movementSpeed(state.goblin, WalkSpeedKind),
          movementSpentFeet: state.goblin.movementSpent,
          prone: state.goblin.prone,
          grappleEscapeDc: link.escapeDc,
        }
    }

  pure def dissonantWhispersGoblinGrappleEscapeDc(state: BattleState): int =
    match state.grapple {
      | NoGrapple => 0
      | FighterGrapplesGoblin(link) => link.escapeDc
    }

  pure def dissonantWhispersGoblinMovementProjection(state: BattleState, speedKind: MovementSpeedKind): BattleRuntimeMovementProjection = {
    currentActorOwnsTurn:
      state.goblin.hp > 0
        and not(state.goblin.unconscious)
        and not(state.goblin.incapacitated),
    actionAvailable: true,
    bonusActionAvailable: true,
    reactionAvailable: state.goblin.reactionAvailable,
    dashMovementBonus: 0,
    disengaged: false,
    dodging: state.goblin.dodging,
    hidden: false,
    helpAttackHeld: false,
    readiedMovementHeld: false,
    speedFeet: movementSpeed(state.goblin, speedKind),
    movementSpentFeet: 0,
    prone: state.goblin.prone,
    grappleEscapeDc: dissonantWhispersGoblinGrappleEscapeDc(state),
  }

  pure def dissonantWhispersGoblinCanTakeReaction(state: BattleState): bool =
    state.goblin.reactionAvailable
      and state.goblin.hp > 0
      and not(state.goblin.unconscious)
      and not(state.goblin.incapacitated)

  pure def dissonantWhispersGoblinCanMoveWithSpeedKind(
    state: BattleState,
    speedKind: MovementSpeedKind,
    movementCost: int,
  ): bool =
    battleRuntimeCanSpendMovement(
      dissonantWhispersGoblinMovementProjection(state, speedKind),
      movementCost,
    )

  pure def dissonantWhispersGoblinHasMovementAvailable(state: BattleState): bool =
    dissonantWhispersGoblinCanMoveWithSpeedKind(state, WalkSpeedKind, 1)
      or dissonantWhispersGoblinCanMoveWithSpeedKind(state, ClimbSpeedKind, 1)
      or dissonantWhispersGoblinCanMoveWithSpeedKind(state, SwimSpeedKind, 1)

  pure def resolveDissonantWhispersGoblinForcedReactionMovement(
    state: BattleState,
    replay: DissonantWhispersForcedMovementReplay
  ): DissonantWhispersForcedMovementResult =
    if (not(dissonantWhispersGoblinCanTakeReaction(state))) {
      match replay {
        | DissonantWhispersMovementMissing =>
            DissonantWhispersResolvedAfterDamage(openDissonantWhispersAfterDamageSequence(state))
        | DissonantWhispersMovementFilled(_) => DissonantWhispersInvalidMovementFill
      }
    } else if (not(dissonantWhispersGoblinHasMovementAvailable(state))) {
      match replay {
        | DissonantWhispersMovementMissing =>
            DissonantWhispersResolvedAfterDamage(
              openDissonantWhispersAfterDamageSequence(spendReaction(state, Goblin))
            )
        | DissonantWhispersMovementFilled(_) => DissonantWhispersInvalidMovementFill
      }
    } else {
      match replay {
        | DissonantWhispersMovementMissing => DissonantWhispersNeedsMovementFill
        | DissonantWhispersMovementFilled(fill) =>
            if (not(dissonantWhispersGoblinCanMoveWithSpeedKind(state, fill.speedKind, fill.movementCost)))
              DissonantWhispersInvalidMovementFill
            else {
              val afterReactionSpend = spendReaction(state, Goblin)
              if (fill.provokesOpportunityAttack)
                DissonantWhispersOpportunityAttackWindow(
                  openReactionWindow(afterReactionSpend, {
                    trigger: OpportunityAttack,
                    procedure: OpportunityAttackReactionProcedure,
                    eligibleReactors: Set(Fighter),
                    offeredReactors: Set(),
                    continuation: ResumeDissonantWhispersMovementThenAfterDamage({
                      speedKind: fill.speedKind,
                      movementCost: fill.movementCost,
                    }),
                  })
                )
              else
                DissonantWhispersResolvedAfterDamage(
                  openDissonantWhispersAfterDamageSequence(afterReactionSpend)
                )
            }
      }
    }

  pure def stateWithFighterMovementStep(state: BattleState, step: BattleRuntimeMovementStep): BattleState =
    {
      ...state,
      actionAvailable: step.actionAvailable,
      bonusActionAvailable: step.bonusActionAvailable,
      dashMovementBonus: step.dashMovementBonus,
      disengaged: step.disengaged,
      fighterHelpAttackGoblinForGoblin: step.helpAttackHeld,
      fighter: {
        ...state.fighter,
        reactionAvailable: step.reactionAvailable,
        movementSpent: step.movementSpentFeet,
        prone: step.prone,
        dodging: step.dodging,
        readiedMovementHeld: step.readiedMovementHeld,
      },
    }

  pure def stateWithGoblinMovementStep(state: BattleState, step: BattleRuntimeMovementStep): BattleState =
    {
      ...state,
      actionAvailable: step.actionAvailable,
      bonusActionAvailable: step.bonusActionAvailable,
      dashMovementBonus: step.dashMovementBonus,
      disengaged: step.disengaged,
      goblin: {
        ...state.goblin,
        reactionAvailable: step.reactionAvailable,
        movementSpent: step.movementSpentFeet,
        prone: step.prone,
        dodging: step.dodging,
      },
    }

  pure def dashFighterWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind): BattleState = {
    val step = battleRuntimeDash(movementProjectionForFighter(state, speedKind), movementSpeed(state.fighter, speedKind))
    stateWithFighterMovementStep(state, step)
  }

  pure def applyFighterTemporaryHitPoints(state: BattleState, temporaryHitPoints: int): BattleState =
    { ...state, fighter: { ...state.fighter, tempHp: if (state.fighter.tempHp > temporaryHitPoints) state.fighter.tempHp else temporaryHitPoints } }

  pure def bonusActionDashTemporaryHitPointsFighter(
    state: BattleState,
    usesRemaining: int,
    proficiencyBonus: int,
    speedKind: MovementSpeedKind
  ): BonusActionDashTemporaryHitPointsResult =
    if (currentActor(state) == Fighter
      and state.bonusActionAvailable
      and usesRemaining > 0
      and proficiencyBonus >= 2
      and proficiencyBonus <= 6
      and not(state.fighter.unconscious)
      and not(state.fighter.incapacitated)) {
      val dashed = stateWithFighterMovementStep(
        state,
        battleRuntimeBonusActionDash(movementProjectionForFighter(state, speedKind), movementSpeed(state.fighter, speedKind)),
      )
      {
        state: applyFighterTemporaryHitPoints(dashed, proficiencyBonus),
        usesRemaining: usesRemaining - 1,
      }
    } else {
      { state: state, usesRemaining: usesRemaining }
    }

  pure def activeEffectsContainExpeditiousRetreatDashBonusAction(effects: Set[ActiveEffect]): bool =
    effects.contains(ExpeditiousRetreatDashBonusAction)

  pure def resolveExpeditiousRetreatDash(state: BattleState, speedKind: MovementSpeedKind): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val concentrationBase = {
        ...state,
        fighter: breakConcentration(state.fighter),
        goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
      }
      val dashed = stateWithFighterMovementStep(
        concentrationBase,
        battleRuntimeBonusActionDash(
          movementProjectionForFighter(concentrationBase, speedKind),
          movementSpeed(concentrationBase.fighter, speedKind),
        ),
      )
      commitActorSpellSlotUse({
        ...dashed,
        fighter: {
          ...dashed.fighter,
          concentrating: true,
          activeEffects: dashed.fighter.activeEffects.union(Set(ExpeditiousRetreatDashBonusAction)),
        },
      }, Fighter)
    } else {
      state
    }

  pure def expeditiousRetreatBonusActionDashFighter(state: BattleState, speedKind: MovementSpeedKind): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      activeEffectsContainExpeditiousRetreatDashBonusAction(state.fighter.activeEffects) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated)
    )
      stateWithFighterMovementStep(
        state,
        battleRuntimeBonusActionDash(
          movementProjectionForFighter(state, speedKind),
          movementSpeed(state.fighter, speedKind),
        ),
      )
    else
      state

  pure def disengageFighter(state: BattleState): BattleState =
    stateWithFighterMovementStep(state, battleRuntimeDisengage(movementProjectionForFighter(state, WalkSpeedKind)))

  pure def dodgeFighter(state: BattleState): BattleState =
    stateWithFighterMovementStep(state, battleRuntimeDodge(movementProjectionForFighter(state, WalkSpeedKind)))

  pure def readyFighter(state: BattleState): BattleState =
    stateWithFighterMovementStep(state, battleRuntimeReadyMovement(movementProjectionForFighter(state, WalkSpeedKind), true))

  pure def helpFighterAttack(state: BattleState): BattleState =
    stateWithFighterMovementStep(state, battleRuntimeHelpAttack(movementProjectionForFighter(state, WalkSpeedKind), true))

  pure def movementRemainingForFighter(state: BattleState): int = {
    movementRemainingForFighterWithSpeedKind(state, WalkSpeedKind)
  }

  pure def movementRemainingForFighterWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind): int =
    battleRuntimeMovementRemaining(movementProjectionForFighter(state, speedKind))

  pure def movementRemaining(combatant: Combatant): int =
    battleRuntimeMovementRemaining({
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
      speedFeet: combatant.speed,
      movementSpentFeet: combatant.movementSpent,
      prone: combatant.prone,
      grappleEscapeDc: 0,
    })

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

  pure def fighterGoblinGrappleExists(state: BattleState): bool =
    match state.grapple {
      | NoGrapple => false
      | FighterGrapplesGoblin(_) => true
    }

  pure def fighterGoblinGrappleTargetDragCostExempt(state: BattleState): bool =
    match state.grapple {
      | NoGrapple => false
      | FighterGrapplesGoblin(link) => link.targetDragCostExempt
    }

  pure def fighterCanMove(state: BattleState, movementCost: int): bool =
    fighterCanMoveWithSpeedKind(state, WalkSpeedKind, movementCost)

  pure def fighterCanMoveWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind, movementCost: int): bool =
    battleRuntimeCanSpendMovement(movementProjectionForFighter(state, speedKind), movementCost)

  pure def fighterCanGrappleGoblin(state: BattleState): bool =
    battleRuntimeCanAttemptGrappleBySizeRank(
      creatureSizeRank(state.fighter.creatureSize),
      creatureSizeRank(state.goblin.creatureSize),
      state.fighter.leftHandUse == HFree,
      FIGHTER_GRAPPLE_ESCAPE_DC,
    )
      and currentActor(state) == Fighter
      and state.actionAvailable
      and not(state.fighter.unconscious)
      and not(state.fighter.incapacitated)
      and not(fighterGoblinGrappleExists(state))

  pure val FIGHTER_GRAPPLE_ESCAPE_DC = 13

  pure def grappleFighterGoblin(state: BattleState, targetSaveTotal: int): BattleState =
    if (not(fighterCanGrappleGoblin(state)))
      state
    else if (battleRuntimeGrappleAttemptSucceedsBySizeRank(
      creatureSizeRank(state.fighter.creatureSize),
      creatureSizeRank(state.goblin.creatureSize),
      state.fighter.leftHandUse == HFree,
      targetSaveTotal,
      FIGHTER_GRAPPLE_ESCAPE_DC,
    )) {
      val extended = extendRageWithEnemySavingThrow(state, Goblin)
      {
        ...extended,
        actionAvailable: false,
        fighter: { ...extended.fighter, leftHandUse: HGrapple },
        grapple: FighterGrapplesGoblin({ escapeDc: FIGHTER_GRAPPLE_ESCAPE_DC, targetDragCostExempt: false }),
      }
    }
    else {
      val extended = extendRageWithEnemySavingThrow(state, Goblin)
      { ...extended, actionAvailable: false }
    }

  pure def releaseFighterGrapple(state: BattleState): BattleState =
    if (fighterGoblinGrappleExists(state))
      {
        ...state,
        fighter: { ...state.fighter, leftHandUse: HFree },
        grapple: NoGrapple,
      }
    else
      state

  pure def escapeFighterGrapple(state: BattleState, escapeCheckTotal: int): BattleState =
    if (not(fighterGoblinGrappleExists(state)))
      state
    else {
      val step = battleRuntimeEscapeGrapple(movementProjectionForGrappledGoblin(state), escapeCheckTotal)
      if (step.grappleActive)
        { ...state, actionAvailable: step.actionAvailable, bonusActionAvailable: step.bonusActionAvailable }
      else
        { ...releaseFighterGrapple(state), actionAvailable: step.actionAvailable, bonusActionAvailable: step.bonusActionAvailable }
    }

  pure def goblinAttackRequiresDisadvantage(state: BattleState, targetIsFighter: bool): bool =
    battleRuntimeGrappledAttackRollHasDisadvantage(fighterGoblinGrappleExists(state), targetIsFighter)

  pure def fighterCanLightPropertyExtraAttack(state: BattleState): bool =
    currentActor(state) == Fighter and
      battleRuntimeLightPropertyExtraAttackAdmitted(
        movementProjectionForFighter(state, WalkSpeedKind),
        state.lightWeaponAttackMade,
        true,
      )

  pure def spendFighterLightPropertyExtraAttackBonusAction(state: BattleState): BattleState =
    stateWithFighterMovementStep(
      state,
      battleRuntimeLightPropertyExtraAttack(
        movementProjectionForFighter(state, WalkSpeedKind),
        state.lightWeaponAttackMade,
        true,
      ),
    )

  pure def offHandAttackFighter(state: BattleState, attackTotal: int, naturalD20: int, damageRoll: int): BattleState =
    offHandAttackFighterWithAbilityModifier(state, attackTotal, naturalD20, damageRoll, 3)

  pure def offHandAttackFighterWithAbilityModifier(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    abilityModifier: int
  ): BattleState =
    if (fighterCanLightPropertyExtraAttack(state))
      if (attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state)))
        {
          ...spendFighterLightPropertyExtraAttackBonusAction(state),
          goblin: applyDamageFromSource(state.goblin, battleRuntimeLightPropertyExtraAttackDamageAmount(damageRoll, abilityModifier), if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, false, OrdinaryDamage, Fighter),
        }
      else
        spendFighterLightPropertyExtraAttackBonusAction(state)
    else
      state

  pure def offHandAttackFighterWithDamageReduction(state: BattleState, attackTotal: int, naturalD20: int, damageRoll: int, reduction: int): BattleState =
    offHandAttackFighterWithDamageReductionAndAbilityModifier(state, attackTotal, naturalD20, damageRoll, reduction, 3)

  pure def offHandAttackFighterWithDamageReductionAndAbilityModifier(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    reduction: int,
    abilityModifier: int
  ): BattleState =
    if (fighterCanLightPropertyExtraAttack(state))
      if (attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))) {
        val baseDamage = battleRuntimeLightPropertyExtraAttackDamageAmount(damageRoll, abilityModifier)
        val reducedDamage = if (baseDamage - reduction < 0) 0 else baseDamage - reduction
        {
          ...spendFighterLightPropertyExtraAttackBonusAction(state),
          goblin: applyDamageFromSource(state.goblin, reducedDamage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, false, OrdinaryDamage, Fighter),
        }
      }
      else
        spendFighterLightPropertyExtraAttackBonusAction(state)
    else
      state

  pure def goblinCanOpportunityAttack(state: BattleState, provokedByTable: bool): bool =
    state.goblin.hp > 0 and
    state.goblin.reactionAvailable and
    battleRuntimeOpportunityAttackTriggered(
      movementProjectionForFighter(state, WalkSpeedKind),
      true,
      true,
      provokedByTable,
      true,
    )

  pure def applyFighterMovement(state: BattleState, movementCost: int): BattleState =
    applyFighterMovementWithSpeedKind(state, WalkSpeedKind, movementCost)

  pure def applyFighterMovementWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind, movementCost: int): BattleState = {
    val step = battleRuntimeSpendMovement(movementProjectionForFighter(state, speedKind), movementCost)
    stateWithFighterMovementStep(state, step)
  }

  pure def moveFighter(state: BattleState, movementCost: int, provokedByTable: bool): BattleState =
    moveFighterWithSpeedKind(state, WalkSpeedKind, movementCost, provokedByTable)

  pure def moveFighterWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind, movementCost: int, provokedByTable: bool): BattleState =
    if (not(fighterCanMoveWithSpeedKind(state, speedKind, movementCost)))
      state
    else if (goblinCanOpportunityAttack(state, provokedByTable))
      openReactionWindow(state, {
        trigger: OpportunityAttack,
        procedure: OpportunityAttackReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeMovement({ speedKind: speedKind, movementCost: movementCost }),
      })
    else
      applyFighterMovementWithSpeedKind(state, speedKind, movementCost)

  pure def spendFighterSpellActionCost(state: BattleState, actionCost: SpellActionCost): BattleState =
    stateWithFighterMovementStep(
      state,
      if (actionCost == SpellBonusAction)
        battleRuntimeSpendBonusAction(movementProjectionForFighter(state, WalkSpeedKind))
      else
        battleRuntimeSpendMagicAction(movementProjectionForFighter(state, WalkSpeedKind)),
    )

  pure def canSpendFighterSpellActionCost(state: BattleState, actionCost: SpellActionCost): bool =
    spendFighterSpellActionCost(state, actionCost) != state
}
