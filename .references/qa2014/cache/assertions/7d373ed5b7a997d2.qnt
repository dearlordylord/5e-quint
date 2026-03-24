// Source: https://rpg.stackexchange.com/q/106953
module _qa_7d373ed5b7a997d2 {
  import dnd.* from "./dnd"

  // Does damage from Armor of Agathys take place before or after a character takes damage from an attack that hits?
  run qa_aoa_triggers_before_attack_damage = {
    // Armor of Agathys: creature has 10 temp HP, 10 max HP.
    // Hit is determined first (tempHp > 0 at that moment → AoA retaliatory damage fires),
    // then the 11 melee damage is applied.
    val creature = freshCreature(10).with("tempHp", 10)
    // Snapshot at hit-determination step: temp HP still present → AoA triggers
    val aoaTriggersAtHit = creature.tempHp > 0
    // Now apply the attacker's 11 damage
    val afterDamage = pTakeDamage(creature, 11, Slashing, Set(), Set(), Set(), false)
    assert(
      aoaTriggersAtHit       and   // AoA retaliatory damage fires: tempHp > 0 when hit was confirmed
      afterDamage.tempHp == 0 and  // all 10 temp HP consumed
      afterDamage.hp == 9    and   // 1 bleed-through damage (11 - 10 = 1)
      not(afterDamage.unconscious) // creature survives
    )
  }
}
