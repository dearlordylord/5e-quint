// Source: https://rpg.stackexchange.com/q/191021
module _qa_8461ede26055b925 {
  import dnd.* from "./dnd"

  // Which Ability do you use for multiclass casters sharing spells?
  run qa_multiclass_spell_uses_granting_class_ability = {
    // Artificer 5 / Sorcerer 5: Int 18 (mod +4), Cha 16 (mod +3), level 10 → profBonus +4
    val intConfig: CharConfig = {
      abilityScores: Map(Str -> 10, Dex -> 10, Con -> 10, Int_ -> 18, Wis -> 10, Cha -> 16),
      level: 10,
      size: Medium,
      speeds: Map(Walk -> 30, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
      saveProficiencies: Set(),
      skillProficiencies: Set(),
      expertiseSkills: Set(),
      armorProficiencies: Set(),
      hitDieType: 8,
      spellcastingAbility: Int_,
      hasSpellcasting: true,
      canRitualCast: false,
      unarmoredDefense: NoUnarmoredDefense,
      features: Set(),
    }
    // Same character, same spell (Catapult), but granted by Sorcerer → use Cha
    val chaConfig = intConfig.with("spellcastingAbility", Cha)
    assert(
      // Catapult granted by Artificer: Int mod +4, profBonus +4 → DC 16, attack +8
      spellSaveDC(intConfig) == 16
      and spellAttackBonus(intConfig) == 8
      // Catapult granted by Sorcerer: Cha mod +3, profBonus +4 → DC 15, attack +7
      and spellSaveDC(chaConfig) == 15
      and spellAttackBonus(chaConfig) == 7
      // Same spell, different granting class → different ability → different bonus
      and spellSaveDC(intConfig) != spellSaveDC(chaConfig)
      and spellAttackBonus(intConfig) != spellAttackBonus(chaConfig)
    )
  }
}
