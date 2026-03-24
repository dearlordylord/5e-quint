// Source: https://rpg.stackexchange.com/q/59865
module _qa_d0e05dc7eb57d31a {
  import dnd.* from "./dnd"

  // Are there specific skills required to tame mounts? - Animal Handling maps to Wisdom
  run qa_animal_handling_uses_wisdom = {
    assert(skillAbility(AnimalHandling) == Wis)
  }
  
  // Are there specific skills required to tame mounts? - proficiency in Animal Handling beats taming DC
  run qa_animal_handling_proficiency_beats_dc = {
    // Wis 14 → mod +2; level 5 → prof +3; roll 11 → 11+2+3=16 >= DC 15
    val wisMod = abilityModifier(14)
    val prof = proficiencyBonus(5)
    assert(checkSucceeds(11, wisMod, Proficient, prof, 0, 15))
  }
  
  // Are there specific skills required to tame mounts? - without proficiency, same DC is harder
  run qa_animal_handling_no_proficiency_fails_dc = {
    // Wis 14 → mod +2; no prof; roll 11 → 11+2=13 < DC 15
    val wisMod = abilityModifier(14)
    val prof = proficiencyBonus(5)
    assert(not(checkSucceeds(11, wisMod, NoneProf, prof, 0, 15)))
  }
  
  // Are there specific skills required to tame mounts? - Animal Friendship: beast with low Wis fails save
  run qa_animal_friendship_beast_fails_wis_save = {
    // Level 3 caster, Wis 16 (mod +3), prof +2 → spell DC = 8+3+2 = 13
    val casterWisMod = abilityModifier(16)
    val casterProf   = proficiencyBonus(3)
    val spellDc      = 8 + casterWisMod + casterProf
    // Beast: Wis 8 (mod -1), not proficient; roll 10 → 10+(-1)=9 < 13 → fails
    val beastWisMod  = abilityModifier(8)
    assert(not(saveSucceeds(10, beastWisMod, false, 2, 0, spellDc)))
  }
  
  // Are there specific skills required to tame mounts? - Animal Friendship: beast with high Wis can resist
  run qa_animal_friendship_beast_high_wis_succeeds_save = {
    // Same caster DC = 13; beast Wis 18 (mod +4), not proficient; roll 10 → 10+4=14 >= 13 → succeeds
    val casterWisMod = abilityModifier(16)
    val casterProf   = proficiencyBonus(3)
    val spellDc      = 8 + casterWisMod + casterProf
    val beastWisMod  = abilityModifier(18)
    assert(saveSucceeds(10, beastWisMod, false, 2, 0, spellDc))
  }
  
  // Are there specific skills required to tame mounts? - passive Animal Handling with proficiency
  run qa_passive_animal_handling_proficient = {
    // Wis 13 (mod +1), level 5 prof +3, proficient, no adv/disadv → passive = 10+1+3 = 14
    val wisMod = abilityModifier(13)
    val prof   = proficiencyBonus(5)
    val passive = passiveCheck(wisMod, Proficient, prof, false, false)
    assert(passive == 14)
  }
}
