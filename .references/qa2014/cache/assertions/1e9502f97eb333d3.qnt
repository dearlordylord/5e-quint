// Source: https://rpg.stackexchange.com/q/123148
module _qa_1e9502f97eb333d3 {
  import dnd.* from "./dnd"

  // What happens when I attack with an unidentified magic weapon?
  // Rule: flat magic weapon bonus (+1/+2/+3) applies to attack rolls regardless of identification
  run qa_unidentified_magic_weapon_bonus_hits_where_base_misses = {
    // Without the +1: d20(10) + attackBonus(4) = 14 < AC 15 → miss
    // With +1 included: d20(10) + attackBonus(5) = 15 >= AC 15 → hit (identification irrelevant)
    val noMagic = resolveAttackRoll(10, 4, 15, 0)
    val plusOne  = resolveAttackRoll(10, 5, 15, 0)
    assert(not(noMagic.hits) and plusOne.hits and not(plusOne.isCritical))
  }
  
  // What happens when I attack with an unidentified magic weapon?
  // Rule: flat magic weapon bonus applies to damage rolls regardless of identification
  run qa_unidentified_magic_weapon_bonus_increases_damage = {
    // +1 magic weapon: modifier is strMod + magicBonus regardless of whether item was identified
    val diceRoll   = 6
    val strMod     = 3
    val magicBonus = 1
    assert(normalDamage(diceRoll, strMod + magicBonus) == normalDamage(diceRoll, strMod) + 1)
  }
  
  // What happens when I attack with an unidentified magic weapon?
  // Rule: nat20 is still a critical hit with a magic weapon, identification status irrelevant
  run qa_unidentified_magic_weapon_nat20_still_crits = {
    val result = resolveAttackRoll(20, 5, 25, 0)  // even vs AC 25 with +5 bonus
    assert(result.hits and result.isCritical)
  }
  
  // What happens when I attack with an unidentified magic weapon?
  // Rule: nat1 always misses regardless of how high the magic bonus is
  run qa_unidentified_magic_weapon_nat1_always_misses = {
    val result = resolveAttackRoll(1, 99, 5, 0)  // absurdly high bonus, low AC
    assert(not(result.hits) and not(result.isCritical))
  }
}
