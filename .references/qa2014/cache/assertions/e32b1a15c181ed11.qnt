// Source: https://rpg.stackexchange.com/q/176699
module _qa_e32b1a15c181ed11 {
  import dnd.* from "./dnd"

  // Psionic Sorcerer: Psychic Strike with ongoing spells (witch bolt continues triggering Psychic Strike each turn)
  run qa_psychic_strike_ongoing_spell = {
    val target = freshCreature(50)
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(1, 2))
      .with("slotsCurrent", EMPTY_SLOTS.set(1, 2))
  
    // Turn 1: cast witch bolt — expend 1 level-1 slot, start concentration,
    //         deal 8 lightning (spell) + 5 psychic (Psychic Strike, once this turn)
    val ss1 = pExpendSlot(ss, 1)
    val ss2 = pStartConcentration(ss1, "witch_bolt")
    val afterT1SpellDmg  = pTakeDamage(target,           8, Lightning, Set(), Set(), Set(), false)
    val afterT1Psychic   = pTakeDamage(afterT1SpellDmg,  5, Psychic,   Set(), Set(), Set(), false)
  
    // Turn 2: witch bolt ongoing (no new slot expended, still concentrating),
    //         deal 7 lightning + 3 psychic (Psychic Strike resets each turn)
    val afterT2SpellDmg  = pTakeDamage(afterT1Psychic,   7, Lightning, Set(), Set(), Set(), false)
    val afterT2Psychic   = pTakeDamage(afterT2SpellDmg,  3, Psychic,   Set(), Set(), Set(), false)
  
    assert(
      // Slot expended exactly once for the ongoing spell
      ss1.slotsCurrent.get(1) == 1
      // Still concentrating on witch bolt during turn 2 — slot was spent, spell is live
      and isConcentrating(ss2)
      // Turn 1: target took spell damage + Psychic Strike bonus
      and afterT1Psychic.hp == 50 - 8 - 5
      // Turn 2: ongoing spell damage again + Psychic Strike bonus again (once per TURN resets)
      and afterT2Psychic.hp == 50 - 8 - 5 - 7 - 3
    )
  }
}
