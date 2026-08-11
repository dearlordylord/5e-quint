// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-command-approach-route spell.invocation-command-flee-route

// KERNEL-COVERAGE: qnt-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
module battleRuntimeCommandMovementNextTurn {
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeCommandNextTurn.* from "./battle-runtime-command-next-turn"

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
            match commandApproachFollowOutcome(
              commandApproachFighterHasMovementAvailable(state),
              battleRuntimeCanSpendMovement(movementProjectionForFighter(state, speedKind), movementCost),
              movedWithinFiveFeetOfCaster,
            ) {
              | CommandApproachNoMovement => withoutPending
              | CommandApproachMovementRejected => state
              | CommandApproachMovementContinues =>
                  stateWithFighterMovementStep(
                    withoutPending,
                    battleRuntimeSpendMovement(movementProjectionForFighter(state, speedKind), movementCost),
                  )
              | CommandApproachMovementEndsTurn =>
                  endTurn(stateWithFighterMovementStep(
                    withoutPending,
                    battleRuntimeSpendMovement(movementProjectionForFighter(state, speedKind), movementCost),
                  ))
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
            match commandApproachFollowOutcome(
              commandApproachGoblinHasMovementAvailable(state),
              battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost),
              movedWithinFiveFeetOfCaster,
            ) {
              | CommandApproachNoMovement => withoutPending
              | CommandApproachMovementRejected => state
              | CommandApproachMovementContinues =>
                  stateWithGoblinMovementStep(
                    withoutPending,
                    battleRuntimeSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost),
                  )
              | CommandApproachMovementEndsTurn =>
                  endTurn(stateWithGoblinMovementStep(
                    withoutPending,
                    battleRuntimeSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost),
                  ))
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
      match commandFleeFollowOutcome(
        commandFleeActorHasMovementAvailable(state, actor),
        movementCost,
        commandFleeMovementRemaining(state, actor, speedKind),
        commandFleeCanSpendMovement(state, actor, speedKind, movementCost),
        provokesOpportunityAttack,
      ) {
        | CommandFleeNoMovementEndsTurn => endTurn(withoutPending)
        | CommandFleeMovementRejected => state
        | CommandFleeOpportunityAttackContinuation =>
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
        | CommandFleeMovementEndsTurn =>
            endTurn(stateWithCommandFleeMovement(withoutPending, actor, speedKind, movementCost))
      }
    } else {
      state
    }

}
