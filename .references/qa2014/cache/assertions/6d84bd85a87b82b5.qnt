// Source: https://rpg.stackexchange.com/q/82818
module _qa_6d84bd85a87b82b5 {
  import dnd.* from "./dnd"

  // Can Command Undead be used on my own undead created by Create/Animate Undead?
  run qa_command_undead_on_own_created_undead = {
    // Level 10 Wizard, INT 18: spellSaveDC = 8 + prof(4) + intMod(4) = 16
    val wizardConfig: CharConfig = {
      abilityScores: Map(Str -> 10, Dex -> 14, Con -> 12, Int_ -> 18, Wis -> 13, Cha -> 10),
      level: 10,
      size: Medium,
      speeds: Map(Walk -> 30, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
      saveProficiencies: Set(Int_, Wis),
      skillProficiencies: Set(Arcana, History),
      expertiseSkills: Set(),
      armorProficiencies: Set(LightArmor),
      hitDieType: 6,
      spellcastingAbility: Int_,
      hasSpellcasting: true,
      canRitualCast: true,
      unarmoredDefense: NoUnarmoredDefense,
      features: Set(),
    }
    val dc = spellSaveDC(wizardConfig)
    // Ghoul/Wight: Wis 6 → mod -2, not proficient in Wis saves
    val undeadWisMod = abilityModifier(6)
    // Low roll: undead fails save → Command Undead establishes control (ownership irrelevant)
    val commandSucceeds = not(saveSucceeds(5, undeadWisMod, false, 2, 0, dc))
    // High roll: undead passes save → Command Undead fails
    val commandFails = saveSucceeds(18, undeadWisMod, false, 2, 0, dc)
    assert(
      // DC is correct
      dc == 16
      // failed Wis save (5 - 2 = 3 < 16) → wizard controls even their own created undead
      and commandSucceeds
      // passed Wis save (18 - 2 = 16 >= 16) → no control granted
      and commandFails
    )
  }
}
