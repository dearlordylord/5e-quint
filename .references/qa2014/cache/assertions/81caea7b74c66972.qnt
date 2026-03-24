// Source: https://rpg.stackexchange.com/q/135276
module _qa_81caea7b74c66972 {
  import dnd.* from "./dnd"

  // Can you cast a Subtle Spell while under the effects of Hold Person?
  run qa_paralyzed_cannot_cast_spell = {
    val base = freshCreature(20)
    val paralyzed = pApplyCondition(base, CParalyzed)
    // Attempt to use action (spell cast) and bonus action while paralyzed
    val afterAction = pUseAction(FRESH_TURN, paralyzed, ACastSpell)
    val afterBonus = pUseBonusAction(FRESH_TURN, paralyzed)
    assert(and {
      // Paralyzed implies incapacitated — the root cause
      isIncapacitated(paralyzed),
      // Incapacitated blocks all actions, so actionUsed stays false
      not(afterAction.actionUsed),
      // Bonus actions are also blocked when you can't take actions
      not(afterBonus.bonusActionUsed),
    })
  }
}
