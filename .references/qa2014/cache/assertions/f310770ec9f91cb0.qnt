// Source: https://rpg.stackexchange.com/q/151067
module _qa_f310770ec9f91cb0 {
  import dnd.* from "./dnd"

  // Calculating burst/nova melee damage: +8 to hit vs AC 15 hits on a minimum roll of 7
  run qa_burst_attack_hits_on_7_with_plus8 = {
    // attacker has +8 to hit (CHA +4 + prof +3 + Improved Pact Weapon +1)
    val minHit  = resolveAttackRoll(7, 8, 15, 0)  // 7+8=15 >= 15, hits
    val oneMiss = resolveAttackRoll(6, 8, 15, 0)  // 6+8=14 < 15, misses
    assert(minHit.hits and not(minHit.isCritical) and not(oneMiss.hits))
  }
  
  // Burst damage critical formula: on a crit, damage dice are doubled but modifier is added only once
  run qa_burst_crit_doubles_dice_not_modifier = {
    // Rapier pact weapon: normalDice roll 8; Eldritch Smite 4d8 + weapon d8 = bonusDice 18
    // modifier: CHA +4 + Hexblade's Curse +3 = 7
    val normalDice = 8
    val bonusDice  = 18
    val modifier   = 7
    val critDmg    = criticalDamage(normalDice, bonusDice, modifier)
    val ifModDoubled = normalDice + bonusDice + (2 * modifier)
    assert(critDmg == normalDice + bonusDice + modifier
      and critDmg != ifModDoubled)
  }
  
  // Burst damage: nat 20 always crits and hits, feeding the highest-damage outcome
  run qa_burst_nat20_always_crits_regardless_of_ac = {
    // Even with no extra bonus the nat 20 auto-hits and crits (PHB: always hits+crits)
    val r = resolveAttackRoll(20, 8, 15, 0)
    assert(r.hits and r.isCritical)
  }
  
  // Burst damage: nat 1 always misses even with a high attack bonus
  run qa_burst_nat1_always_misses = {
    val r = resolveAttackRoll(1, 8, 15, 0)
    assert(not(r.hits) and not(r.isCritical))
  }
}
