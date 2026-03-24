// Source: https://rpg.stackexchange.com/q/172247
module _qa_01a2551db46208d3 {
  import dnd.* from "./dnd"

  // Do you lose concentration on a Readied spell when you use your reaction for something else?
  run qa_readied_spell_reaction_preserves_concentration = {
    // Using reaction (e.g. opportunity attack) only modifies TurnState — SpellSlotState untouched
    val ss = pStartConcentration(FRESH_SPELL_SLOTS, "firebolt_readied")
    val turn = FRESH_TURN
    val turn2 = pUseReaction(turn)
    assert(
      not(turn2.reactionAvailable) and
      isConcentrating(ss)
    )
  }
  
  // Contrast: concentration IS broken by failing a concentration save after damage
  run qa_readied_spell_conc_breaks_on_failed_save = {
    val ss = pStartConcentration(FRESH_SPELL_SLOTS, "firebolt_readied")
    val ss2 = pConcentrationCheck(ss, false)
    assert(not(isConcentrating(ss2)))
  }
  
  // Contrast: concentration IS broken when creature becomes incapacitated
  run qa_readied_spell_conc_breaks_on_incapacitation = {
    val creature = freshCreature(20)
    val ss = pStartConcentration(FRESH_SPELL_SLOTS, "firebolt_readied")
    val creature2 = pApplyCondition(creature, CStunned)
    val ss2 = pBreakConcOnStateChange(ss, creature, creature2)
    assert(not(isConcentrating(ss2)))
  }
  
  // Contrast: concentration IS broken when creature dies
  run qa_readied_spell_conc_breaks_on_death = {
    val creature = freshCreature(20)
    val ss = pStartConcentration(FRESH_SPELL_SLOTS, "firebolt_readied")
    val dead_creature = creature.with("dead", true).with("hp", 0)
    val ss2 = pBreakConcOnStateChange(ss, creature, dead_creature)
    assert(not(isConcentrating(ss2)))
  }
  
  // Contrast: concentration IS broken by active choice
  run qa_readied_spell_conc_breaks_on_active_end = {
    val ss = pStartConcentration(FRESH_SPELL_SLOTS, "firebolt_readied")
    val ss2 = pBreakConcentration(ss)
    assert(not(isConcentrating(ss2)))
  }
}
