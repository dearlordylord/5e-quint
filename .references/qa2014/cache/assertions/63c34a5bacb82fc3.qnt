// Source: https://rpg.stackexchange.com/q/99916
module _qa_63c34a5bacb82fc3 {
  import dnd.* from "./dnd"

  // How does multi-classing Sorcerer/Bard total spell slots work at lv 20/20?
  // Both are full casters; caster level at 4/1 = 5, slots follow PHB table
  run qa_multiclass_sorcerer4_bard1_caster_level_5 = {
    // Sorcerer + Bard are both full casters: fullLevels = 4 + 1 = 5
    val casterLevel = pMulticlassCasterLevel(5, 0, 0)
    val slots = pBuildSlotMap(casterLevel)
    assert(
      casterLevel == 5
      and slots.get(1) == 4
      and slots.get(2) == 3
      and slots.get(3) == 2
      and slots.get(4) == 0
      and slots.get(9) == 0
    )
  }
  
  // How does multi-classing Sorcerer/Bard total spell slots work at lv 20/20?
  // Max character level is 20; table caps there — only 1 ninth-level slot, never more
  run qa_multiclass_full_casters_cap_at_character_level_20 = {
    // Character level cannot exceed 20; two full casters at 10/10 = caster level 20
    val casterLevel = pMulticlassCasterLevel(20, 0, 0)
    assert(
      casterLevel == 20
      and pSlotsPerLevel(20, 9) == 1
      and pSlotsPerLevel(20, 7) == 2
      and pSlotsPerLevel(20, 6) == 2
    )
  }
}
