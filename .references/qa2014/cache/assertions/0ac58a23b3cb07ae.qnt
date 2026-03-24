// Source: https://rpg.stackexchange.com/q/107470
module _qa_0ac58a23b3cb07ae {
  import dnd.* from "./dnd"

  // Using shields with versatile/two-handed weapons?
  run qa_shield_don_doff_costs_action = {
    // PHB p.146: donning a shield costs 1 action; only one action per turn.
    // A character cannot both attack (action) and don a shield (action) on the same turn.
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // Use the action to attack
    val t1 = pUseAction(t0, creature, AAttack)
    // Attempt a second action to don the shield — blocked, action already consumed
    val t2 = pUseAction(t1, creature, AUseObject)
    assert(t1.actionUsed and t2 == t1)
  }
}
