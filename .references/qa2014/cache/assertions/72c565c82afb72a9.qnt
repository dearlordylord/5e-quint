// Source: https://rpg.stackexchange.com/q/120280
module _qa_72c565c82afb72a9 {
  import dnd.* from "./dnd"

  // Can I ready an action to attack using Spiritual Weapon? (No — bonus actions can't be readied)
  run qa_ready_cannot_trigger_bonus_action = {
    // Ready action expends the action and sets readiedAction, but leaves bonusActionUsed
    // untouched. A bonus action (e.g. Spiritual Weapon attack) is not consumed and
    // cannot be the readied trigger — bonus actions are only usable on your own turn.
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AReady)
    assert(
      t1.actionUsed      == true  and  // action spent on Ready
      t1.readiedAction   == true  and  // ready flag set
      t1.bonusActionUsed == false      // bonus action untouched; cannot be readied
    )
  }
}
