// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE BATTLE.SANCTUARY.TARGETING_INTERDICTION
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

  // Address two combatants in one update (e.g. an attacker who hits a defender),
  // flattening nested stateWithActorCombatant calls at the attack-resolution
  // sites. When both actors are distinct the order is irrelevant.
  pure def stateWithActorCombatants(
    state: BattleState,
    actorA: Actor,
    combatantA: Combatant,
    actorB: Actor,
    combatantB: Combatant,
  ): BattleState =
    stateWithActorCombatant(stateWithActorCombatant(state, actorA, combatantA), actorB, combatantB)
}
