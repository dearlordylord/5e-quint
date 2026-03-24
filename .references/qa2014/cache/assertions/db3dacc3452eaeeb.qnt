// Source: https://rpg.stackexchange.com/q/162817
module _qa_db3dacc3452eaeeb {
  import dnd.* from "./dnd"

  // Does Healing Restore Blood? — HP is an abstraction (physical + mental + luck), not literal blood volume; healing restores the abstraction
  run qa_heal_restores_hp_agnostic_of_damage_cause = {
    // Psychic damage causes no blood loss yet still reduces HP; healing restores it identically
    val c = freshCreature(20)
    val afterPsychic = pTakeDamage(c, 12, Psychic, Set(), Set(), Set(), false)
    val afterHeal    = pHeal(afterPsychic, 12)
    assert(afterHeal.hp == 20)
  }
  
  // Does Healing Restore Blood? — accepted answer recommends exhaustion to model anemia; exhaustion 1 gives disadvantage on ability checks (weakness/fatigue)
  run qa_exhaustion_1_disadv_on_checks = {
    val c    = freshCreature(20).with("exhaustion", 1)
    val mods = pCheckModifiers(c, false, false, false)
    assert(mods.hasDisadvantage)
  }
  
  // Does Healing Restore Blood? — exhaustion 2 halves speed (shortness of breath / reduced exertion)
  run qa_exhaustion_2_halves_speed = {
    val c = freshCreature(20).with("exhaustion", 2)
    val t = pStartTurn(TEST_CONFIG, c, Unarmored, false, 0, false, false)
    assert(t.effectiveSpeed == 15)
  }
  
  // Does Healing Restore Blood? — exhaustion 4 halves hit point maximum (severe anemia / cardiac compensation)
  run qa_exhaustion_4_halves_max_hp = {
    val c = freshCreature(20).with("exhaustion", 4)
    assert(effectiveMaxHp(c) == 10)
  }
}
