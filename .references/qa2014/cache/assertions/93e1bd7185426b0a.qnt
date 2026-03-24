// Source: https://rpg.stackexchange.com/q/200914
module _qa_93e1bd7185426b0a {
  import dnd.* from "./dnd"

  // How can a UA Mystic increase their Discipline attack bonus or save DC?
  run qa_mystic_int_asi_raises_discipline_save_dc = {
    // Mystic: Discipline Save DC = 8 + Int mod + prof bonus (same formula as spellSaveDC)
    val mysticConfig: CharConfig = {
      abilityScores: Map(Str -> 10, Dex -> 10, Con -> 10, Int_ -> 16, Wis -> 10, Cha -> 10),
      level: 5,
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
    // Int 16 -> mod +3, profBonus(5)=3 -> DC = 8+3+3 = 14
    val baseDC = spellSaveDC(mysticConfig)
    // ASI +2 on Int: 16->18, mod becomes +4 -> DC = 8+4+3 = 15
    val improvedConfig = mysticConfig.with("abilityScores", pApplyASI(mysticConfig.abilityScores, Int_, 2))
    val improvedDC = spellSaveDC(improvedConfig)
    assert(baseDC == 14 and improvedDC == 15 and improvedDC > baseDC)
  }
  
  // How can a UA Mystic increase their Discipline attack bonus or save DC?
  run qa_mystic_headband_of_intellect_raises_discipline_attack_bonus = {
    // Headband of Intellect sets Int to 19; increases Discipline attack bonus if current Int < 19
    val mysticConfig: CharConfig = {
      abilityScores: Map(Str -> 10, Dex -> 10, Con -> 10, Int_ -> 16, Wis -> 10, Cha -> 10),
      level: 5,
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
    // Int 16 -> mod +3, profBonus(5)=3 -> attack bonus = 6
    val baseBonus = spellAttackBonus(mysticConfig)
    // Headband of Intellect sets Int to 19 -> mod +4 -> attack bonus = 7
    val headbandConfig = mysticConfig.with("abilityScores", mysticConfig.abilityScores.set(Int_, 19))
    val headbandBonus = spellAttackBonus(headbandConfig)
    assert(baseBonus == 6 and headbandBonus == 7 and headbandBonus > baseBonus)
  }
  
  // How can a UA Mystic increase their Discipline attack bonus or save DC?
  run qa_mystic_profbonus_increase_raises_discipline_save_dc = {
    // Ioun Stone of Mastery raises proficiency bonus; this increases Discipline Save DC
    val mysticL4: CharConfig = {
      abilityScores: Map(Str -> 10, Dex -> 10, Con -> 10, Int_ -> 16, Wis -> 10, Cha -> 10),
      level: 4,
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
    // Level 4: profBonus=2, Int mod=+3 -> DC = 8+3+2 = 13
    // Level 5: profBonus=3, Int mod=+3 -> DC = 8+3+3 = 14
    val mysticL5 = mysticL4.with("level", 5)
    assert(
      spellSaveDC(mysticL4) == 13 and
      spellSaveDC(mysticL5) == 14 and
      spellSaveDC(mysticL5) > spellSaveDC(mysticL4)
    )
  }
}
