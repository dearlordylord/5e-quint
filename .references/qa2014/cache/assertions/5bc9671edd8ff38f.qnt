// Source: https://rpg.stackexchange.com/q/169590
module _qa_5bc9671edd8ff38f {
  import dnd.* from "./dnd"

  // Using Extra Attack feature with two-handed weapon and additional thrown weapon; releasing grip is free, drawing uses free object interaction
  run qa_extra_attack_thrown_and_two_handed = {
    // Fresh turn: character holds halberd in both hands
    val t0 = FRESH_TURN
    // Releasing one hand from the halberd costs nothing (no spec call needed — absence of cost is the rule)
    // Draw the javelin using the one free object interaction
    val t1 = pUseObjectInteraction(t0)
    // Attack action: throw the javelin (first attack)
    val creature = freshCreature(20)
    val t2 = pUseAction(t1, creature, AAttack)
    // Regain grip on halberd (free per RAI) then make Extra Attack with it
    val t3 = pUseExtraAttack(t2)
    assert(
      // Drawing the javelin consumed the free object interaction
      t1.freeInteractionUsed == true
      // Attack action is used and flagged
      and t2.actionsRemaining == 0
      and t2.attackActionUsed == true
      // Extra attack slot consumed for the halberd strike
      and t3.extraAttacksRemaining == 0
      // Bonus action still available (e.g. Polearm Master butt-end strike)
      and t3.bonusActionUsed == false
      // Reaction untouched
      and t3.reactionAvailable == true
    )
  }
}
