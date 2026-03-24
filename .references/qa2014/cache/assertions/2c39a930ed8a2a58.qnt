// Source: https://rpg.stackexchange.com/q/134321
module _qa_2c39a930ed8a2a58 {
  import dnd.* from "./dnd"

  // Can you cancel Shield using readied Dispel Magic? (answer: no — dispel fires after Shield resolves, attack already missed)
  run qa_readied_dispel_magic_cannot_cancel_shield = {
    // PHB/DMG p.252: readied actions occur *after* their trigger finishes.
    // Shield is cast as a reaction *before* the triggering attack resolves,
    // so the +5 AC from Shield is already in effect when the attack roll is adjudicated.
    // Dispel Magic fires afterward — the attack already missed with Shield active.
    val d20Roll     = 15
    val attackBonus = 5   // total attack = 20
    val targetAC    = 16  // without Shield: 20 >= 16 → hit
    val shieldBonus = 5   // Shield reaction: AC becomes 21; 20 < 21 → miss
  
    // The attack resolves WHILE Shield is active (dispel comes too late to change this)
    val resultWithShield    = resolveAttackRoll(d20Roll, attackBonus, targetAC, shieldBonus)
    // The same roll would have hit had Shield never been cast
    val resultWithoutShield = resolveAttackRoll(d20Roll, attackBonus, targetAC, 0)
  
    assert(
      not(resultWithShield.hits)   // Shield active → attack misses; dispel cannot retroactively fix this
      and resultWithoutShield.hits // confirms the roll was only a miss *because* of Shield
    )
  }
}
