// Source: https://rpg.stackexchange.com/q/102537
module _qa_c96026c37c202a74 {
  import dnd.* from "./dnd"

  // Is a harpy's luring song an action or a bonus action?
  // Initial Luring Song is an action (listed under Actions in stat block)
  run qa_luring_song_initial_costs_action = {
    val harpy = freshCreature(38)
    val t0 = FRESH_TURN
    // Initiating the song costs the action (AUseObject as proxy for monster special ability)
    val t1 = pUseAction(t0, harpy, AUseObject)
    assert(t1.actionsRemaining == 0 and not(t1.bonusActionUsed))
  }
  
  // Is a harpy's luring song an action or a bonus action?
  // After initiating, the bonus action remains available for continuation on this same turn
  run qa_luring_song_initial_leaves_bonus_action_free = {
    val harpy = freshCreature(38)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, harpy, AUseObject)
    assert(t1.actionsRemaining == 0 and t1.reactionAvailable and not(t1.bonusActionUsed))
  }
  
  // Is a harpy's luring song an action or a bonus action?
  // Continuing the song on a subsequent turn costs only a bonus action (not the action)
  run qa_luring_song_continuation_costs_bonus_action = {
    val harpy = freshCreature(38)
    // Simulate a subsequent turn: fresh turn, song already active, continue with bonus action only
    val t0 = FRESH_TURN
    val t1 = pUseBonusAction(t0, harpy)
    assert(t1.bonusActionUsed and t1.actionsRemaining > 0)
  }
  
  // Is a harpy's luring song an action or a bonus action?
  // Restarting after stopping costs the action again (not just a bonus action)
  run qa_luring_song_restart_after_stop_costs_action = {
    val harpy = freshCreature(38)
    val t0 = FRESH_TURN
    // Harpy stopped singing; to restart it must use its action
    val t1 = pUseAction(t0, harpy, AUseObject)
    // Action is now spent; bonus action is still free (not sufficient to restart alone)
    assert(t1.actionsRemaining == 0 and not(t1.bonusActionUsed))
  }
}
