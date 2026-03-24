// Source: https://rpg.stackexchange.com/q/138088
module _qa_20dda7fcf3b6f1b0 {
  import dnd.* from "./dnd"

  // Can I defer Sneak Attack until after I've made all my Attack Rolls?
  run qa_sneak_attack_no_deferral = {
    // Attack 1: roll 13 + 7 = 20, hits AC 16, not a critical
    val attack1 = resolveAttackRoll(13, 7, 16, 0)
    // Attack 2 (TWF bonus action): nat 20, critical hit — SA already spent
    val attack2 = resolveAttackRoll(20, 7, 16, 0)
  
    // Pre-resolved SA dice (e.g. 4d6 = 14) and the extra crit dice roll (= 11)
    val sneak_dice_roll    = 14
    val bonus_crit_roll    = 11
  
    // Correct per ruling: SA committed to attack 1 at normal damage
    val committed_damage   = normalDamage(sneak_dice_roll, 0)          // 14
    // Impossible retroactive application: SA on attack 2's crit would yield more
    val deferred_crit_dmg  = criticalDamage(sneak_dice_roll, bonus_crit_roll, 0)  // 25
  
    val target = freshCreature(50)
    // SA applied immediately to the first hit — the ruling mandates this
    val target_after = pTakeDamage(target, committed_damage, Piercing, Set(), Set(), Set(), false)
  
    assert(
      // Attack 1 hits but is not a critical
      attack1.hits == true and attack1.isCritical == false
      // Attack 2 is a critical hit (SA already spent — cannot retroactively redirect)
      and attack2.hits == true and attack2.isCritical == true
      // Normal SA damage committed to attack 1
      and committed_damage == 14
      // What a deferred crit application *would* have yielded (but is not allowed)
      and deferred_crit_dmg == 25
      // Target took the committed normal SA damage, not the larger deferred crit amount
      and target_after.hp == 50 - committed_damage
      and target_after.hp != 50 - deferred_crit_dmg
    )
  }
}
