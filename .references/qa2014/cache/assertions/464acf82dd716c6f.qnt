// Source: https://rpg.stackexchange.com/q/109731
module _qa_464acf82dd716c6f {
  import dnd.* from "./dnd"

  // XGtE optional rule: prone doesn't zero fly speed, so creature still falls but speed applies to damage calc
  run qa_prone_flying_creature_still_falls = {
    // Creature is prone but fly speed is 60 (prone doesn't reduce speed to 0)
    val creature = freshCreature(30).with("prone", true)
    // pFlyingCreatureFalls: triggers on prone OR speed==0; speed is still 60 here
    assert(pFlyingCreatureFalls(creature, 60, false, false) == true)
  }
  
  // XGtE optional rule: subtract current fly speed from fall distance before computing damage dice
  run qa_xgte_fall_damage_subtract_fly_speed = {
    // Flying speed 60, total fall 100 ft → effective distance = 40 ft → 4d6, not 10d6
    val flySpeed      = 60
    val fallDistance  = 100
    val effectiveDist = fallDistance - flySpeed   // 40
    val reducedDice   = pFallingDamageDice(effectiveDist)  // intMin(4, 20) = 4
    val normalDice    = pFallingDamageDice(fallDistance)   // intMin(10, 20) = 10
    assert(reducedDice == 4 and normalDice == 10)
  }
  
  // XGtE optional rule: fly speed >= fall distance → 0 effective feet → 0 damage dice
  run qa_xgte_fall_no_damage_when_speed_covers_distance = {
    // Fly speed 60 covers the entire 50 ft fall; effective dist clamped to 0
    val flySpeed     = 60
    val fallDistance = 50
    val effectiveDist = if (fallDistance - flySpeed < 0) 0 else fallDistance - flySpeed
    assert(pFallingDamageDice(effectiveDist) == 0)
  }
  
  // XGtE optional rule: speed-reduced-to-0 case gives full fall damage (no subtraction)
  run qa_xgte_fall_full_damage_when_speed_zero = {
    // If flying speed was zeroed (e.g. Earthbind without soft-landing clause), no speed to subtract
    val flySpeed     = 0
    val fallDistance = 60
    // effective = 60 - 0 = 60 ft → 6d6
    val effectiveDist = fallDistance - flySpeed
    assert(pFallingDamageDice(effectiveDist) == 6)
  }
}
