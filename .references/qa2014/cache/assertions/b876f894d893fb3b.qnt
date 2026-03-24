// Source: https://rpg.stackexchange.com/q/208322
module _qa_b876f894d893fb3b {
  import dnd.* from "./dnd"

  // Beast Barbarian claws lack Light_ property — cannot qualify for Two-Weapon Fighting bonus attack
  run qa_claw_not_valid_for_twf = {
    // Natural weapon claw: simple melee, but NOT Light_ (not a held weapon in the TWF sense)
    val claw: Weapon = {
      name: "claw",
      damageDie: 6,
      versatileDie: 0,
      damageType: Slashing,
      properties: Set(),   // no Light_, no Finesse, no other TWF-qualifying props
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    // Simulate mid-turn: Attack action already taken, bonus action still available
    val t: TurnState = FRESH_TURN.with("attackActionUsed", true)
    val creature: CreatureState = freshCreature(20)
    // pCanTWFWithWeapons requires both weapons to have Light_; claw does not → false
    assert(not(pCanTWFWithWeapons(claw, claw, t, creature)))
  }
}
