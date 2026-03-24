// Source: https://rpg.stackexchange.com/q/154748
module _qa_86f0085daad891d4 {
  import dnd.* from "./dnd"

  // Does the Giant Toad's Swallow also inflict its Bite damage?
  run qa_swallow_bite_damage_applies_on_hit = {
    // Target is already grappled (Swallow prerequisite)
    val target = freshCreature(20).with("grappled", true)
    // Swallow "makes a bite attack": d20=15, +4 attack bonus vs AC 12 → hits, not crit
    val attackResult = resolveAttackRoll(15, 4, 12, 0)
    // Bite damage 1d6+2: roll 4, modifier 2 → 6 piercing
    val damageAmount = normalDamage(4, 2)
    // If the attack hits, bite damage applies before swallow effects
    val afterDamage = if (attackResult.hits)
      pTakeDamage(target, damageAmount, Piercing, Set(), Set(), Set(), attackResult.isCritical)
    else target
    assert(
      attackResult.hits         and
      not(attackResult.isCritical) and
      damageAmount == 6         and
      afterDamage.hp == 14
    )
  }
}
