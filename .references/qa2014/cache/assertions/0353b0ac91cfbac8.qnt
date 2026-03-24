// Source: https://rpg.stackexchange.com/q/65740
module _qa_0353b0ac91cfbac8 {
  import dnd.* from "./dnd"

  // Catching poisoned arrows: Deflect Missiles applies to total attack damage (piercing + poison), not piercing alone
  run qa_deflect_missiles_reduces_total_including_poison = {
    // Yuan-ti shortbow: 4 (1d6+1) piercing + 7 (2d6) poison = 11 total
    val piercingDamage = normalDamage(3, 1)  // 4
    val poisonDamage   = normalDamage(7, 0)  // 7
    val totalDamage    = piercingDamage + poisonDamage  // 11
    // Deflect roll covering only piercing (4) is insufficient to catch — still 7 remaining
    val remainingIfOnlyPiercingCovered = intMax(0, totalDamage - 4)
    // Deflect roll covering full total (11) reduces to 0 — arrow caught
    val remainingIfTotalCovered = intMax(0, totalDamage - 11)
    assert(remainingIfOnlyPiercingCovered == 7 and remainingIfTotalCovered == 0)
  }
  
  // Catching poisoned arrows: when total damage reduced to 0 by deflect, creature takes no damage at all
  run qa_deflect_missiles_catch_prevents_all_damage = {
    val creature = freshCreature(30)
    // Yuan-ti shortbow: 4 piercing + 7 poison = 11 total
    val totalDamage = normalDamage(3, 1) + normalDamage(7, 0)  // 11
    // Deflect Missiles: 1d10(6) + DEX mod(3) + monk level(5) = 14 — exceeds 11
    val deflectReduction = normalDamage(6, 3) + 5  // 14
    val remainingDamage  = intMax(0, totalDamage - deflectReduction)  // 0 → caught
    // Caught: apply 0 damage, HP unchanged
    val s1 = pTakeDamage(creature, remainingDamage, Bludgeoning, Set(), Set(), Set(), false)
    assert(remainingDamage == 0 and s1.hp == 30)
  }
  
  // Catching poisoned arrows: if deflect only neutralises piercing, poison damage still reaches the creature
  run qa_deflect_missiles_uncaught_arrow_deals_remaining_damage = {
    val creature = freshCreature(30)
    val piercingDamage = normalDamage(3, 1)  // 4
    val poisonDamage   = normalDamage(7, 0)  // 7
    val totalDamage    = piercingDamage + poisonDamage  // 11
    // Deflect roll of 4 exactly cancels piercing; poison still gets through
    val deflectReduction = 4
    val remainingDamage  = intMax(0, totalDamage - deflectReduction)  // 7
    // Arrow not caught; apply remaining as single pool (per RAW, total reduced first)
    val s1 = pTakeDamage(creature, remainingDamage, Poison, Set(), Set(), Set(), false)
    assert(remainingDamage == 7 and s1.hp == 23)
  }
}
