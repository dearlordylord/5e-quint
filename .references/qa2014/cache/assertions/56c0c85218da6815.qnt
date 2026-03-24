// Source: https://rpg.stackexchange.com/q/111735
module _qa_56c0c85218da6815 {
  import dnd.* from "./dnd"

  // Can you use a weapon as an improvised version of another weapon?
  run qa_improvised_weapon_similar_grants_proficiency = {
    // PHB p.147: DM may allow a proficient character to use a similar object as that weapon and apply proficiency bonus
    // Mechanical claim: similar-weapon ruling turns a miss into a hit by adding proficiency bonus to attack roll
    val profBonus = proficiencyBonus(5)  // level 5 → +3
    val strMod = abilityModifier(14)     // STR 14 → +2
    val roll = 10
    val targetAC = 15
    // No similar-weapon ruling → treat as improvised, no proficiency: 10 + 2 = 12 < 15, miss
    val asImprovised = resolveAttackRoll(roll, strMod, targetAC, 0)
    // DM grants similar-weapon ruling → proficiency applies: 10 + 2 + 3 = 15 >= 15, hit
    val asSimilarWeapon = resolveAttackRoll(roll, strMod + profBonus, targetAC, 0)
    assert(not(asImprovised.hits) and asSimilarWeapon.hits)
  }
}
