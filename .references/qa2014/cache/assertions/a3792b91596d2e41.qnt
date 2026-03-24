// Source: https://rpg.stackexchange.com/q/152805
module _qa_a3792b91596d2e41 {
  import dnd.* from "./dnd"

  // Barbarian Rage bonus damage applies to each Strength melee attack including TWF off-hand
  run qa_rage_bonus_applies_to_each_twf_attack = {
    // STR 16 => +3 mod; Level 1-8 barbarian rage bonus = +2
    val dieRoll  = 4
    val strMod   = 3
    val rageBonus = 2
    // Main-hand: dice + STR mod + rage bonus (all three components)
    val mainHandDmg = normalDamage(dieRoll, strMod + rageBonus)
    // TWF off-hand: STR mod suppressed by TWF rule, but rage bonus still applies
    // (it is a melee weapon attack using Strength — PHB rage wording)
    val offHandDmg = pTWFOffHandDamage(dieRoll, strMod) + rageBonus
    assert(
      mainHandDmg == 9 and  // 4 + 3 + 2
      offHandDmg  == 6      // 4 + 0(strMod suppressed) + 2
    )
  }
  
  // TWF off-hand with negative STR mod: negative mod IS kept (TWF rule), rage bonus still added
  run qa_rage_bonus_twf_offhand_negative_str = {
    val dieRoll   = 3
    val strMod    = -1  // STR 8 => -1 mod
    val rageBonus = 2
    // Negative mod is NOT suppressed by TWF rule; rage bonus still added on top
    val offHandDmg = pTWFOffHandDamage(dieRoll, strMod) + rageBonus
    assert(offHandDmg == 4)  // 3 + (-1) + 2
  }
}
