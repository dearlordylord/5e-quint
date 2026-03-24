// Source: https://rpg.stackexchange.com/q/203249
module _qa_dce8736d82cbe607 {
  import dnd.* from "./dnd"

  // When do monsters not have average hp? — average HP (floor(N*4.5+bonus)) is a valid assignment
  run qa_monster_hp_average_is_valid = {
    // Drow Elite Warrior: 11d8+22 → floor(11*4.5)+22 = 49+22 = 71 HP (standard average, truncated)
    val m = freshCreature(71)
    assert(m.hp == 71 and m.maxHp == 71 and not(m.dead))
  }
  
  // When do monsters not have average hp? — maximum HP (N*dieMax+bonus) is a valid DMG assignment
  run qa_monster_hp_maximum_is_valid = {
    // Drow Commander: 11d8+22 → 11*8+22 = 88+22 = 110 HP (maximum possible roll)
    val m = freshCreature(110)
    assert(m.hp == 110 and m.maxHp == 110 and not(m.dead))
  }
  
  // When do monsters not have average hp? — below-average HP is also a valid DMG assignment
  run qa_monster_hp_below_average_is_valid = {
    // Gondolo (scout): assigned 13 HP vs standard average 16 (3d8+3); intentionally weakened NPC
    val m = freshCreature(13)
    assert(m.hp == 13 and m.maxHp == 13 and not(m.dead))
  }
  
  // When do monsters not have average hp? — two monsters with identical HD can have different maxHp
  run qa_same_hd_different_maxhp = {
    // Drow Elite Warrior (71) vs Drow Commander (110): both 11d8+22, but DMG allows arbitrary assignment
    val eliteWarrior = freshCreature(71)
    val commander    = freshCreature(110)
    assert(
      eliteWarrior.maxHp != commander.maxHp
      and eliteWarrior.hp == 71
      and commander.hp == 110
      and not(eliteWarrior.dead)
      and not(commander.dead)
    )
  }
  
  // When do monsters not have average hp? — taking damage works correctly regardless of non-average maxHp
  run qa_monster_custom_hp_takes_damage_correctly = {
    // Commander at 110 HP takes 30 damage → 80 HP remaining; maxHp unchanged
    val commander = freshCreature(110)
    val afterDmg  = pTakeDamage(commander, 30, Slashing, Set(), Set(), Set(), false)
    assert(afterDmg.hp == 80 and afterDmg.maxHp == 110 and not(afterDmg.dead))
  }
}
