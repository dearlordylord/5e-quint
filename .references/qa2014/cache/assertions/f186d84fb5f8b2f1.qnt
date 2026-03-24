// Source: https://rpg.stackexchange.com/q/103213
module _qa_f186d84fb5f8b2f1 {
  import dnd.* from "./dnd"

  // What are the most and least-resisted damage types?
  
  // Poison: most immuned (95 immunities in MM) — immunity yields 0 damage
  run qa_poison_immunity_zeroes_damage = {
    val creature = freshCreature(30)
    val after = pTakeDamage(creature, 20, Poison, Set(), Set(), Set(Poison), false)
    assert(after.hp == 30)
  }
  
  // Force: least resisted (0 resistances in MM) — no resistance means full damage passes through
  run qa_force_no_resistance_full_damage = {
    val creature = freshCreature(30)
    val after = pTakeDamage(creature, 10, Force, Set(), Set(), Set(), false)
    assert(after.hp == 20)
  }
  
  // Cold: most commonly resisted (46 resistances in MM) — resistance halves damage
  run qa_cold_resistance_halves_damage = {
    val creature = freshCreature(30)
    val after = pTakeDamage(creature, 10, Cold, Set(Cold), Set(), Set(), false)
    assert(after.hp == 25)
  }
  
  // Immunity takes priority over resistance (applyDamageModifiers ordering)
  run qa_immunity_overrides_resistance = {
    val result = applyDamageModifiers(20, Poison, Set(Poison), Set(Poison), Set())
    assert(result == 0)
  }
  
  // Vulnerability doubles damage when not immune/resistant — e.g. Fire (9 vulnerabilities in MM)
  run qa_fire_vulnerability_doubles_damage = {
    val creature = freshCreature(30)
    val after = pTakeDamage(creature, 8, Fire, Set(), Set(Fire), Set(), false)
    assert(after.hp == 14)
  }
}
