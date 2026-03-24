// Source: https://rpg.stackexchange.com/q/174536
module _qa_82a8f961d704b6dd {
  import dnd.* from "./dnd"

  // When a character with no fly speed ends their turn in the air, when should they start falling?
  run qa_no_fly_speed_creature_falls = {
    // PHB/XGtE: creature with no fly speed (effectiveSpeed=0 for flight) and no hover falls
    val creature = freshCreature(30)
    assert(pFlyingCreatureFalls(creature, 0, false, false) == true)
  }
  
  // When a character with no fly speed ends their turn in the air, when should they start falling?
  run qa_fall_90_feet_is_9d6 = {
    // PHB: 1d6 bludgeoning per 10 feet fallen — Q&A scenario was ~90 feet up → 9 dice
    assert(pFallingDamageDice(90) == 9)
  }
  
  // When a character with no fly speed ends their turn in the air, when should they start falling?
  run qa_fall_damage_capped_at_20d6 = {
    // PHB: fall damage is capped at 20d6 regardless of height (500 ft still = 20d6)
    assert(pFallingDamageDice(200) == 20 and pFallingDamageDice(500) == 20)
  }
  
  // When a character with no fly speed ends their turn in the air, when should they start falling?
  run qa_fall_lands_creature_prone = {
    // PHB: creature lands prone at end of fall unless damage entirely avoided
    val creature = freshCreature(50)
    val result = pApplyFall(creature, 15, Set(), Set(), Set())
    assert(result.prone)
  }
  
  // When a character with no fly speed ends their turn in the air, when should they start falling?
  run qa_unconscious_creature_falls_no_protection = {
    // Q&A scenario: knocked unconscious mid-air then falls full distance — no Slow Fall when unconscious.
    // Creature at 0 HP (knocked out), falls enough to exceed maxHp → instant death.
    val creature = freshCreature(20)
    val knocked = pKnockOut(creature)  // hp=0, unconscious, prone, stable
    val result = pApplyFall(knocked, 40, Set(), Set(), Set())  // 40 > maxHp(20) → dead
    assert(result.dead)
  }
}
