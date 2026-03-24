// Source: https://rpg.stackexchange.com/q/181109
module _qa_86f8537851145d44 {
  import dnd.* from "./dnd"

  // Does a clay golem's haste action actually give it more attacks?
  run qa_clay_golem_haste_same_total_attacks = {
    val creature = freshCreature(20)
  
    // Without Haste: 2 turns, each with Attack action + 1 extra attack = 2 attacks/turn
    val t1_nh = pUseExtraAttack(pUseAction(FRESH_TURN, creature, AAttack))
    val attacks_t1_nh = 1 + (FRESH_TURN.extraAttacksRemaining - t1_nh.extraAttacksRemaining)
  
    val t2_nh = pUseExtraAttack(pUseAction(FRESH_TURN, creature, AAttack))
    val attacks_t2_nh = 1 + (FRESH_TURN.extraAttacksRemaining - t2_nh.extraAttacksRemaining)
  
    val total_no_haste = attacks_t1_nh + attacks_t2_nh
  
    // With Haste:
    // Turn 1: action = Haste (AUseObject, no attacks), bonus action = 1 slam
    val attacks_t1_h = 1
  
    // Turn 2: action = 2 slams (attack + extra), bonus action = 1 slam (lingering Haste)
    val t2_h = pUseExtraAttack(pUseAction(FRESH_TURN, creature, AAttack))
    val attacks_t2_h = (1 + (FRESH_TURN.extraAttacksRemaining - t2_h.extraAttacksRemaining)) + 1
  
    val total_haste = attacks_t1_h + attacks_t2_h
  
    assert(total_no_haste == 4 and total_haste == 4 and total_no_haste == total_haste)
  }
}
