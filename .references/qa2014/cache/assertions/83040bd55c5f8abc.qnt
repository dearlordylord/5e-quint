// Source: https://rpg.stackexchange.com/q/94027
module _qa_83040bd55c5f8abc {
  import dnd.* from "./dnd"

  // When does a player have to state they are making a passive check?
  // Passive check formula: 10 + abilityMod + profBonus (no roll, no declaration needed)
  run qa_passive_check_proficient_baseline = {
    // TEST_CONFIG: WIS 13 → mod +1, level 5 → profBonus +3, Perception proficient
    val wisMod = abilityModifier(13)
    val profBonus = proficiencyBonus(5)
    val result = passiveCheck(wisMod, Proficient, profBonus, false, false)
    assert(result == 14) // 10 + 1 + 3 = 14
  }
  
  // Passive check with no skill proficiency: only ability mod added, no prof
  run qa_passive_check_no_proficiency = {
    val wisMod = abilityModifier(13)
    val profBonus = proficiencyBonus(5)
    val result = passiveCheck(wisMod, NoneProf, profBonus, false, false)
    assert(result == 11) // 10 + 1 + 0 = 11
  }
  
  // Passive check with advantage (e.g. Observant feat) adds +5, no roll needed
  run qa_passive_check_advantage_adds_five = {
    val wisMod = abilityModifier(13)
    val profBonus = proficiencyBonus(5)
    val result = passiveCheck(wisMod, Proficient, profBonus, true, false)
    assert(result == 19) // 10 + 1 + 3 + 5 = 19
  }
  
  // Passive check with disadvantage subtracts 5 (e.g. Perception while dashing)
  run qa_passive_check_disadvantage_subtracts_five = {
    val wisMod = abilityModifier(13)
    val profBonus = proficiencyBonus(5)
    val result = passiveCheck(wisMod, Proficient, profBonus, false, true)
    assert(result == 9) // 10 + 1 + 3 - 5 = 9
  }
  
  // Advantage and disadvantage on passive checks cancel each other (PHB rule)
  run qa_passive_check_adv_disadv_cancel = {
    val wisMod = abilityModifier(13)
    val profBonus = proficiencyBonus(5)
    val withBoth  = passiveCheck(wisMod, Proficient, profBonus, true, true)
    val withNeither = passiveCheck(wisMod, Proficient, profBonus, false, false)
    assert(withBoth == withNeither) // both = 14
  }
  
  // Passive Perception beats hidden creature's stealth → notice without declaring active search
  run qa_passive_perception_detects_hidden_creature = {
    val wisMod = abilityModifier(13)
    val profBonus = proficiencyBonus(5)
    val passivePerception = passiveCheck(wisMod, Proficient, profBonus, false, false) // 14
    val hiddenCreatureStealth = 12 // creature's stealth check result (the DC)
    assert(passivePerception >= hiddenCreatureStealth) // detected without player declaring intent
  }
  
  // Passive Perception fails vs high stealth → creature not noticed (DM says nothing)
  run qa_passive_perception_fails_high_stealth = {
    val wisMod = abilityModifier(13)
    val profBonus = proficiencyBonus(5)
    val passivePerception = passiveCheck(wisMod, Proficient, profBonus, false, false) // 14
    val hiddenCreatureStealth = 18 // high stealth roll
    assert(passivePerception < hiddenCreatureStealth) // not detected
  }
  
  // Half-proficiency (e.g. Bard Jack of All Trades) still contributes to passive check
  run qa_passive_check_half_proficiency = {
    val wisMod = abilityModifier(13)
    val profBonus = proficiencyBonus(5) // +3, half = +1
    val result = passiveCheck(wisMod, HalfProf, profBonus, false, false)
    assert(result == 12) // 10 + 1 + 1 = 12
  }
  
  // Expertise doubles proficiency bonus on passive check (e.g. Perception rogue)
  run qa_passive_check_expertise = {
    val wisMod = abilityModifier(13)
    val profBonus = proficiencyBonus(5) // +3, expertise = +6
    val result = passiveCheck(wisMod, Expertise, profBonus, false, false)
    assert(result == 17) // 10 + 1 + 6 = 17
  }
}
