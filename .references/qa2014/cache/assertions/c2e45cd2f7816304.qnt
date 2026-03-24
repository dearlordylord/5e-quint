// Source: https://rpg.stackexchange.com/q/102952
module _qa_c2e45cd2f7816304 {
  import dnd.* from "./dnd"

  // Sword of Sharpness Critical Hit Resolution: maximize-vs-object and extra-4d6-vs-creature are mutually exclusive
  run qa_sword_of_sharpness_mutual_exclusivity = {
    // Nat 20 on a creature attack is a critical hit, triggering the sword's +4d6 slashing bonus
    val attackResult = resolveAttackRoll(20, 5, 15, 0)
    // Creature crit: weapon dice rolled normally (NOT maximized) + extra 4d6 as bonus dice
    // "When you attack a creature... and roll a 20" → extra 4d6 applies, maximize does NOT
    val creatureCritDmg = criticalDamage(8, 16, 3)  // 2d6 rolled=8, extra 4d6 rolled=16, STR+3
    // Object hit: weapon dice maximized (2d6 max=12), NO extra 4d6
    // "When you attack an object... maximize your weapon damage dice" → maximize applies, extra 4d6 does NOT
    val objectHitDmg = normalDamage(12, 3)           // 2d6 maximized=12, STR+3; no bonus dice
    assert(
      // Nat 20 always crits (creature target triggers the +4d6 feature)
      attackResult.isCritical and
      // Creature crit uses rolled dice + extra 4d6, no maximization: 8 + 16 + 3 = 27
      creatureCritDmg == 27 and
      // Object hit uses maximized dice, no extra 4d6: 12 + 3 = 15
      objectHitDmg == 15 and
      // The "both bonuses at once" scenario — criticalDamage(12, 16, 3) = 31 — is never valid
      // because the two features target different things (object vs creature)
      creatureCritDmg != criticalDamage(12, 16, 3) and
      objectHitDmg != criticalDamage(12, 16, 3)
    )
  }
}
