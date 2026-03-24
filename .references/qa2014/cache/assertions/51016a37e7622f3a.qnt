// Source: https://rpg.stackexchange.com/q/179248
module _qa_51016a37e7622f3a {
  import dnd.* from "./dnd"

  // Can you draw a weapon as part of a spell attack? — free object interaction is available in tandem with Cast a Spell action
  run qa_draw_weapon_during_cast_spell = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // Cast a Spell uses the action but does not consume the free object interaction
    val t1 = pUseAction(t0, creature, ACastSpell)
    // Action is spent on the spell
    val actionSpent = t1.actionUsed
    // Free interaction slot is still open — drawing a weapon is possible in tandem
    val canStillDrawWeapon = not(t1.freeInteractionUsed)
    // Exercise the draw: pUseObjectInteraction marks it used
    val t2 = pUseObjectInteraction(t1)
    val weaponDrawn = t2.freeInteractionUsed
    assert(actionSpent and canStillDrawWeapon and weaponDrawn)
  }
}
