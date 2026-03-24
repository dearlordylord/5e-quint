// Source: https://rpg.stackexchange.com/q/215923
module _qa_3b5fa5f6a328b62f {
  import dnd.* from "./dnd"

  // Silent Image + Voice of the Chain Master each require an action per turn (2014 rules), blocking simultaneous use
  run qa_silent_image_voice_chain_master_action_economy = {
    val creature = freshCreature(20)
    val turn0 = FRESH_TURN
    // Use action to animate Silent Image (move/alter the illusion)
    val turn1 = pUseAction(turn0, creature, ACastSpell)
    // Attempt to use action again to perceive through familiar (prerequisite for Voice of the Chain Master)
    val turn2 = pUseAction(turn1, creature, AUseObject)
    assert(
      // First action consumed
      turn1.actionUsed
      // Second action attempt is a no-op — action already spent
      and turn2 == turn1
    )
  }
}
