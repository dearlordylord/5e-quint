// Source: https://rpg.stackexchange.com/q/169992
module _qa_53a98783a63d0f4b {
  import dnd.* from "./dnd"

  // NPC Knight ability "parry" - how often can it be used?
  run qa_parry_reaction_once_per_turn = {
    // Parry uses a reaction; PHB p.190: can't take another reaction until start of next turn.
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)           // knight uses Parry
    val t2 = pUseReaction(t1)           // try to Parry again — no-op, already spent
    val creature = freshCreature(20)
    val t3 = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false) // next turn resets it
    assert(
      t0.reactionAvailable == true    // reaction starts available
      and t1.reactionAvailable == false  // consumed after first Parry
      and t2.reactionAvailable == false  // second attempt has no effect
      and t3.reactionAvailable == true   // restored at start of next turn
    )
  }
}
