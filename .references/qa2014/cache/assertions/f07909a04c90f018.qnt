// Source: https://rpg.stackexchange.com/q/210434
module _qa_f07909a04c90f018 {
  import dnd.* from "./dnd"

  // Giant Killer reaction attack does not grant spellcasting ability; reaction and action are separate economy slots
  run qa_giant_killer_reaction_not_spellcast = {
    // Fresh turn: reaction available, action not yet used
    val t0 = FRESH_TURN
    // Spend the reaction (Giant Killer: react to Large creature's attack)
    val t1 = pUseReaction(t0)
    // Reaction is consumed by the attack
    val reactionConsumed = not(t1.reactionAvailable)
    // But the action slot is completely untouched — no spell was cast
    val actionStillFree = not(t1.actionUsed)
    // Casting a spell requires spending the action separately
    val creature = freshCreature(20)
    val t2 = pUseAction(t1, creature, ACastSpell)
    val castingSpellConsumesAction = t2.actionUsed
    assert(reactionConsumed and actionStillFree and castingSpellConsumesAction)
  }
}
