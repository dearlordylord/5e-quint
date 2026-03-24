// Source: https://rpg.stackexchange.com/q/78885
module _qa_e6807a9ce23218ec {
  import dnd.* from "./dnd"

  // Magic Initiate: cantrip spell attack bonus = abilityMod + profBonus(total character level)
  run qa_magic_initiate_spell_attack_bonus_uses_character_level = {
    // Level 5 Rogue with Magic Initiate (Sorcerer), CHA 14 (+2 mod)
    // proficiencyBonus(5) = (5-1)/4 + 2 = 3; abilityModifier(14) = 2 → total = 5
    val rogueConfig = TEST_CONFIG
      .with("level", 5)
      .with("spellcastingAbility", Cha)
      .with("abilityScores", Map(Str -> 14, Dex -> 12, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 14))
    all {
      // spell attack bonus uses total character level, not caster/class level
      assert(proficiencyBonus(5) == 3),
      assert(abilityModifier(14) == 2),
      assert(spellAttackBonus(rogueConfig) == 5),
    }
  }
}
