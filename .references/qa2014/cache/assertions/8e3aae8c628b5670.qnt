// Source: https://rpg.stackexchange.com/q/169379
module _qa_8e3aae8c628b5670 {
  import dnd.* from "./dnd"

  // Does Dimension Door up, then Feather Fall work as I expect?
  // Dimension Door costs an action (not a reaction) — reaction remains available for Feather Fall
  run qa_dimension_door_preserves_reaction_for_feather_fall = {
    val creature = freshCreature(30)
    val t0 = FRESH_TURN
    // Cast Dimension Door as an action
    val t1 = pUseAction(t0, creature, ACastSpell)
    // Reaction still available; use it for Feather Fall
    val t2 = pUseReaction(t1)
    assert(t1.reactionAvailable and not(t2.reactionAvailable))
  }
  
  // Does Dimension Door up, then Feather Fall work as I expect?
  // Without Feather Fall a 500' fall hits the 20d6 cap (same as any fall >= 200')
  run qa_fall_500ft_capped_at_20d6 = {
    val dice500 = pFallingDamageDice(500)
    val dice200 = pFallingDamageDice(200)
    assert(dice500 == 20 and dice200 == 20)
  }
  
  // Does Dimension Door up, then Feather Fall work as I expect?
  // Without Feather Fall, any fall damage leaves the creature prone
  run qa_fall_without_feather_fall_causes_prone = {
    val creature = freshCreature(100)
    // Minimum damage (1) from a fall still triggers prone
    val s1 = pApplyFall(creature, 1, Set(), Set(), Set())
    assert(s1.prone)
  }
}
