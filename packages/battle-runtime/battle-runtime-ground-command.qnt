// -*- mode: Bluespec; -*-

module battleRuntimeGroundCommand {
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  pure val greaseDurationTicks = 10
  pure val greaseAreaId = 1
  pure val fogCloudDurationTicks = 600
  pure val fogCloudAreaId = 2
  pure val fogCloudBaseRadiusFeet = 20
  pure val fogCloudRadiusFeetPerSlotAboveFirst = 20

  pure def activeEffectsWithoutGreaseGroundHazard(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | GreaseGroundHazard(data) => data.areaId != areaId
      | _ => true
    })

  pure def combatantAfterGreaseSave(target: Combatant, savingThrowSucceeded: bool): Combatant =
    if (savingThrowSucceeded)
      target
    else
      { ...target, prone: true }

  pure def resolveGrease(
    state: BattleState,
    goblinIncludedInArea: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutGreaseGroundHazard(state.fighter.activeEffects, greaseAreaId)
            .union(Set(GreaseGroundHazard({ areaId: greaseAreaId, durationTicks: greaseDurationTicks }))),
        },
        goblin: if (goblinIncludedInArea) combatantAfterGreaseSave(state.goblin, goblinSavingThrowSucceeded) else state.goblin,
        actionAvailable: false,
      }, Fighter)

  pure def greaseGroundHazardActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | GreaseGroundHazard(data) => data.areaId == areaId
      | _ => false
    })

  pure def greaseGroundDifficultTerrainMovementCost(state: BattleState, areaId: int, totalDistanceFeet: int, greaseDistanceFeet: int): int =
    if (greaseGroundHazardActive(state, areaId) and totalDistanceFeet > 0 and greaseDistanceFeet > 0 and greaseDistanceFeet <= totalDistanceFeet)
      totalDistanceFeet + greaseDistanceFeet
    else
      0

  pure def moveFighterThroughGreaseGroundDifficultTerrain(state: BattleState, areaId: int, totalDistanceFeet: int, greaseDistanceFeet: int, provokedByTable: bool): BattleState = {
    val movementCost = greaseGroundDifficultTerrainMovementCost(state, areaId, totalDistanceFeet, greaseDistanceFeet)
    if (movementCost == 0)
      state
    else
      moveFighter(state, movementCost, provokedByTable)
  }

  pure def resolveGreaseGroundHazardSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
  ): BattleState =
    if (not(greaseGroundHazardActive(state, areaId)))
      state
    else {
      match targetActor {
        | Fighter => { ...state, fighter: combatantAfterGreaseSave(state.fighter, savingThrowSucceeded) }
        | Goblin => { ...state, goblin: combatantAfterGreaseSave(state.goblin, savingThrowSucceeded) }
      }
    }

  pure def endTurnWithGreaseGroundHazardSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
  ): BattleState =
    endTurn(resolveGreaseGroundHazardSave(state, targetActor, areaId, savingThrowSucceeded))

  pure def fogCloudRadiusFeet(slotLevel: int): int =
    fogCloudBaseRadiusFeet + ((slotLevel - 1) * fogCloudRadiusFeetPerSlotAboveFirst)

  pure def activeEffectsWithoutFogCloudObscurement(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | FogCloudObscurement(data) => data.areaId != areaId
      | _ => true
    })

  pure def resolveFogCloud(
    state: BattleState,
    areaId: int,
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or slotLevel < 1)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutFogCloudObscurement(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(FogCloudObscurement({
              areaId: areaId,
              radiusFeet: fogCloudRadiusFeet(slotLevel),
              durationTicks: fogCloudDurationTicks,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def fogCloudObscurementActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | FogCloudObscurement(data) => data.areaId == areaId
      | _ => false
    })

  pure def disperseFogCloudByStrongWind(state: BattleState, areaId: int): BattleState =
    if (fogCloudObscurementActive(state, areaId))
      breakConcentrationSpellEffects(state, Fighter)
    else
      state

  pure def commandMaxTargets(slotLevel: int): int =
    slotLevel

  pure def commandPendingEffectFor(state: BattleState, targetActor: Actor, option: CommandOption): ActiveEffect =
    CommandPending({
      source: Fighter,
      option: option,
      expiresAtActor: targetActor,
      expiresAtRound: if (currentActor(state) == targetActor) state.initiative.round + 1 else state.initiative.round,
    })

  pure def activeEffectsWithoutCommandPending(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | CommandPending(data) => data.source != source
      | _ => true
    })

  pure def resolveCommand(
    state: BattleState,
    targets: Set[Actor],
    failedTargets: Set[Actor],
    slotLevel: int,
    option: CommandOption,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      targets.size() < 1 or
      targets.size() > commandMaxTargets(slotLevel) or
      not(failedTargets.forall(target => targets.contains(target)))
    )
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: if (failedTargets.contains(Fighter)) {
          ...state.fighter,
          activeEffects: activeEffectsWithoutCommandPending(state.fighter.activeEffects, Fighter)
            .union(Set(commandPendingEffectFor(state, Fighter, option))),
        } else state.fighter,
        goblin: if (failedTargets.contains(Goblin)) {
          ...state.goblin,
          activeEffects: activeEffectsWithoutCommandPending(state.goblin.activeEffects, Fighter)
            .union(Set(commandPendingEffectFor(state, Goblin, option))),
        } else state.goblin,
        actionAvailable: false,
      }, Fighter)

  pure def commandPendingEffectsForActor(state: BattleState, actor: Actor, option: CommandOption): Set[ActiveEffect] =
    match actor {
      | Fighter => state.fighter.activeEffects
      | Goblin => state.goblin.activeEffects
    }
      .filter(effect => match effect {
        | CommandPending(data) =>
            data.option == option and data.expiresAtActor == actor and data.expiresAtRound == state.initiative.round
        | _ => false
      })

  pure def followCommandGrovel(state: BattleState): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandGrovelOption).size() > 0)
      match currentActor(state) {
        | Fighter => endTurn({
            ...state,
            fighter: {
              ...state.fighter,
              prone: true,
              activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandGrovelOption)),
            },
          })
        | Goblin => endTurn({
            ...state,
            goblin: {
              ...state.goblin,
              prone: true,
              activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandGrovelOption)),
            },
          })
      }
    else
      state

  pure def commandDropOutcomeCount(state: BattleState, heldObjectCount: int): int =
    if (
      heldObjectCount >= 0 and
      commandPendingEffectsForActor(state, currentActor(state), CommandDropOption).size() > 0
    )
      heldObjectCount
    else
      0

  pure def followCommandDrop(state: BattleState, heldObjectCount: int): BattleState =
    if (
      heldObjectCount >= 0 and
      commandPendingEffectsForActor(state, currentActor(state), CommandDropOption).size() > 0
    )
      match currentActor(state) {
        | Fighter => endTurn({
            ...state,
            fighter: {
              ...state.fighter,
              activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandDropOption)),
            },
          })
        | Goblin => endTurn({
            ...state,
            goblin: {
              ...state.goblin,
              activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandDropOption)),
            },
          })
      }
    else
      state

  pure def commandApproachFighterHasMovementAvailable(state: BattleState): bool =
    battleRuntimeCanSpendMovement(movementProjectionForFighter(state, WalkSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForFighter(state, ClimbSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForFighter(state, SwimSpeedKind), 1)

  pure def commandApproachGoblinHasMovementAvailable(state: BattleState): bool =
    battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, WalkSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, ClimbSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, SwimSpeedKind), 1)

  pure def followCommandApproach(
    state: BattleState,
    speedKind: MovementSpeedKind,
    movementCost: int,
    movedWithinFiveFeetOfCaster: bool,
  ): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandApproachOption).size() > 0)
      match currentActor(state) {
        | Fighter => {
            val withoutPending = {
              ...state,
              fighter: {
                ...state.fighter,
                activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandApproachOption)),
              },
            }
            if (not(commandApproachFighterHasMovementAvailable(state)))
              withoutPending
            else if (not(battleRuntimeCanSpendMovement(movementProjectionForFighter(state, speedKind), movementCost)))
              state
            else {
              val moved = stateWithFighterMovementStep(
                withoutPending,
                battleRuntimeSpendMovement(movementProjectionForFighter(state, speedKind), movementCost),
              )
              if (movedWithinFiveFeetOfCaster) endTurn(moved) else moved
            }
          }
        | Goblin => {
            val withoutPending = {
              ...state,
              goblin: {
                ...state.goblin,
                activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandApproachOption)),
              },
            }
            if (not(commandApproachGoblinHasMovementAvailable(state)))
              withoutPending
            else if (not(battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost)))
              state
            else {
              val moved = stateWithGoblinMovementStep(
                withoutPending,
                battleRuntimeSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost),
              )
              if (movedWithinFiveFeetOfCaster) endTurn(moved) else moved
            }
          }
      }
    else
      state

  pure def commandFleeMovementRemaining(state: BattleState, actor: Actor, speedKind: MovementSpeedKind): int =
    match actor {
      | Fighter => battleRuntimeMovementRemaining(movementProjectionForFighter(state, speedKind))
      | Goblin => battleRuntimeMovementRemaining(movementProjectionForGoblin(state, speedKind))
    }

  pure def commandFleeCanSpendMovement(
    state: BattleState,
    actor: Actor,
    speedKind: MovementSpeedKind,
    movementCost: int,
  ): bool =
    match actor {
      | Fighter => battleRuntimeCanSpendMovement(movementProjectionForFighter(state, speedKind), movementCost)
      | Goblin => battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost)
    }

  pure def commandFleeActorHasMovementAvailable(state: BattleState, actor: Actor): bool =
    commandFleeCanSpendMovement(state, actor, WalkSpeedKind, 1)
      or commandFleeCanSpendMovement(state, actor, ClimbSpeedKind, 1)
      or commandFleeCanSpendMovement(state, actor, SwimSpeedKind, 1)

  pure def stateWithoutCommandFleePending(state: BattleState, actor: Actor): BattleState =
    match actor {
      | Fighter => {
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandFleeOption)),
          },
        }
      | Goblin => {
          ...state,
          goblin: {
            ...state.goblin,
            activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandFleeOption)),
          },
        }
    }

  pure def stateWithCommandFleeMovement(state: BattleState, actor: Actor, speedKind: MovementSpeedKind, movementCost: int): BattleState =
    match actor {
      | Fighter =>
          stateWithFighterMovementStep(
            state,
            battleRuntimeSpendMovement(movementProjectionForFighter(state, speedKind), movementCost),
          )
      | Goblin =>
          stateWithGoblinMovementStep(
            state,
            battleRuntimeSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost),
          )
    }

  pure def followCommandFlee(
    state: BattleState,
    speedKind: MovementSpeedKind,
    movementCost: int,
    provokesOpportunityAttack: bool,
  ): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandFleeOption).size() > 0) {
      val actor = currentActor(state)
      val withoutPending = stateWithoutCommandFleePending(state, actor)
      if (not(commandFleeActorHasMovementAvailable(state, actor)))
        endTurn(withoutPending)
      else if (
        movementCost != commandFleeMovementRemaining(state, actor, speedKind)
          or not(commandFleeCanSpendMovement(state, actor, speedKind, movementCost))
      )
        state
      else if (provokesOpportunityAttack)
        openReactionWindow(state, {
          trigger: OpportunityAttack,
          procedure: OpportunityAttackReactionProcedure,
          eligibleReactors: if (actor == Fighter) Set(Goblin) else Set(Fighter),
          offeredReactors: Set(),
          continuation: ResumeCommandFleeMovement({
            speedKind: speedKind,
            movementCost: movementCost,
          }),
        })
      else
        endTurn(stateWithCommandFleeMovement(withoutPending, actor, speedKind, movementCost))
    } else {
      state
    }

  pure def followCommandHalt(state: BattleState): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandHaltOption).size() > 0)
      match currentActor(state) {
        | Fighter => {
            ...state,
            actionAvailable: false,
            bonusActionAvailable: false,
            fighter: { ...state.fighter, movementSpent: state.fighter.speed },
          }
        | Goblin => {
            ...state,
            actionAvailable: false,
            bonusActionAvailable: false,
            goblin: { ...state.goblin, movementSpent: state.goblin.speed },
          }
      }
    else
      state

  pure def endCommandHaltTurn(state: BattleState): BattleState =
    match currentActor(state) {
      | Fighter => endTurn({
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandHaltOption)),
          },
        })
      | Goblin => endTurn({
          ...state,
          goblin: {
            ...state.goblin,
            activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandHaltOption)),
          },
        })
    }
}
