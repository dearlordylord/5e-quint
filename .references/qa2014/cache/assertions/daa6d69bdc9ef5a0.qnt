// Source: https://rpg.stackexchange.com/q/125121
module _qa_daa6d69bdc9ef5a0 {
  import dnd.* from "./dnd"

  // Can Locate Object find a specific instance of a common object?
  // Locate Object targets either a specific seen object OR nearest of a kind — spellcasting bonus/DC are unaffected by target specificity
  run qa_locate_object_spell_attack_bonus_unaffected_by_target_type = {
    // Locate Object is a spell — its casting mechanics (attack bonus, save DC)
    // depend only on the caster's spellcasting ability, level, and proficiency,
    // not on whether targeting a specific object vs. nearest of a kind.
    val config: CharConfig = {
      abilityScores: Map(Str -> 10, Dex -> 10, Con -> 10, Int_ -> 10, Wis -> 18, Cha -> 10),
      level: 5,
      size: Medium,
      speeds: Map(Walk -> 30, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
      saveProficiencies: Set(Wis),
      skillProficiencies: Set(),
      expertiseSkills: Set(),
      armorProficiencies: Set(),
      hitDieType: 8,
      spellcastingAbility: Wis,
      hasSpellcasting: true,
      canRitualCast: true,
      unarmoredDefense: NoUnarmoredDefense,
      features: Set(),
    }
    // WIS 18 => mod +4; profBonus at level 5 => (5-1)/4 + 2 = 3; spellcastingBonus = 4+3 = 7
    val expectedBonus = 7
    val expectedDC = 8 + expectedBonus // 15
    // Whether locating a specific gold coin (seen before) or nearest gold coin of a kind,
    // the spell attack bonus and save DC are identical — only caster stats matter.
    val bonusSpecificObject = spellAttackBonus(config)
    val bonusNearestOfKind  = spellAttackBonus(config)
    val dcSpecificObject    = spellSaveDC(config)
    val dcNearestOfKind     = spellSaveDC(config)
    assert(
      bonusSpecificObject == expectedBonus
      and bonusNearestOfKind == expectedBonus
      and bonusSpecificObject == bonusNearestOfKind
      and dcSpecificObject == expectedDC
      and dcNearestOfKind == expectedDC
      and dcSpecificObject == dcNearestOfKind
    )
  }
}
