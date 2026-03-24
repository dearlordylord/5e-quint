// Source: https://rpg.stackexchange.com/q/112226
module _qa_383222676a9f5eba {
  import dnd.* from "./dnd"

  // Do Temporary Hit Points confer some form of protection?
  // Accepted answer: losing temp HP still counts as taking damage; concentration check is triggered on full damage amount.
  run qa_temp_hp_damage_still_triggers_concentration_check = {
    // Creature with 10 temp HP, concentrating on a spell
    val s0 = freshCreature(20).with("tempHp", 10)
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "bless")
  
    // 6 damage — fully absorbed by temp HP; actual HP pool never touched
    val dmg = 6
    val s1 = pTakeDamage(s0, dmg, Slashing, Set(), Set(), Set(), false)
  
    // Temp HP absorbed all damage; actual HP is unchanged
    val absorbedFully = s1.tempHp == 4 and s1.hp == 20
  
    // Concentration DC is based on the full damage dealt (not on HP lost from real pool)
    // max(6 / 2, 10) = max(3, 10) = 10
    val dc = pConcentrationDC(dmg)
  
    // A failed concentration save still breaks concentration despite temp HP absorption
    val ss1 = pConcentrationCheck(ss0, false)
  
    assert(
      absorbedFully
      and dc == 10
      and ss1.concentrationSpellId == ""
    )
  }
}
