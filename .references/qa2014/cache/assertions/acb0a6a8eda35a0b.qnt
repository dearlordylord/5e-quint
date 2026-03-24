// Source: https://rpg.stackexchange.com/q/171404
module _qa_acb0a6a8eda35a0b {
  import dnd.* from "./dnd"

  // Psionic spellcasting uses designated ability score: Githzerai/Neothelid/Thri-keen use Wisdom, not Intelligence
  run qa_psionic_wisdom_based_spellcasting = {
    val wisConfig = TEST_CONFIG.with("spellcastingAbility", Wis)
    val intConfig = TEST_CONFIG.with("spellcastingAbility", Int_)
    // TEST_CONFIG: Wis 13 (mod +1), Int_ 10 (mod +0), level 5 (profBonus +3)
    // Wis DC = 8+1+3=12; Int DC = 8+0+3=11 — designation determines DC, not a fixed ability
    assert(spellSaveDC(wisConfig) == 12 and spellSaveDC(intConfig) == 11)
  }
  
  // Psionic spellcasting uses designated ability score: Kalaraq/Tsucora Quori use Charisma
  run qa_psionic_charisma_based_spellcasting = {
    val chaConfig = TEST_CONFIG.with("spellcastingAbility", Cha)
    // TEST_CONFIG: Cha 8 (mod -1), level 5 (profBonus +3)
    // Cha DC = 8 + (-1) + 3 = 10
    assert(spellSaveDC(chaConfig) == 10)
  }
  
  // All three mental ability scores yield distinct DCs when each is used as psionic spellcasting ability
  run qa_psionic_all_mental_abilities_produce_distinct_dcs = {
    val wisConfig = TEST_CONFIG.with("spellcastingAbility", Wis)
    val intConfig = TEST_CONFIG.with("spellcastingAbility", Int_)
    val chaConfig = TEST_CONFIG.with("spellcastingAbility", Cha)
    // Wis 13 (+1) → DC 12; Int_ 10 (+0) → DC 11; Cha 8 (-1) → DC 10
    assert(spellSaveDC(wisConfig) == 12 and spellSaveDC(intConfig) == 11 and spellSaveDC(chaConfig) == 10
      and spellSaveDC(wisConfig) != spellSaveDC(intConfig)
      and spellSaveDC(intConfig) != spellSaveDC(chaConfig))
  }
}
