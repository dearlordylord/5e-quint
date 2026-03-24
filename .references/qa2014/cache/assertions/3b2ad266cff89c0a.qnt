// Source: https://rpg.stackexchange.com/q/172185
module _qa_3b2ad266cff89c0a {
  import dnd.* from "./dnd"

  // What happens to a spell cast by a target affected by the delayed effect of the Slow spell when he saves?
  run qa_slow_spell_delayed_cast_action_consumed = {
    // Accepted answer: even after saving against Slow the delayed spell still consumes
    // the action on the next turn; no other action can be taken that turn.
    val creature = freshCreature(20)
    // Creature saved against Slow — no conditions, full turn available
    val t0 = FRESH_TURN
    // Creature spends action completing the delayed spell
    val t1 = pUseAction(t0, creature, ACastSpell)
    // Attempt to use action again for anything else (e.g. Attack) — must be a no-op
    val t2 = pUseAction(t1, creature, AAttack)
    assert(
      t1.actionUsed == true and
      t2 == t1
    )
  }
}
