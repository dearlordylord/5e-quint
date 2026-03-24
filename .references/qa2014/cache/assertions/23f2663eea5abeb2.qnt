// Source: https://rpg.stackexchange.com/q/180328
module _qa_23f2663eea5abeb2 {
  import dnd.* from "./dnd"

  // Meld into Stone + Investiture of Stone: complete stone destruction deals 50 bludgeoning; concentration DC = max(10, 50/2) = 25
  run qa_meld_stone_destruction_concentration_dc = {
    assert(pConcentrationDC(50) == 25)
  }
  
  // Stone destroyed while melded with active Investiture: failed CON save breaks concentration (Investiture ends)
  run qa_meld_stone_destruction_breaks_investiture = {
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "investiture_of_stone")
    val ss1 = pConcentrationCheck(ss, false)
    assert(not(isConcentrating(ss1)))
  }
  
  // Stone destroyed while melded with active Investiture: passing CON save keeps concentration intact
  run qa_meld_stone_destruction_save_keeps_investiture = {
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "investiture_of_stone")
    val ss1 = pConcentrationCheck(ss, true)
    assert(isConcentrating(ss1) and ss1.concentrationSpellId == "investiture_of_stone")
  }
  
  // Investiture of Stone: concentration ends → creature is ejected and stunned until end of next turn
  run qa_investiture_ends_eject_stunned = {
    val creature = freshCreature(30)
    val s1 = pApplyCondition(creature, CStunned)
    assert(s1.stunned and s1.incapacitatedSources.contains(ISStunned) and isIncapacitated(s1))
  }
  
  // Meld into Stone partial destruction: 6d6 bludgeoning dealt; concentration DC = max(10, damage/2)
  run qa_meld_partial_destruction_damage_and_dc = {
    // 6d6 mid-roll = 21; DC = max(10, 21/2) = max(10, 10) = 10
    val creature = freshCreature(50)
    val s1 = pTakeDamage(creature, 21, Bludgeoning, Set(), Set(), Set(), false)
    val dc = pConcentrationDC(21)
    assert(s1.hp == 29 and dc == 10)
  }
  
  // Stone destroyed while concentrating on Investiture: 50 bludgeoning applied then concentration broken on failed save
  run qa_meld_stone_destruction_full_sequence = {
    val creature = freshCreature(60)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "investiture_of_stone")
    val s1 = pTakeDamage(creature, 50, Bludgeoning, Set(), Set(), Set(), false)
    val ss1 = pConcentrationCheck(ss, false)
    assert(s1.hp == 10 and not(isConcentrating(ss1)))
  }
}
