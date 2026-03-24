// Source: https://rpg.stackexchange.com/q/210970
module _qa_1d8f68625ce908d7 {
  import dnd.* from "./dnd"

  // Do Red Slaad Eggs in Spellcasters Create Green Slaadi?
  run qa_green_slaad_host_has_3rd_level_spell_slots = {
    val ss = {
      slotsMax:     Map(1 -> 4, 2 -> 3, 3 -> 2, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      slotsCurrent: Map(1 -> 4, 2 -> 3, 3 -> 2, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      pactSlotsMax: 0, pactSlotsCurrent: 0, pactSlotLevel: 0, concentrationSpellId: "",
    }
    // Host has 3rd-level slots → qualifies as green slaad host
    assert(pCanCastAtLevel(ss, 3, 3))
  }
  
  // Do Red Slaad Eggs in Spellcasters Create Green Slaadi?
  run qa_green_slaad_host_has_higher_than_3rd_level_slots = {
    val ss = {
      slotsMax:     Map(1 -> 4, 2 -> 3, 3 -> 0, 4 -> 2, 5 -> 1, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      slotsCurrent: Map(1 -> 4, 2 -> 3, 3 -> 0, 4 -> 2, 5 -> 1, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      pactSlotsMax: 0, pactSlotsCurrent: 0, pactSlotLevel: 0, concentrationSpellId: "",
    }
    // Host has 4th/5th-level slots (higher than 3rd) → still qualifies for green slaad
    assert(pCanCastAtLevel(ss, 3, 4) and pCanCastAtLevel(ss, 3, 5))
  }
  
  // Do Red Slaad Eggs in Spellcasters Create Green Slaadi?
  run qa_blue_slaad_host_only_has_1st_and_2nd_level_slots = {
    val ss = {
      slotsMax:     Map(1 -> 4, 2 -> 3, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      slotsCurrent: Map(1 -> 4, 2 -> 3, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      pactSlotsMax: 0, pactSlotsCurrent: 0, pactSlotLevel: 0, concentrationSpellId: "",
    }
    // Host only has 1st/2nd-level slots → cannot cast 3rd or higher → blue slaad (not green)
    assert(
      not(pCanCastAtLevel(ss, 3, 3)) and
      not(pCanCastAtLevel(ss, 3, 4)) and
      not(pCanCastAtLevel(ss, 3, 5))
    )
  }
  
  // Do Red Slaad Eggs in Spellcasters Create Green Slaadi?
  run qa_blue_slaad_non_spellcaster_host = {
    val ss = {
      slotsMax:     Map(1 -> 0, 2 -> 0, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      slotsCurrent: Map(1 -> 0, 2 -> 0, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      pactSlotsMax: 0, pactSlotsCurrent: 0, pactSlotLevel: 0, concentrationSpellId: "",
    }
    // Non-spellcaster host → no slots at any level → blue slaad
    assert(
      not(pCanCastAtLevel(ss, 3, 3)) and
      not(pCanCastAtLevel(ss, 3, 4)) and
      not(pCanCastAtLevel(ss, 3, 5)) and
      not(pCanCastAtLevel(ss, 3, 6)) and
      not(pCanCastAtLevel(ss, 3, 7)) and
      not(pCanCastAtLevel(ss, 3, 8)) and
      not(pCanCastAtLevel(ss, 3, 9))
    )
  }
}
