// Source: https://rpg.stackexchange.com/q/205110
module _qa_d48b4705ea886039 {
  import dnd.* from "./dnd"

  // Can an army of bards with lyres of building make a castle wall invulnerable?
  run qa_lyre_immunity_blocks_matched_damage_type = {
    // One Lyre reaction grants immunity to Bludgeoning: catapult hits deal 0 damage.
    val wall = freshCreature(100)
    val afterCatapult = pTakeDamage(wall, 30, Bludgeoning, Set(), Set(), Set(Bludgeoning), false)
    assert(afterCatapult.hp == 100)
  }
  
  // Can an army of bards with lyres of building make a castle wall invulnerable?
  run qa_lyre_combining_game_effects_blocks_stacked_immunity = {
    // Combining Game Effects: only one Lyre immunity applies per target at a time.
    // Wall immune to Bludgeoning (catapults) is still fully vulnerable to Piercing (ballista).
    val wall = freshCreature(100)
    val afterBallista = pTakeDamage(wall, 25, Piercing, Set(), Set(), Set(Bludgeoning), false)
    assert(afterBallista.hp == 75)
  }
  
  // Can an army of bards with lyres of building make a castle wall invulnerable?
  run qa_lyre_diversified_siege_bypasses_single_immunity = {
    // Enemy diversifies: even with Bludgeoning immunity active, Thunder and Force punch through.
    // No single Lyre reaction can cover all damage types simultaneously.
    val wall = freshCreature(100)
    val lyreImmunity = Set(Bludgeoning)
    val afterThunder  = pTakeDamage(wall, 20, Thunder, Set(), Set(), lyreImmunity, false)
    val afterForce    = pTakeDamage(wall, 15, Force,   Set(), Set(), lyreImmunity, false)
    assert(
      afterThunder.hp == 80
      and afterForce.hp == 85
    )
  }
}
