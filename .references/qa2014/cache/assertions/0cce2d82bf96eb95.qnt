// Source: https://rpg.stackexchange.com/q/87192
module _qa_0cce2d82bf96eb95 {
  import dnd.* from "./dnd"

  // Do ability modifiers get added to each roll when achieving a critical hit?
  run qa_crit_modifier_added_once = {
    // Dagger crit: roll 2d4, then add STR mod exactly once (not once per die)
    val die1    = 3   // first d4 result
    val die2    = 2   // bonus d4 result (extra crit die)
    val strMod  = 3
    val critDmg = criticalDamage(die1, die2, strMod)
    // PHB p.196: "roll all damage dice twice … then add any relevant modifiers as normal"
    // Modifier added once → 3+2+3 = 8, NOT 3+2+3+3 = 11
    assert(
      critDmg == die1 + die2 + strMod          // modifier added once
      and critDmg != die1 + die2 + strMod * 2  // NOT added per die
    )
  }
}
