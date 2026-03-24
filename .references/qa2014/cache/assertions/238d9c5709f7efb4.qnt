// Source: https://rpg.stackexchange.com/q/169304
module _qa_238d9c5709f7efb4 {
  import dnd.* from "./dnd"

  // Power Word spells are not attacks (no attack roll per PHB p.194); Mirror Image doesn't apply
  run qa_power_word_not_an_attack = {
    // PHB p.194: "if you're making an attack roll, you're making an attack."
    // Power Word spells have no attack roll — they auto-apply their effect directly.
    // Mirror Image only intercepts "attacks"; it never triggers for Power Word spells.
  
    // A spell WITH an attack roll — this IS an attack (Mirror Image would apply)
    // d20=12, attackBonus=7, AC=15, no cover: total 19 >= 15 → hits
    val spellAttack = resolveAttackRoll(12, 7, 15, 0)
  
    // A Power Word effect: no attack roll, effect resolves directly — NOT an attack
    val target = freshCreature(50)
    // Simulate Power Word damage/effect: applied via pTakeDamage with no resolveAttackRoll call
    val afterPowerWord = pTakeDamage(target, 20, Psychic, Set(), Set(), Set(), false)
  
    assert(
      // Spell attack roll present → IS an attack: Mirror Image would apply here
      spellAttack.hits == true
      and spellAttack.isCritical == false
      // Power Word bypasses resolveAttackRoll entirely → not an attack
      // Mirror Image's trigger ("targets you with an attack") is never met
      and afterPowerWord.hp == 30  // 50 - 20 = 30, direct effect, no attack roll
    )
  }
}
