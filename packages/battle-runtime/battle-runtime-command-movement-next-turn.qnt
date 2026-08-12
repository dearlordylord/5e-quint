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

  pure def commandActorHasMovementAvailable(state: BattleState, actor: Actor): bool =
    battleRuntimeCanSpendMovement(movementProjectionForActor(state, actor, WalkSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForActor(state, actor, ClimbSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForActor(state, actor, SwimSpeedKind), 1)

  pure def followCommandApproach(
    state: BattleState,
    speedKind: MovementSpeedKind,
    movementCost: int,
    movedWithinFiveFeetOfCaster: bool,
  ): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandApproachOption).size() > 0) {
      val actor = currentActor(state)
      val withoutPending = stateWithoutCommandPendingForActor(state, actor, CommandApproachOption)
      match commandApproachFollowOutcome(
        commandActorHasMovementAvailable(state, actor),
        battleRuntimeCanSpendMovement(movementProjectionForActor(state, actor, speedKind), movementCost),
        movedWithinFiveFeetOfCaster,
      ) {
        | CommandApproachNoMovement => withoutPending
        | CommandApproachMovementRejected => state
        | CommandApproachMovementContinues => stateWithCommandMovement(withoutPending, actor, speedKind, movementCost)
        | CommandApproachMovementEndsTurn => endTurn(stateWithCommandMovement(withoutPending, actor, speedKind, movementCost))
      }
    } else
      state

  pure def commandFleeMovementRemaining(state: BattleState, actor: Actor, speedKind: MovementSpeedKind): int =
    battleRuntimeMovementRemaining(movementProjectionForActor(state, actor, speedKind))

  pure def commandFleeCanSpendMovement(
    state: BattleState,
    actor: Actor,
    speedKind: MovementSpeedKind,
    movementCost: int,
  ): bool =
    battleRuntimeCanSpendMovement(movementProjectionForActor(state, actor, speedKind), movementCost)

  pure def commandFleeActorHasMovementAvailable(state: BattleState, actor: Actor): bool =
    commandFleeCanSpendMovement(state, actor, WalkSpeedKind, 1)
      or commandFleeCanSpendMovement(state, actor, ClimbSpeedKind, 1)
      or commandFleeCanSpendMovement(state, actor, SwimSpeedKind, 1)

  pure def stateWithCommandMovement(state: BattleState, actor: Actor, speedKind: MovementSpeedKind, movementCost: int): BattleState =
    stateWithActorMovementStep(
      state,
      actor,
      battleRuntimeSpendMovement(movementProjectionForActor(state, actor, speedKind), movementCost),
    )

  pure def followCommandFlee(
    state: BattleState,
    speedKind: MovementSpeedKind,
    movementCost: int,
    provokesOpportunityAttack: bool,
  ): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandFleeOption).size() > 0) {
      val actor = currentActor(state)
      val withoutPending = stateWithoutCommandPendingForActor(state, actor, CommandFleeOption)
      match commandFleeFollowOutcome(
        commandFleeActorHasMovementAvailable(state, actor),
        movementCost,
        commandFleeMovementRemaining(state, actor, speedKind),
        commandFleeCanSpendMovement(state, actor, speedKind, movementCost),
        provokesOpportunityAttack,
      ) {
        | CommandFleeNoMovementEndsTurn => endTurn(withoutPending)
        | CommandFleeMovementRejected => state
        | CommandFleeOpportunityAttackContinuation => {
            val awaitingReaction = openReactionWindow(state, {
              request: OpportunityAttackReactionRequest({
                mover: actor,
                threat: if (actor == Fighter) Goblin else Fighter,
                continuation: OpportunityAttackResumesCommandFleeMovement({
                  speedKind: speedKind,
                  movementCost: movementCost,
                }),
              }),
            })
            if (reactionWindowOpened(state, awaitingReaction))
              awaitingReaction
            else
              endTurn(stateWithCommandMovement(withoutPending, actor, speedKind, movementCost))
          }
        | CommandFleeMovementEndsTurn =>
            endTurn(stateWithCommandMovement(withoutPending, actor, speedKind, movementCost))
      }
    } else {
      state
    }

}
