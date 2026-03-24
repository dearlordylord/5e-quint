// Source: https://rpg.stackexchange.com/q/211471
module _qa_405bb44b9868d234 {
  import dnd.* from "./dnd"

  // Finding food on the run: Survival check uses Wisdom ability
  run qa_foraging_uses_wisdom_survival = {
    assert(skillAbility(Survival) == Wis)
  }
  
  // Finding food on the run: Survival check at DC 10 (abundant terrain) passes with proficiency
  run qa_foraging_survival_check_dc10_proficient = {
    // WIS 13 → +1 mod; level 5 → prof +3; roll 12: 12+1+3=16 >= 10
    val result = checkSucceeds(12, abilityModifier(13), Proficient, proficiencyBonus(5), 0, 10)
    assert(result)
  }
  
  // Finding food on the run: Survival check at DC 20 (very little food) fails without proficiency
  run qa_foraging_survival_check_dc20_no_prof_fails = {
    // WIS 10 → +0 mod; no proficiency; roll 14: 14+0+0=14 < 20
    val result = checkSucceeds(14, abilityModifier(10), NoneProf, proficiencyBonus(5), 0, 20)
    assert(not(result))
  }
  
  // Finding food on the run: slow pace allows special travel activities (foraging, stealth)
  run qa_slow_pace_allows_travel_activities = {
    assert(pCanStealthWhileTraveling(PaceSlow))
  }
  
  // Finding food on the run: fast pace blocks special travel activities including foraging
  run qa_fast_pace_blocks_travel_activities = {
    assert(not(pCanStealthWhileTraveling(PaceFast)))
  }
  
  // Finding food on the run: failing to find food applies one level of starvation exhaustion
  run qa_starvation_exhaustion_one_level = {
    val s = freshCreature(20)
    val s1 = pApplyStarvation(s)
    assert(s1.exhaustion == 1)
  }
  
  // Finding food on the run: starvation threshold is 3 + CON modifier days (min 1)
  run qa_starvation_threshold_con_mod = {
    // CON 14 → +2: threshold = 3+2 = 5 days; CON 8 → -1: threshold = max(3-1,1) = 2
    and {
      assert(pStarvationThreshold(abilityModifier(14)) == 5),
      assert(pStarvationThreshold(abilityModifier(8)) == 2),
      assert(pStarvationThreshold(-5) == 1),   // min 1
    }
  }
}
