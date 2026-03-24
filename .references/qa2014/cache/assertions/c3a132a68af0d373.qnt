// Source: https://rpg.stackexchange.com/q/103145
module _qa_c3a132a68af0d373 {
  import dnd.* from "./dnd"

  // Can a Bard use Prestidigitation to conjure a musical instrument trinket for their spellcasting focus?
  run qa_prestidigitation_trinket_as_focus_provides_components = {
    // Accepted answer: trinket qualifies as musical instrument focus; with it in hand
    // (hasFreeHand=true), a bard can provide V+S+M components for any bard spell.
    val creature = freshCreature(20)
    assert(pCanProvideComponents(creature, true, true, true))
  }
  
  // Can a Bard use Prestidigitation to conjure a musical instrument trinket for their spellcasting focus?
  run qa_prestidigitation_cantrip_action_bonus_spell_still_available = {
    // Accepted answer efficiency note: Prestidigitation is a cantrip; casting it as the action
    // does NOT set nonCantripActionSpellCast, so a bonus-action spell is still permitted
    // on the same turn (e.g., a 1-level spell cast as bonus action using the new trinket focus).
    val creature = freshCreature(20)
    // Simulate using action for Prestidigitation (ACastSpell; caller does NOT call
    // pMarkNonCantripActionSpell because it's a cantrip).
    val t1 = pUseAction(FRESH_TURN, creature, ACastSpell)
    assert(t1.actionUsed and canCastBonusActionSpell(t1))
  }
  
  // Can a Bard use Prestidigitation to conjure a musical instrument trinket for their spellcasting focus?
  run qa_prestidigitation_action_consumed_blocks_second_action_cast = {
    // Accepted answer: "you must use your action to cast prestidigitation, and then you
    // cannot use your action again to cast another spell" — models the every-other-round
    // inefficiency. pUseAction is idempotent when actionUsed is already true.
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, ACastSpell)   // Prestidigitation
    val t2 = pUseAction(t1, creature, ACastSpell)           // attempt second action spell
    assert(t2 == t1) // no change — action already consumed
  }
}
