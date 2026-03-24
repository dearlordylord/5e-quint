// Source: https://rpg.stackexchange.com/q/176756
module _qa_7d0a19accf80c0d4 {
  import dnd.* from "./dnd"

  // Does a Tortle's Natural Armor interfere with the Monk's Unarmored Movement ability?
  run qa_tortle_natural_armor_unarmored_movement = {
    val creature = freshCreature(20)
    // Natural armor is not "wearing armor" → ArmorState is Unarmored
    // → Unarmored Movement bonus (+10 ft at level 2) applies; caller passes callerSpeedModifier = 10
    val turnNaturalArmor = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 10, false, false)
    // Wearing actual armor → Unarmored Movement does NOT apply; callerSpeedModifier = 0
    val turnWornArmor = pStartTurn(TEST_CONFIG, creature, WearingArmor(LEATHER), false, 0, false, false)
    assert(
      // Tortle monk with natural armor gets the +10 Unarmored Movement: 30 + 10 = 40
      turnNaturalArmor.movementRemaining == 40
      // Monk wearing actual leather armor loses the bonus: 30 + 0 = 30
      and turnWornArmor.movementRemaining == 30
    )
  }
}
