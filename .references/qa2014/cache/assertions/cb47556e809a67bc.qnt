// Source: https://rpg.stackexchange.com/q/142136
module _qa_cb47556e809a67bc {
  import dnd.* from "./dnd"

  // Is the official Necromancer NPC's CR calculation accurate?
  run qa_necromancer_spell_dc_and_attack_bonus = {
    val necroConfig: CharConfig = {
      abilityScores: Map(Str -> 9, Dex -> 14, Con -> 12, Int_ -> 17, Wis -> 12, Cha -> 11),
      level: 12,
      size: Medium,
      speeds: Map(Walk -> 30, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
      saveProficiencies: Set(Int_, Wis),
      skillProficiencies: Set(Arcana, History),
      expertiseSkills: Set(),
      armorProficiencies: Set(LightArmor, MediumArmor, HeavyArmor),
      hitDieType: 8,
      spellcastingAbility: Int_,
      hasSpellcasting: true,
      canRitualCast: false,
      unarmoredDefense: NoUnarmoredDefense,
      features: Set(),
    }
    // Accepted answer: DC 15 = 8 + profBonus(12→4) + intMod(17→3)
    // Spell attack +7 = profBonus(4) + intMod(3)
    // CR 13 expected attack bonus is +8; difference < 2 → no CR adjustment per DMG
    assert(
      proficiencyBonus(12) == 4
      and abilityModifier(17) == 3
      and spellSaveDC(necroConfig) == 15
      and spellAttackBonus(necroConfig) == 7
    )
  }
}
