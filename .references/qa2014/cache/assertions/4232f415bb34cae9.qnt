// Source: https://rpg.stackexchange.com/q/180854
module _qa_4232f415bb34cae9 {
  import dnd.* from "./dnd"

  // What is the action economy cost of using Bottled Breath? — Accepted: one Action (DMG p.139, potion activation costs an action)
  run qa_bottled_breath_costs_action = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AUseObject)
    assert(
      t1.actionsRemaining == 0
      and t1.bonusActionUsed == false
      and t1.freeInteractionUsed == false
    )
  }
}
