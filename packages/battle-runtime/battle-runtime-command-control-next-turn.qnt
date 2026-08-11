// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-command-drop-held-object spell.invocation-command-halt-grovel

// KERNEL-COVERAGE: qnt-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
module battleRuntimeCommandControlNextTurn {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeCommandNextTurn.* from "./battle-runtime-command-next-turn"

  pure def followCommandGrovel(state: BattleState): BattleState =
    match commandGrovelFollowOutcome(commandPendingEffectsForActor(state, currentActor(state), CommandGrovelOption).size() > 0) {
      | CommandGrovelAppliesProneEndsTurn =>
          {
            val actor = currentActor(state)
            val withoutPending = stateWithoutCommandPendingForActor(state, actor, CommandGrovelOption)
            val combatant = combatantForActor(withoutPending, actor)
            endTurn(stateWithActorCombatant(withoutPending, actor, { ...combatant, prone: true }))
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
          endTurn(stateWithoutCommandPendingForActor(state, currentActor(state), CommandDropOption))
      | CommandDropIgnored => state
    }

  pure def followCommandHalt(state: BattleState): BattleState =
    match commandHaltFollowOutcome(commandPendingEffectsForActor(state, currentActor(state), CommandHaltOption).size() > 0) {
      | CommandHaltSuppressesActionBonusAndMovement =>
          {
            val actor = currentActor(state)
            val combatant = combatantForActor(state, actor)
            stateWithActorCombatant({
              ...state,
              actionAvailable: false,
              bonusActionAvailable: false,
            }, actor, { ...combatant, movementSpent: combatant.speed })
          }
      | CommandHaltIgnored => state
    }

  pure def endCommandHaltTurn(state: BattleState): BattleState =
    endTurn(stateWithoutCommandPendingForActor(state, currentActor(state), CommandHaltOption))
}
