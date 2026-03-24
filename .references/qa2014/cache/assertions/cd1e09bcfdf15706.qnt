// Source: https://rpg.stackexchange.com/q/216138
module _qa_cd1e09bcfdf15706 {
  import dnd.* from "./dnd"

  // Can a swarm of insects throw a magic stone? — core mechanic: Magic Stone ranged spell attack roll
  run qa_magic_stone_ranged_spell_attack = {
    // Magic Stone: a creature makes a ranged spell attack with the pebble (treated as spell attack bonus)
    // Artificer level 2: INT-based spellcasting. Assume INT 16 (+3), level 2 => profBonus 2 => attackBonus 5
    val attackBonus = 5
    val targetAC = 13
    // Normal hit (not nat20, not nat1): roll 9 + 5 = 14 >= 13 AC
    val normalHit = resolveAttackRoll(9, attackBonus, targetAC, coverBonus(NoCover))
    // Miss: roll 7 + 5 = 12 < 13 AC
    val normalMiss = resolveAttackRoll(7, attackBonus, targetAC, coverBonus(NoCover))
    // Nat 20 always crits
    val crit = resolveAttackRoll(20, attackBonus, targetAC, coverBonus(NoCover))
    // Nat 1 always misses
    val nat1 = resolveAttackRoll(1, attackBonus, targetAC, coverBonus(NoCover))
    assert(
      // hit on sufficient roll
      normalHit.hits == true and normalHit.isCritical == false
      // miss on insufficient roll
      and normalMiss.hits == false and normalMiss.isCritical == false
      // nat20 crits regardless
      and crit.hits == true and crit.isCritical == true
      // nat1 always misses
      and nat1.hits == false and nat1.isCritical == false
    )
  }
}
