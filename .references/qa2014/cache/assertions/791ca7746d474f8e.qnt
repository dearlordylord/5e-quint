// Source: https://rpg.stackexchange.com/q/191742
module _qa_791ca7746d474f8e {
  import dnd.* from "./dnd"

  // Do you gain the benefit of the rogue's Reliable Talent feature if the roll is replaced with Portent?
  // Portent replaces only the d20 roll; Reliable Talent still treats that replaced roll of ≤9 as 10.
  run qa_reliable_talent_applies_to_portent_roll = {
    // Setup: proficient ability check, level 5 rogue (profBonus +3), ability mod +3, DC 15
    val portentRoll = 5          // Portent die came up 5
    val abilityMod = 3
    val profBonus = proficiencyBonus(5)  // (5-1)/4 + 2 = 3
    val dc = 15
  
    // Reliable Talent: treat d20 roll of 9 or lower as 10
    val reliableTalentEffectiveRoll = intMax(portentRoll, 10)
  
    // With Reliable Talent: 10 + 3 + 3 = 16 >= 15 → success
    val withReliableTalent = checkSucceeds(reliableTalentEffectiveRoll, abilityMod, Proficient, profBonus, 0, dc)
  
    // Without Reliable Talent: 5 + 3 + 3 = 11 < 15 → failure
    val withoutReliableTalent = checkSucceeds(portentRoll, abilityMod, Proficient, profBonus, 0, dc)
  
    assert(
      // Portent die of 5 is clamped to 10 by Reliable Talent
      reliableTalentEffectiveRoll == 10
      // Applying Reliable Talent to the Portent roll turns a failure into a success
      and withReliableTalent
      and not(withoutReliableTalent)
      // The clamped Portent roll is equivalent to a natural roll of 10
      and withReliableTalent == checkSucceeds(10, abilityMod, Proficient, profBonus, 0, dc)
    )
  }
}
