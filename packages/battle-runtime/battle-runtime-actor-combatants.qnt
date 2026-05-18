// -*- mode: Bluespec; -*-

module battleRuntimeActorCombatants {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def stateWithActorCombatant(state: BattleState, actor: Actor, combatant: Combatant): BattleState =
    match actor {
      | Fighter => { ...state, fighter: combatant }
      | Goblin => { ...state, goblin: combatant }
    }

  pure def combatantForActor(state: BattleState, actor: Actor): Combatant =
    match actor {
      | Fighter => state.fighter
      | Goblin => state.goblin
    }
}
