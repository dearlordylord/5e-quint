// Source: https://rpg.stackexchange.com/q/78243
module _qa_92e49de2897b721e {
  import dnd.* from "./dnd"

  // How does Sleep interact with multiple attacks? — first attack on an unconscious (sleeping) target within 5 ft is an automatic critical hit
  run qa_sleep_first_attack_autocrit = {
    val sleeper = pApplyCondition(freshCreature(20), CUnconscious)
    val mods = pDefenseModifiers(sleeper, true) // attacker within 5 ft
    assert(mods.autoCrit == true and mods.attackerAdvantage == true)
  }
  
  // How does Sleep interact with multiple attacks? — damage from the first hit wakes the sleeper; subsequent attacks lose autoCrit (target is merely prone)
  run qa_sleep_second_attack_no_autocrit = {
    val sleeper = pApplyCondition(freshCreature(20), CUnconscious)
    // First attack deals damage → Sleep ends → model as removing the unconscious condition
    val woken = pRemoveCondition(sleeper, CUnconscious)
    // PHB: prone is NOT removed when unconscious is lifted; creature must stand up separately
    val mods = pDefenseModifiers(woken, true) // attacker still within 5 ft for second attack
    assert(
      woken.unconscious == false and
      woken.prone == true and
      mods.autoCrit == false and
      mods.attackerAdvantage == true // prone + within 5 ft still grants advantage
    )
  }
}
