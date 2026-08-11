// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-command-drop-held-object spell.invocation-command-halt-grovel

// KERNEL-COVERAGE: qnt-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
module battleRuntimeCommandControlNextTurn {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeCommandNextTurn.* from "./battle-runtime-command-next-turn"

  pure def followCommandGrovel(state: BattleState): BattleState =
    match commandGrovelFollowOutcome(commandPendingEffectsForActor(state, currentActor(state), CommandGrovelOption).size() > 0) {
      | CommandGrovelAppliesProneEndsTurn =>
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
      | CommandGrovelIgnored => state
    }

  pure def commandDropOutcomeCount(state: BattleState, heldObjectCount: int): int =
    match commandDropFollowOutcome(commandPendingEffectsForActor(state, currentActor(state), CommandDropOption).size() > 0, heldObjectCount) {
      | CommandDropObjectsAndEndsTurn(outcome) => outcome.droppedObjectCount
      | CommandDropIgnored => 0
    }

  pure def followCommandDrop(state: BattleState, heldObjectCount: int): BattleState =
    match commandDropFollowOutcome(commandPendingEffectsForActor(state, currentActor(state), CommandDropOption).size() > 0, heldObjectCount) {
      | CommandDropObjectsAndEndsTurn(_) =>
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
      | CommandDropIgnored => state
    }

  pure def followCommandHalt(state: BattleState): BattleState =
    match commandHaltFollowOutcome(commandPendingEffectsForActor(state, currentActor(state), CommandHaltOption).size() > 0) {
      | CommandHaltSuppressesActionBonusAndMovement =>
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
      | CommandHaltIgnored => state
    }

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
