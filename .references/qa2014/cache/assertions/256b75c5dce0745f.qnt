// Source: https://rpg.stackexchange.com/q/176844
module _qa_256b75c5dce0745f {
  import dnd.* from "./dnd"

  // What is damage you do vs. damage a creature takes? (and Dark One's Blessing)
  // Accepted: no general authorship rule; DM decides. The mechanic when triggered: temp HP = max(1, CHA mod + warlock level).
  
  // Dark One's Blessing grants minimum 1 temp HP even when CHA mod + level <= 0
  run qa_dark_ones_blessing_minimum_one_temp_hp = {
    // CHA score 8 => mod -1; warlock level 1 => intMax(1, -1 + 1) = intMax(1, 0) = 1
    val chaMod = abilityModifier(8)
    val warlockLevel = 1
    val amount = intMax(1, chaMod + warlockLevel)
    val warlock = freshCreature(20)
    val s1 = pGrantTempHp(warlock, amount, false)
    assert(s1.tempHp == 1)
  }
  
  // Dark One's Blessing temp HP granted at 0 HP does NOT restore consciousness (PHB: temp HP ≠ healing)
  run qa_dark_ones_blessing_temp_hp_no_revive = {
    // CHA score 16 => mod +3; level 3 => amount = max(1, 3+3) = 6
    val chaMod = abilityModifier(16)
    val warlockLevel = 3
    val amount = intMax(1, chaMod + warlockLevel)
    val target = freshCreature(10)
    // Reduce target to 0 HP
    val s1 = pTakeDamage(target, 10, Slashing, Set(), Set(), Set(), false)
    // Warlock triggers Dark One's Blessing on themselves (same creature for test)
    val s2 = pGrantTempHp(s1, amount, false)
    // Temp HP added but creature stays unconscious at 0 HP
    assert(s2.tempHp == 6 and s2.hp == 0 and s2.unconscious)
  }
  
  // Dark One's Blessing: positive CHA + high level yields full temp HP amount
  run qa_dark_ones_blessing_full_amount = {
    // CHA score 20 => mod +5; level 10 => amount = max(1, 5+10) = 15
    val chaMod = abilityModifier(20)
    val warlockLevel = 10
    val amount = intMax(1, chaMod + warlockLevel)
    val warlock = freshCreature(50)
    val s1 = pGrantTempHp(warlock, amount, false)
    assert(s1.tempHp == 15)
  }
}
