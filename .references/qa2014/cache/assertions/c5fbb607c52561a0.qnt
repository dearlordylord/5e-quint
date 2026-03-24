// Source: https://rpg.stackexchange.com/q/105886
module _qa_c5fbb607c52561a0 {
  import dnd.* from "./dnd"

  // Is there any way to influence the save DC for magic items?
  run qa_magic_item_dc_is_fixed = {
    // Iron flask (DC 17) and Mace of Disruption (DC 15) have fixed DCs not derived
    // from any wielder stat. No RAW mechanism raises or lowers them.
    val ironFlaskDC = 17
    val maceOfDisruptionDC = 15
  
    // Wielder's spell save DC (TEST_CONFIG: Wis 13, level 5 → 8 + 1 + 3 = 12)
    // is entirely independent of the magic item's fixed DC.
    val wielderSpellSaveDC = spellSaveDC(TEST_CONFIG)
  
    // Target (Wis 14, not proficient) rolls 15 against iron flask — DC is always 17
    val targetWisMod = abilityModifier(14)
    val roll = 15
    val saveResult = saveSucceeds(roll, targetWisMod, false, proficiencyBonus(5), 0, ironFlaskDC)
  
    assert(
      ironFlaskDC == 17 and
      maceOfDisruptionDC == 15 and
      wielderSpellSaveDC != ironFlaskDC and      // caster's own DC doesn't equal/affect item DC
      wielderSpellSaveDC != maceOfDisruptionDC and
      saveResult == (roll + targetWisMod >= ironFlaskDC)  // save resolves against literal 17
    )
  }
}
