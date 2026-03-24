// Source: https://rpg.stackexchange.com/q/206420
module _qa_8512f7b06c8ba1af {
  import dnd.* from "./dnd"

  // How would D&D 5e spellcasters investigate an anonymous attack? — spell save DC for a level-5 divine investigator (WIS 18, for Zone of Truth / Scrying / Detect Thoughts)
  run qa_investigator_spell_save_dc = {
    val investigatorConfig = TEST_CONFIG
      .with("abilityScores", Map(Str -> 10, Dex -> 10, Con -> 10, Int_ -> 10, Wis -> 18, Cha -> 10))
      .with("level", 5)
      .with("spellcastingAbility", Wis)
    // proficiencyBonus(5)=3, abilityModifier(18)=4 → DC = 8+4+3 = 15
    assert(spellSaveDC(investigatorConfig) == 15)
  }
  
  // How would D&D 5e spellcasters investigate an anonymous attack? — Zone of Truth: CHA save fails for a suspect with low Charisma
  run qa_zone_of_truth_cha_save_fails = {
    val suspectChaMod = abilityModifier(8)   // score 8 → mod -1
    val casterDC = 15
    // roll 6: 6 + (-1) = 5 < 15 → save fails, subject is compelled
    assert(not(saveSucceeds(6, suspectChaMod, false, 3, 0, casterDC)))
  }
  
  // How would D&D 5e spellcasters investigate an anonymous attack? — Zone of Truth: CHA save passes for a suspect with high Charisma and proficiency
  run qa_zone_of_truth_cha_save_passes = {
    val suspectChaMod = abilityModifier(14)  // score 14 → mod +2
    val casterDC = 15
    // roll 12: 12 + 2 + 3 (prof) = 17 >= 15 → save succeeds, not compelled
    assert(saveSucceeds(12, suspectChaMod, true, 3, 0, casterDC))
  }
  
  // How would D&D 5e spellcasters investigate an anonymous attack? — Scrying: WIS save fails for an unsuspecting target, spell takes hold
  run qa_scrying_wis_save_fails = {
    val targetWisMod = abilityModifier(12)   // score 12 → mod +1
    val casterDC = 15
    // roll 5: 5 + 1 = 6 < 15 → save fails, caster can observe target
    assert(not(saveSucceeds(5, targetWisMod, false, 3, 0, casterDC)))
  }
  
  // How would D&D 5e spellcasters investigate an anonymous attack? — passive Perception of a nearby witness (plant/animal proxy: WIS 14, Perception proficiency)
  run qa_witness_passive_perception = {
    val wisMod    = abilityModifier(14)    // = 2
    val profBonus = proficiencyBonus(5)    // = 3
    // passive = 10 + 2 + 3 = 15
    assert(passiveCheck(wisMod, Proficient, profBonus, false, false) == 15)
  }
}
