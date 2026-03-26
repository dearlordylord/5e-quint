// Source: https://rpg.stackexchange.com/q/129737
module _qa_9b6af3fc70deddc9 {
  import dnd.* from "./dnd"

  // Does drinking an Antitoxin take an action?
  // RAW: antitoxin is not magical and not a potion; it qualifies as the free object interaction, leaving the action available
  run qa_antitoxin_free_object_interaction = {
    val t = pUseObjectInteraction(FRESH_TURN)
    assert(
      t.freeInteractionUsed == true and
      t.actionsRemaining > 0
    )
  }
  
  // Does drinking an Antitoxin take an action? (contrast: a healing potion uses the AUseObject action)
  // Drinking a magical potion is "Use Magic Item" / Use an Object action, consuming the action
  run qa_magic_potion_requires_action = {
    val creature = freshCreature(20)
    val t = pUseAction(FRESH_TURN, creature, AUseObject)
    assert(
      t.actionsRemaining == 0 and
      t.freeInteractionUsed == false
    )
  }
  
  // Does drinking an Antitoxin take an action? (second free interaction in a turn is not free)
  // Only one free object interaction per turn; a second one does not change state — caller must use an action
  run qa_antitoxin_second_use_needs_action = {
    val t1 = pUseObjectInteraction(FRESH_TURN)
    val t2 = pUseObjectInteraction(t1)
    assert(t1 == t2)
  }
}
