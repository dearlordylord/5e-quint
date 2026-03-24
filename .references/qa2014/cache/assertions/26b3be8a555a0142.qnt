// Source: https://rpg.stackexchange.com/q/121541
module _qa_26b3be8a555a0142 {
  import dnd.* from "./dnd"

  // What reasons would a powerful wizard ally have for not sharing his entire spellbook with the party?
  // Accepted answer: "Wizards cannot copy spells of a higher level than they could cast."
  run qa_wizard_cannot_copy_spells_above_castable_level = {
    // Caster level 1: only 1st-level slots (2 slots), no 2nd-level slots
    val ss_lvl1: SpellSlotState = {
      slotsMax: pBuildSlotMap(1),
      slotsCurrent: pBuildSlotMap(1),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Caster level 3: has both 1st-level (4 slots) and 2nd-level (2 slots) slots
    val ss_lvl3: SpellSlotState = {
      slotsMax: pBuildSlotMap(3),
      slotsCurrent: pBuildSlotMap(3),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    assert(
      // A caster-level-1 wizard has no 2nd-level slots → cannot copy a 2nd-level spell
      not(pCanCastAtLevel(ss_lvl1, 2, 2))
      // But they can copy a 1st-level spell (has slots)
      and pCanCastAtLevel(ss_lvl1, 1, 1)
      // A caster-level-3 wizard has 2nd-level slots → can copy a 2nd-level spell
      and pCanCastAtLevel(ss_lvl3, 2, 2)
      // A caster-level-3 wizard still has no 3rd-level slots → cannot copy a 3rd-level spell
      and not(pCanCastAtLevel(ss_lvl3, 3, 3))
      // Sanity: a high-level wizard's book (caster 9) has 5th-level slots; low-level cannot use them
      and pCanCastAtLevel({ slotsMax: pBuildSlotMap(9), slotsCurrent: pBuildSlotMap(9),
                            pactSlotsMax: 0, pactSlotsCurrent: 0, pactSlotLevel: 0,
                            concentrationSpellId: "" }, 5, 5)
      and not(pCanCastAtLevel(ss_lvl1, 5, 5))
    )
  }
}
