// Source: https://rpg.stackexchange.com/q/73013
module _qa_0dff2592bcd5d143 {
  import dnd.* from "./dnd"

  // Timing of the Ready action when the trigger is associated with spell casting?
  // Rule: readied reaction fires "right after the trigger finishes" (PHB p.192); a 1-action
  // spell cast is indivisible — reaction cannot interrupt mid-cast, only after completion.
  run qa_ready_action_fires_after_trigger = {
      val creature = freshCreature(20)
      val t0 = FRESH_TURN
      // Creature uses their action to Ready
      val t1 = pUseAction(t0, creature, AReady)
      // After readying: action spent, flag set, but reaction is STILL available —
      // the trigger (spell being cast) has not yet finished.
      val readiedState =
          t1.actionsRemaining == 0
          and t1.readiedAction == true
          and t1.reactionAvailable == true
      // The triggering spell (1 action) completes; NOW the readied reaction fires.
      val t2 = pUseReaction(t1)
      val reactionConsumedAfterTrigger = t2.reactionAvailable == false
      assert(readiedState and reactionConsumedAfterTrigger)
  }
}
