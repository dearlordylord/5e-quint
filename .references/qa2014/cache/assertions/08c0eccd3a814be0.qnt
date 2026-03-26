// Source: https://rpg.stackexchange.com/q/191949
module _qa_08c0eccd3a814be0 {
  import dnd.* from "./dnd"

  // Does activating a magic item that does not specifically require an action still require an action?
  run qa_magic_item_explicit_action_consumes_action = {
    // Item like Eversmoking Bottle says "use an action" — activation uses AUseObject,
    // marking actionsRemaining = 0 and blocking further actions that turn.
    val s = freshCreature(10)
    val t = FRESH_TURN
    val t1 = pUseAction(t, s, AUseObject)
    // Trying to also take the Attack action is refused because actionsRemaining is already 0
    val t2 = pUseAction(t1, s, AAttack)
    assert(
      t1.actionsRemaining == 0 and
      t2.actionsRemaining == 0 and
      t2.attackActionUsed == false // Attack action was NOT registered — action already spent
    )
  }
  
  // Does activating a magic item that does not specifically require an action still require an action?
  run qa_magic_item_no_action_stated_leaves_action_free = {
    // Items like Breathing Bubble or Eagle Whistle specify no action cost.
    // Activation does not call pUseAction, so the creature's action is untouched.
    val s = freshCreature(10)
    val t = FRESH_TURN
    // "Activate" the no-action item — no pUseAction call, turn state unchanged
    val t_after_free_activate = t
    // The creature still has its full action available and can use it normally
    val t_attack = pUseAction(t_after_free_activate, s, AAttack)
    assert(
      t_after_free_activate.actionsRemaining > 0 and
      t_attack.actionsRemaining == 0 and
      t_attack.attackActionUsed == true
    )
  }
}
