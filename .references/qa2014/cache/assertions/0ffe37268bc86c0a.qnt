// Source: https://rpg.stackexchange.com/q/184287
module _qa_0ffe37268bc86c0a {
  import dnd.* from "./dnd"

  // Can the use of the Crusher feat enable a Sling to force 5 feet of movement on a hit target?
  // Accepted answer: yes — feat text says "attack that deals bludgeoning damage", no melee restriction.
  run qa_crusher_ranged_bludgeoning_triggers = {
    // Sling (ranged, bludgeoning) hits a Medium target — attacker is also Medium.
    // Crusher conditions: (1) attack hits, (2) damage type Bludgeoning, (3) target ≤ one size larger.
    // No melee restriction exists in the feat text, so a ranged hit satisfies all three.
    val attackerSize = Medium
    val targetSize   = Medium
    val damageType   = Bludgeoning
    // d20=15, +4 attack bonus, AC 13, no cover → hits
    val attackResult = resolveAttackRoll(15, 4, 13, 0)
    val allCrusherConditionsMet =
      attackResult.hits
      and (damageType == Bludgeoning)
      and pWithinOneSize(attackerSize, targetSize)
    assert(allCrusherConditionsMet)
  }
  
  // Crusher size gate: target more than one size larger blocks the feat regardless of attack type.
  run qa_crusher_target_too_large_blocked = {
    // Medium attacker vs Huge target (two sizes larger) — Crusher cannot apply.
    val attackerSize = Medium
    val targetSize   = Huge
    val damageType   = Bludgeoning
    val attackResult = resolveAttackRoll(18, 4, 13, 0)
    // Attack hits and deals bludgeoning, but size check fails → Crusher does not trigger.
    val sizeValid = pWithinOneSize(attackerSize, targetSize)
    assert(attackResult.hits and (damageType == Bludgeoning) and not(sizeValid))
  }
  
  // Crusher with ranged attack: target one size larger (Large) is still valid per feat.
  run qa_crusher_ranged_target_one_size_larger_valid = {
    // Medium attacker with sling vs Large target — within the one-size allowance.
    val attackerSize = Medium
    val targetSize   = Large
    val damageType   = Bludgeoning
    val attackResult = resolveAttackRoll(12, 5, 14, 0)
    val allCrusherConditionsMet =
      attackResult.hits
      and (damageType == Bludgeoning)
      and pWithinOneSize(attackerSize, targetSize)
    assert(allCrusherConditionsMet)
  }
}
