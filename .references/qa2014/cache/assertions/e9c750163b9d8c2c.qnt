// Source: https://rpg.stackexchange.com/q/191515
module _qa_e9c750163b9d8c2c {
  import dnd.* from "./dnd"

  // Transmute Rock to Mud: failed DEX save causes full 4d8 bludgeoning from falling mud (ceiling effect)
  run qa_transmute_rock_ceiling_full_damage_failed_dex_save = {
    val creature = freshCreature(40)
    val dexMod = 1
    val dc = 15
    val d20Roll = 8 // 8+1=9 < 15, save fails
    val savePassed = saveSucceeds(d20Roll, dexMod, false, 0, 0, dc)
    val diceRoll = 24 // 4d8 concrete result
    val damage = if (savePassed) diceRoll / 2 else diceRoll
    val after = pTakeDamage(creature, damage, Bludgeoning, Set(), Set(), Set(), false)
    assert(not(savePassed) and after.hp == 40 - 24)
  }
  
  // Transmute Rock to Mud: passed DEX save halves bludgeoning damage from falling mud (ceiling effect)
  run qa_transmute_rock_ceiling_half_damage_passed_dex_save = {
    val creature = freshCreature(40)
    val dexMod = 3
    val dc = 15
    val d20Roll = 14 // 14+3=17 >= 15, save passes
    val savePassed = saveSucceeds(d20Roll, dexMod, false, 0, 0, dc)
    val diceRoll = 24
    val damage = if (savePassed) diceRoll / 2 else diceRoll
    val after = pTakeDamage(creature, damage, Bludgeoning, Set(), Set(), Set(), false)
    assert(savePassed and after.hp == 40 - 12)
  }
  
  // Transmute Rock to Mud: failed STR save causes restrained condition from floor mud (floor effect)
  run qa_transmute_rock_floor_restrained_failed_str_save = {
    val creature = freshCreature(20)
    val strMod = 0
    val dc = 15
    val d20Roll = 10 // 10+0=10 < 15, save fails
    val savePassed = saveSucceeds(d20Roll, strMod, false, 0, 0, dc)
    val after = if (not(savePassed)) pApplyCondition(creature, CRestrained) else creature
    assert(not(savePassed) and after.restrained)
  }
  
  // Transmute Rock to Mud: single casting targets one contiguous area; disconnected ceiling and
  // floor cannot both be affected — only one effect (ceiling OR floor) applies per casting
  run qa_transmute_rock_single_area_only_one_effect = {
    val creature = freshCreature(40)
    // Cast targeting ceiling only; both saves would fail, but floor was not part of target area
    val ceilingTargeted = true
    val floorTargeted = false // separate floor not contiguous with ceiling target
    val dexSaveFails = true
    val strSaveFails = true
    val diceRoll = 20
    val afterCeiling = if (ceilingTargeted and dexSaveFails)
      pTakeDamage(creature, diceRoll, Bludgeoning, Set(), Set(), Set(), false)
    else creature
    val afterFloor = if (floorTargeted and strSaveFails)
      pApplyCondition(afterCeiling, CRestrained)
    else afterCeiling
    // Ceiling effect applied (hp reduced), floor effect did NOT apply (not restrained)
    assert(afterFloor.hp < 40 and not(afterFloor.restrained))
  }
}
