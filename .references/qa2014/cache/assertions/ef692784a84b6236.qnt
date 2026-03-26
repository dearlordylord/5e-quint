// Source: https://rpg.stackexchange.com/q/188492
module _qa_ef692784a84b6236 {
  import dnd.* from "./dnd"

  // Wall of Fire - Do you end your turn near the wall if you damage the player that cast it and they lose concentration and the spell ends?
  run qa_wall_of_fire_concentration_break_before_end_of_turn = {
    // Enemy's turn: action used to attack Player 1, but bonus action still available (turn not yet over)
    val enemyTurn = FRESH_TURN.with("actionsRemaining", 0).with("attackActionUsed", true)
    // Player 1 (caster) is concentrating on Wall of Fire
    val casterSlots = FRESH_SPELL_SLOTS.with("concentrationSpellId", "wall_of_fire")
    // Enemy's attack deals 20 damage to Player 1; concentration DC = max(10, 20/2) = 10
    val dc = pConcentrationDC(20)
    // Player 1 rolls a 4 on their CON save (no prof, no mod): total 4 < DC 10 → fails
    val savePassed = saveSucceeds(4, 0, false, 2, 0, dc)
    // Apply the failed concentration check — spell ends immediately
    val slotsAfter = pConcentrationCheck(casterSlots, savePassed)
    assert(
      // Wall of Fire spell ended immediately upon failed save
      not(isConcentrating(slotsAfter)) and
      // Enemy's turn is still in progress (bonus action unused, turn not declared over)
      not(enemyTurn.bonusActionUsed) and
      // Confirm save actually failed (precondition)
      not(savePassed)
    )
  }
}
