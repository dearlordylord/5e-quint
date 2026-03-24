// Source: https://rpg.stackexchange.com/q/177723
module _qa_5c092bc91e81a265 {
  import dnd.* from "./dnd"

  // Can reaction spells be cast without any trigger?
  run qa_reaction_spell_requires_trigger = {
      // RAW: reaction spells (e.g. Shield) can only be cast in response to their
      // specific trigger; mechanically the reaction slot is consumed and only one
      // is available per turn — a second reaction spell is blocked.
      val t0 = FRESH_TURN  // reactionAvailable starts true
      val t1 = pUseReaction(t0)        // spend reaction casting reaction spell (trigger occurred)
      val t2 = pUseReaction(t1)        // attempt second reaction spell — no-op, already spent
      val creature = freshCreature(20)
      // reaction resets at the start of the next turn (not surprised)
      val t3 = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
      assert(
          t0.reactionAvailable == true      // reaction available before use
          and t1.reactionAvailable == false // consumed by reaction spell
          and t2.reactionAvailable == false // idempotent: can't cast a second reaction spell
          and t2 == t1                      // state unchanged by second attempt
          and t3.reactionAvailable == true  // reaction is restored at start of next turn
      )
  }
}
