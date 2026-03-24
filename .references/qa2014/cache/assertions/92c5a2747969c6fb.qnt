// Source: https://rpg.stackexchange.com/q/71187
module _qa_92c5a2747969c6fb {
  import dnd.* from "./dnd"

  // Undying Warlock "Defy Death" (SCAG p.139): succeed on death saving throw, then gain 1d8+CON HP
  run qa_undying_warlock_defy_death = {
    val maxHp = 20
    val conMod = 2  // CON 14
    // Dying creature: 0 HP, unconscious, not yet stable
    val s0 = freshCreature(maxHp)
      .with("hp", 0)
      .with("unconscious", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("prone", true)
    // Roll 15 on death save: success (>= 10, not nat 20, not nat 1)
    val s1 = pDeathSave(s0, 15)
    // Defy Death grants 1d8 + CON mod HP on success (roll 6 + 2 = 8)
    val s2 = pHeal(s1, 6 + conMod)
    assert(
      s1.deathSaves.successes == 1 and
      s1.hp == 0 and          // still at 0 after save alone
      s2.hp == 6 + conMod and // healing restores HP
      not(s2.unconscious)     // regains consciousness via pHeal 0->positive path
    )
  }
  
  // Undying Warlock "Indestructible Life" (SCAG p.139): bonus action heals 1d8 + warlock level
  run qa_undying_warlock_indestructible_life = {
    val maxHp = 30
    val warlockLevel = 14
    val dieRoll = 5  // 1d8 result
    val s0 = freshCreature(maxHp).with("hp", 8)  // wounded
    val t0 = FRESH_TURN
    // Use bonus action for Indestructible Life
    val t1 = pUseBonusAction(t0, s0)
    // Regain 1d8 + warlock level HP
    val s1 = pHeal(s0, dieRoll + warlockLevel)
    assert(
      t1.bonusActionUsed and
      s1.hp == 8 + dieRoll + warlockLevel  // 8 + 5 + 14 = 27, within maxHp 30
    )
  }
}
