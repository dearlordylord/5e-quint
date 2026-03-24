// Source: https://rpg.stackexchange.com/q/210084
module _qa_41c1ffaa8131eaf9 {
  import dnd.* from "./dnd"

  // In dnd 5e, can the Charger feat's bonus damage crit?
  run qa_charger_bonus_not_doubled_on_crit = {
    // Weapon die rolled twice on crit (normalDice + bonusDice), flat bonus added once
    val normalDiceRoll = 6   // weapon damage die result (normal hit portion)
    val critBonusDice  = 6   // extra weapon die on critical hit
    val flatBonus      = 5   // Charger feat +5; a modifier, not a die
    val critDmg = criticalDamage(normalDiceRoll, critBonusDice, flatBonus)
    // PHB critical hit rule: roll dice twice, then add modifiers as normal
    // Expected: 6 + 6 + 5 = 17 (flat bonus added once, NOT doubled to 10)
    assert(critDmg == 17 and critDmg != normalDiceRoll + critBonusDice + flatBonus * 2)
  }
}
