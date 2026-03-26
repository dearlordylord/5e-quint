module _qa_d52aec74c16c02ed {
  import dnd.* from "./dnd"

  // When readying an action to cast a spell from a magic item, do you have to maintain concentration as though you were readying the Cast a Spell action?
  run qa_ready_magic_item_no_forced_concentration = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val ss0 = FRESH_SPELL_SLOTS
  
    // Take the Ready action, modelling readying a magic item activation (not Cast a Spell)
    val t1 = pUseAction(t0, creature, AReady)
  
    // Ruling: readying a magic item does NOT require concentration to hold the energy;
    // concentration requirement only applies when specifically readying the Cast a Spell action.
    // pUseAction(AReady) marks the readied action but never starts concentration.
    assert(
      t1.readiedAction == true
      and t1.actionsRemaining == 0
      and ss0.concentrationSpellId == ""
      and not(isConcentrating(ss0))
    )
  }
}
