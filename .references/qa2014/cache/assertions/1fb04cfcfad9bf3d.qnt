// Source: https://rpg.stackexchange.com/q/80151
module _qa_1fb04cfcfad9bf3d {
  import dnd.* from "./dnd"

  // Shifter Barbarian rage and Shifting combo?
  // Shift is a non-spell bonus action: using it does not set bonusActionSpellCast,
  // so it does not conflict with Rage's no-spellcasting restriction.
  run qa_shift_bonus_action_not_a_spell = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // Shift uses a bonus action but is NOT a spell — pUseBonusAction only, no pMarkBonusActionSpell
    val t1 = pUseBonusAction(t0, creature)
    assert(
      // Bonus action was consumed (Shift is active)
      t1.bonusActionUsed == true
      // Shift is not a spell: the bonus-action-spell flag is never raised
      and t1.bonusActionSpellCast == false
      // Therefore Rage's "cannot cast spells" restriction is not implicated by Shift
      and canCastNonCantripAction(t1) == true
    )
  }
}
