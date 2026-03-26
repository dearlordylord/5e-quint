// Source: https://rpg.stackexchange.com/q/103644
module _qa_b9d09aaa8b86ed79 {
  import dnd.* from "./dnd"

  // When is physical interaction or examining an illusion acceptable?
  // Spell save DC formula: 8 + proficiency bonus + spellcasting ability modifier
  run qa_illusion_spell_save_dc_formula = {
    val dc = spellSaveDC(TEST_CONFIG)
    // TEST_CONFIG: Wis 13 → mod +1, level 5 → profBonus +3, so DC = 8+3+1 = 12
    assert(dc == 8 + proficiencyBonus(TEST_CONFIG.level) +
      abilityModifier(TEST_CONFIG.abilityScores.get(TEST_CONFIG.spellcastingAbility)))
  }
  
  // When is physical interaction or examining an illusion acceptable?
  // A creature that uses its action and succeeds on Intelligence (Investigation) vs spell save DC discerns the illusion
  run qa_illusion_investigation_check_succeeds = {
    val dc = spellSaveDC(TEST_CONFIG) // = 12
    val intMod = abilityModifier(16)  // +3
    val pb = proficiencyBonus(3)      // +2
    // d20=10: 10+3+2=15 >= 12 → discerns illusion
    assert(checkSucceeds(10, intMod, Proficient, pb, 0, dc))
  }
  
  // When is physical interaction or examining an illusion acceptable?
  // A creature with low INT and no proficiency fails the Investigation check
  run qa_illusion_investigation_check_fails = {
    val dc = spellSaveDC(TEST_CONFIG) // = 12
    val intMod = abilityModifier(8)   // -1
    val pb = proficiencyBonus(1)      // +2
    // d20=6: 6+(-1)+0=5 < 12 → does not discern; NoneProf contributes 0
    assert(not(checkSucceeds(6, intMod, NoneProf, pb, 0, dc)))
  }
  
  // When is physical interaction or examining an illusion acceptable?
  // Using an action to examine the illusion costs the creature its action for the turn
  run qa_illusion_examine_costs_action = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, ASearch)
    assert(t0.actionsRemaining > 0 and t1.actionsRemaining == 0)
  }
  
  // When is physical interaction or examining an illusion acceptable?
  // An incapacitated creature cannot use its action to examine an illusion
  run qa_illusion_incapacitated_cannot_examine = {
    val creature = freshCreature(20)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, ASearch)
    // pUseAction no-ops when creature is incapacitated
    assert(t1.actionsRemaining > 0)
  }
}
