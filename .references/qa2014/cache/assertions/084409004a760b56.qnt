// Source: https://rpg.stackexchange.com/q/58994
module _qa_084409004a760b56 {
  import dnd.* from "./dnd"

  // Is a Shillelagh attack a spell attack or a regular attack?
  run qa_shillelagh_is_normal_melee_attack = {
    // Shillelagh substitutes the spellcasting modifier as the attack/damage bonus,
    // but the weapon still makes a normal melee attack resolved via resolveAttackRoll.
    // TEST_CONFIG: WIS 13 (mod +1), level 5 (prof +3) → spellcastingBonus = +4
    val shillelaghBonus = spellcastingBonus(TEST_CONFIG)
    // Normal melee hit: roll + spellcasting bonus >= AC (standard weapon attack rule)
    val hitResult  = resolveAttackRoll(13, shillelaghBonus, 17, 0)  // 13+4=17 >= 17 → hits
    val missResult = resolveAttackRoll(12, shillelaghBonus, 17, 0)  // 12+4=16 < 17  → misses
    // Nat 20 auto-crits and nat 1 auto-misses: same rules as any melee weapon attack
    val critResult   = resolveAttackRoll(20, shillelaghBonus, 30, 0)
    val fumbleResult = resolveAttackRoll(1,  shillelaghBonus,  5, 0)
    assert(
      hitResult.hits    and not(hitResult.isCritical)    and
      not(missResult.hits)                               and
      critResult.hits   and critResult.isCritical        and
      not(fumbleResult.hits)
    )
  }
}
