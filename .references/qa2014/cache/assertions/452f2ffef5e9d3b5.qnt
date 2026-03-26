// Source: https://rpg.stackexchange.com/q/111610
module _qa_452f2ffef5e9d3b5 {
  import dnd.* from "./dnd"

  // When rolling a 20 for a Death Saving Throw, can you move and take Actions that turn?
  run qa_nat20_death_save_retains_action_and_movement = {
    // Creature dropped to 0 HP, unconscious and prone at start of their turn
    val dyingCreature = freshCreature(10)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
  
    // Turn begins with action and movement untouched (surprised=false, not incapacitated yet)
    val turn = FRESH_TURN
  
    // Death save is instant — pDeathSave only touches CreatureState, never TurnState
    val afterSave = pDeathSave(dyingCreature, 20)
  
    assert(
      // Nat 20: regain 1 HP, regain consciousness, death saves reset
      afterSave.hp == 1
      and not(afterSave.unconscious)
      and not(isIncapacitated(afterSave))
      and afterSave.deathSaves.successes == 0
      and afterSave.deathSaves.failures == 0
      // Still prone — pRemoveCondition(CUnconscious) does not remove prone
      and afterSave.prone
      // Death save consumed no action: TurnState is completely untouched
      and turn.actionsRemaining > 0
      and not(turn.bonusActionUsed)
      and turn.movementRemaining > 0
    )
  }
}
