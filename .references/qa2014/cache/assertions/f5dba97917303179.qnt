// Source: https://rpg.stackexchange.com/q/207123
module _qa_f5dba97917303179 {
  import dnd.* from "./dnd"

  // Does teleportation count as movement for the sake of One with Shadows invocation?
  run qa_one_with_shadows_bonus_action_breaks_invisibility = {
    // Casting Misty Step uses a bonus action; per accepted answer, bonus action breaks One with Shadows invisibility
    val s0 = pApplyCondition(freshCreature(20), CInvisible)
    val t0 = FRESH_TURN
    // Represent casting Misty Step: consume bonus action and mark bonus action spell
    val t1 = pMarkBonusActionSpell(pUseBonusAction(t0, s0))
    // Bonus action was used → caller removes CInvisible per the rule
    val s1 = pRemoveCondition(s0, CInvisible)
    assert(t1.bonusActionUsed and t1.bonusActionSpellCast and not(s1.invisible))
  }
  
  // Does teleportation count as movement for the sake of One with Shadows invocation?
  run qa_one_with_shadows_external_teleport_preserves_invisibility = {
    // External teleportation expends no action/bonus action/reaction; "move" means using speed, so invisibility holds
    val s0 = pApplyCondition(freshCreature(20), CInvisible)
    val t0 = FRESH_TURN
    // No turn resources consumed (externally moved by another effect, not the creature's own action)
    assert(
      s0.invisible
      and not(t0.actionUsed)
      and not(t0.bonusActionUsed)
      and t0.reactionAvailable
    )
  }
}
