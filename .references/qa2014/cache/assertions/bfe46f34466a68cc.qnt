// Source: https://rpg.stackexchange.com/q/47850
module _qa_bfe46f34466a68cc {
  import dnd.* from "./dnd"

  // Does 5th edition have the equivalent of Taking 20? — passive score = 10 + modifier is 5e's "take 10"
  run qa_passive_score_is_take10_equivalent = {
    val wisScore = 13
    val wisMod = abilityModifier(wisScore)
    val passive = passiveCheck(wisMod, NoneProf, 3, false, false)
    assert(passive == 10 + wisMod)
  }
  
  // Does 5th edition have the equivalent of Taking 20? — passive Perception with proficiency uses full profBonus
  run qa_passive_perception_with_proficiency = {
    val wisScore = TEST_CONFIG.abilityScores.get(Wis)
    val wisMod = abilityModifier(wisScore)
    val profBonus = proficiencyBonus(TEST_CONFIG.level)
    val passive = passiveCheck(wisMod, Proficient, profBonus, false, false)
    assert(passive == 10 + wisMod + profBonus)
  }
  
  // Does 5th edition have the equivalent of Taking 20? — advantage on passive adds +5
  run qa_passive_advantage_adds_5 = {
    val wisMod = abilityModifier(TEST_CONFIG.abilityScores.get(Wis))
    val profBonus = proficiencyBonus(TEST_CONFIG.level)
    val passiveNormal = passiveCheck(wisMod, Proficient, profBonus, false, false)
    val passiveAdv    = passiveCheck(wisMod, Proficient, profBonus, true,  false)
    assert(passiveAdv == passiveNormal + 5)
  }
  
  // Does 5th edition have the equivalent of Taking 20? — disadvantage on passive subtracts 5
  run qa_passive_disadvantage_subtracts_5 = {
    val wisMod = abilityModifier(TEST_CONFIG.abilityScores.get(Wis))
    val profBonus = proficiencyBonus(TEST_CONFIG.level)
    val passiveNormal  = passiveCheck(wisMod, Proficient, profBonus, false, false)
    val passiveDisadv  = passiveCheck(wisMod, Proficient, profBonus, false, true)
    assert(passiveDisadv == passiveNormal - 5)
  }
  
  // Does 5th edition have the equivalent of Taking 20? — adv+disadv cancel, passive unchanged
  run qa_passive_adv_disadv_cancel = {
    val wisMod = abilityModifier(TEST_CONFIG.abilityScores.get(Wis))
    val profBonus = proficiencyBonus(TEST_CONFIG.level)
    val passiveNormal  = passiveCheck(wisMod, Proficient, profBonus, false, false)
    val passiveBoth    = passiveCheck(wisMod, Proficient, profBonus, true,  true)
    assert(passiveBoth == passiveNormal)
  }
}
