// Source: https://rpg.stackexchange.com/q/213420
module _qa_d84f8e5fabe6aede {
  import dnd.* from "./dnd"

  // Is Wild Shape affected by Moonbeam? (2024 rules: Wild Shape is shape-shifting; failed Con save deals Radiant damage)
  run qa_moonbeam_wild_shape_radiant_damage = {
    // Druid in Wild Shape treated as a creature subject to Moonbeam's Con save
    val druidInWildShape = freshCreature(30)
    // Pre-resolved 2d10 Radiant = 14
    val moonbeamDamage = 14
    // Druid caster level 5, Wis 16 (mod +3): DC = 8 + 3 + 3 = 14
    val moonbeamDC = 14
    // Wild Shape form has Con 12 (mod +1); d20 roll 7 → total 8 < 14 → fails
    val conMod = 1
    val d20roll = 7
    val saveFailed = not(saveSucceeds(d20roll, conMod, false, 0, 0, moonbeamDC))
    val s1 = pTakeDamage(druidInWildShape, moonbeamDamage, Radiant, Set(), Set(), Set(), false)
    assert(saveFailed and s1.hp == 30 - 14)
  }
  
  // Is Wild Shape affected by Moonbeam? — successful save means no damage taken
  run qa_moonbeam_wild_shape_save_succeeds_no_damage = {
    val druidInWildShape = freshCreature(30)
    val moonbeamDC = 14
    val conMod = 1
    // d20 roll 15 → total 16 >= 14 → save succeeds, no damage
    val d20roll = 15
    val saveSucceeded = saveSucceeds(d20roll, conMod, false, 0, 0, moonbeamDC)
    // On a successful save Moonbeam deals no damage; HP unchanged
    assert(saveSucceeded and druidInWildShape.hp == 30)
  }
}
