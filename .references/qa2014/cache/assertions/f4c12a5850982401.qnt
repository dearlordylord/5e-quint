// Source: https://rpg.stackexchange.com/q/164683
module _qa_f4c12a5850982401 {
  import dnd.* from "./dnd"

  // How to increase monk's chance to land a Stunning Strike? — higher Wisdom score increases Stunning Strike DC
  run qa_stunning_strike_wis_increases_dc = {
    // TEST_CONFIG: WIS 13 → mod +1, level 5 → profBonus 3; DC = 8+1+3 = 12
    val baseDC = spellSaveDC(TEST_CONFIG)
    // WIS 20 → mod +5; DC = 8+5+3 = 16
    val highWisConfig = TEST_CONFIG.with("abilityScores", TEST_CONFIG.abilityScores.set(Wis, 20))
    val highWisDC = spellSaveDC(highWisConfig)
    assert(highWisDC > baseDC)
  }
  
  // How to increase monk's chance to land a Stunning Strike? — higher proficiency bonus (higher level) increases DC
  run qa_stunning_strike_proficiency_increases_dc = {
    // level 5 → profBonus 3; DC = 8+1+3 = 12
    val lvl5DC = spellSaveDC(TEST_CONFIG)
    // level 17 → profBonus 6; DC = 8+1+6 = 15
    val lvl17Config = TEST_CONFIG.with("level", 17)
    val lvl17DC = spellSaveDC(lvl17Config)
    assert(lvl17DC > lvl5DC)
  }
  
  // How to increase monk's chance to land a Stunning Strike? — target exhaustion level 3 grants disadvantage on CON saves
  run qa_stunning_strike_exhaustion3_con_disadvantage = {
    val target = freshCreature(30).with("exhaustion", 3)
    val mods = pSaveModifiers(target, Con)
    assert(mods.hasDisadvantage)
  }
  
  // How to increase monk's chance to land a Stunning Strike? — Bane-style penalty (miscBonus -2) turns a passing CON save into a failure
  run qa_stunning_strike_bane_penalty_fails_save = {
    // roll 13 + conMod 1 = 14 >= DC 14 → passes without Bane
    val withoutBane = saveSucceeds(13, 1, false, 0, 0, 14)
    // roll 13 + conMod 1 - 2 (Bane) = 12 < 14 → fails with Bane
    val withBane = saveSucceeds(13, 1, false, 0, -2, 14)
    assert(withoutBane and not(withBane))
  }
}
