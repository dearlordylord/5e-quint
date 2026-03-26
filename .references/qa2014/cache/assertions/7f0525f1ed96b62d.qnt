// Source: https://rpg.stackexchange.com/q/164051
module _qa_7f0525f1ed96b62d {
  import dnd.* from "./dnd"

  // Is lighting a Drift Globe a bonus action?
  run qa_drift_globe_command_word_is_free_action = {
    // Speaking a magic item's command word is a free speech action — no action or bonus
    // action is consumed — so the creature retains their full action to attack.
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // "Activating" the globe via command word is free speech: no spec call,
    // turn state is unchanged. Now use the action for Attack.
    val tAfterAttack = pUseAction(t0, creature, AAttack)
    assert(
      // Before the attack the action economy is fully intact (command word cost nothing)
      t0.actionsRemaining > 0 and
      t0.bonusActionUsed == false and
      t0.freeInteractionUsed == false and
      // Attack action is still usable and correctly consumed
      tAfterAttack.actionsRemaining == 0 and
      tAfterAttack.attackActionUsed == true and
      // Bonus action was never touched — still free for e.g. off-hand strike
      tAfterAttack.bonusActionUsed == false
    )
  }
}
