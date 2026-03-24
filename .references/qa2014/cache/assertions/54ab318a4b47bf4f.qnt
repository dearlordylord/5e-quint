// Source: https://rpg.stackexchange.com/q/50336
module _qa_54ab318a4b47bf4f {
  import dnd.* from "./dnd"

  // Dualwielding non-proficient Pact Weapon: are you proficient with the off-hand?
  run qa_pact_weapon_offhand_no_proficiency = {
    // Pact of the Blade proficiency applies only to the specific pact weapon itself,
    // not to other weapons of the same type wielded in the off-hand.
    val level = 5
    val dexMod = abilityModifier(12) // DEX 12 → +1
    val pb = proficiencyBonus(level)  // level 5 → +3
  
    // Off-hand attack with a regular (non-pact) shortsword of the same type: NoneProf
    val nonPactBonus = dexMod + profMultiplier(NoneProf, pb) // 1 + 0 = 1
    val nonPactAttack = resolveAttackRoll(15, nonPactBonus, 17, 0)
  
    // Off-hand attack with the actual pact weapon (light weapon, legal for TWF): Proficient
    val pactBonus = dexMod + profMultiplier(Proficient, pb) // 1 + 3 = 4
    val pactAttack = resolveAttackRoll(15, pactBonus, 17, 0)
  
    assert(
      // Non-pact off-hand misses AC 17: 15 + 1 = 16 < 17
      nonPactAttack.hits == false
      // Pact weapon in off-hand hits AC 17: 15 + 4 = 19 >= 17
      and pactAttack.hits == true
      // Proficiency bonus for a non-pact weapon is zero
      and profMultiplier(NoneProf, pb) == 0
      // Proficiency bonus for the actual pact weapon is the full proficiency bonus
      and profMultiplier(Proficient, pb) == pb
    )
  }
}
