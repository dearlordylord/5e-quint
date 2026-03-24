// Source: https://rpg.stackexchange.com/q/206952
module _qa_9cc5c1a8ddb892fb {
  import dnd.* from "./dnd"

  // Does the penalty to passive Perception for a fast travel pace stack with disadvantage from light obscurity?
  run qa_fast_pace_and_dim_light_passive_perception_stack = {
    // TEST_CONFIG: Wis 13 -> mod +1; level 5 -> profBonus +3; Perception is proficient
    val wisMod       = abilityModifier(13)            // +1
    val prof         = proficiencyBonus(5)            // +3
  
    // Dim light -> LightlyObscured -> disadvantage on sight-based Perception checks
    val obs          = pEffectiveObscurement(Dim, false)   // LightlyObscured
    val hasDisadv    = pPerceptionDisadvantage(obs)         // true
  
    // Baseline passive Perception (no penalties)
    val passiveBase  = passiveCheck(wisMod, Proficient, prof, false, false)
    // = 10 + 1 + 3 = 14
  
    // Passive Perception with disadvantage from dim light (-5)
    val passiveDisadv = passiveCheck(wisMod, Proficient, prof, false, hasDisadv)
    // = 10 + 1 + 3 - 5 = 9
  
    // Fast pace is a flat -5 penalty, RAW does NOT say it is disadvantage, so it stacks
    val travelPenalty = pTravelPerceptionPenalty(PaceFast)
    // = -5
  
    // Accepted answer: both penalties stack -> total passive Perception = baseline - 10
    val totalPassive  = passiveDisadv + travelPenalty
    // = 9 + (-5) = 4
  
    assert(
      obs == LightlyObscured
      and hasDisadv == true
      and travelPenalty == -5
      // disadvantage alone costs exactly 5 points
      and passiveDisadv == passiveBase - 5
      // flat fast-pace penalty stacks on top for a combined -10
      and totalPassive == passiveBase - 10
    )
  }
}
