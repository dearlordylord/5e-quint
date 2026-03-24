// Source: https://rpg.stackexchange.com/q/55077
module _qa_a28ebf82e24de196 {
  import dnd.* from "./dnd"

  // Are there generic enchanted implements in D&D 5e?
  // Accepted: no generic +X implement exists; specific items (Rod of the Pact Keeper, Wand of the War Mage)
  // add a flat bonus on top of the base formula: spellAttack = abilityMod + profBonus; spellDC = 8 + that.
  run qa_rod_of_pact_keeper_adds_flat_bonus_to_spell_attack_and_dc = {
    // TEST_CONFIG: Wis=13 → mod=1, level=5 → profBonus=3; spellcastingAbility=Wis
    // baseSpellAttack = 1 + 3 = 4; baseSpellDC = 8 + 4 = 12
    val base_attack = spellAttackBonus(TEST_CONFIG)
    val base_dc    = spellSaveDC(TEST_CONFIG)
    // Rod of the Pact Keeper +1: adds 1 to both spell attack and spell save DC
    val rod_bonus = 1
    assert(
      base_attack == 4 and
      base_dc     == 12 and
      base_attack + rod_bonus == 5 and
      base_dc     + rod_bonus == 13
    )
  }
  
  // Wand of the War Mage only improves spell attack bonus, NOT spell save DC
  run qa_wand_of_war_mage_only_affects_spell_attack = {
    val base_attack = spellAttackBonus(TEST_CONFIG)  // 4
    val base_dc    = spellSaveDC(TEST_CONFIG)         // 12
    val wand_bonus = 1
    // Wand of the War Mage +1 raises spell attack but leaves save DC unchanged
    assert(
      base_attack + wand_bonus == 5 and
      base_dc == 12
    )
  }
}
