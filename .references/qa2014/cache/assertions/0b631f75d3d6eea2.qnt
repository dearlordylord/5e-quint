// Source: https://rpg.stackexchange.com/q/112717
module _qa_0b631f75d3d6eea2 {
  import dnd.* from "./dnd"

  // Spell Mastery Shield cannot freely recharge Arcane Ward: reaction consumed on use, cannot be used again same round
  run qa_shield_spell_mastery_reaction_limit = {
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)   // reaction fires on trigger (hit by attack / Magic Missile)
    val t2 = pUseReaction(t1)   // attempt second cast — reaction already spent
    assert(
      t0.reactionAvailable == true
      and t1.reactionAvailable == false
      and t2.reactionAvailable == false
    )
  }
  
  // Mage Armor (action spell) with Spell Mastery: uses action slot, reaction remains available for other uses
  run qa_mage_armor_action_not_reaction = {
    val c = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, c, ACastSpell)
    assert(
      t1.actionUsed == true
      and t1.reactionAvailable == true
    )
  }
  
  // Reaction resets at start of each new turn, so Shield is eligible again next round (if triggered)
  run qa_reaction_resets_each_turn = {
    val c = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)
    val t2 = pStartTurn(TEST_CONFIG, c, Unarmored, false, 0, false, false)
    assert(
      t1.reactionAvailable == false
      and t2.reactionAvailable == true
    )
  }
}
