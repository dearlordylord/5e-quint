// Source: https://rpg.stackexchange.com/q/176881
module _qa_7c7478b4225e00b4 {
  import dnd.* from "./dnd"

  // Would a Sentient weapon be able to save versus spells cast against it?
  run qa_sentient_weapon_save_succeeds_vs_spell_with_save = {
    // Sentient weapon: WIS 14 (mod +2), no class proficiency (it's an object)
    // Spell targets objects and lists a WIS save DC 13; roll 11 → 11+2=13 >= 13 → save succeeds
    val wisMod = abilityModifier(14)
    assert(saveSucceeds(11, wisMod, false, 0, 0, 13))
  }
  
  // Would a Sentient weapon be able to save versus spells cast against it?
  run qa_sentient_weapon_save_fails_vs_spell_with_save = {
    // Same weapon (WIS 14, mod +2); roll 10 → 10+2=12 < 13 → save fails → spell takes effect
    val wisMod = abilityModifier(14)
    assert(not(saveSucceeds(10, wisMod, false, 0, 0, 13)))
  }
  
  // Would a Sentient weapon be able to save versus spells cast against it? (Identify: no save listed)
  run qa_sentient_weapon_identify_no_save = {
    // Identify lists no saving throw; the sentient weapon has no mechanical recourse
    // Even INT 18 (mod +4) is irrelevant — caller never invokes saveSucceeds when spell lists no DC
    // Verify the ability modifier is correctly computed (weapon has real scores; they're just moot here)
    val intMod = abilityModifier(18)
    assert(intMod == 4)
  }
}
