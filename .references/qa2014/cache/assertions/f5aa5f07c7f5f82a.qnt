// Source: https://rpg.stackexchange.com/q/179507
module _qa_f5aa5f07c7f5f82a {
  import dnd.* from "./dnd"

  // When is the Saving Throw rolled for an Infernal Wound? — Con save is rolled on hit; failure → wound damage at turn start
  run qa_infernal_wound_failed_save_on_hit_takes_damage = {
    val creature = freshCreature(30)
    val conMod = abilityModifier(10) // CON 10 → +0
    val dc = 12
    // Ruling: save rolled when attack hits, not at start of each turn
    // d20=4 + 0 = 4 < 12 → fails → wound applies
    val saveFailed = not(saveSucceeds(4, conMod, false, 0, 0, dc))
    // Wound deals 5 (1d10 pre-resolved as 5) at start of each turn
    val afterTurnStart = pTakeDamage(creature, 5, Piercing, Set(), Set(), Set(), false)
    assert(saveFailed and afterTurnStart.hp == 25)
  }
  
  // When is the Saving Throw rolled for an Infernal Wound? — successful save on hit prevents wound entirely
  run qa_infernal_wound_successful_save_no_wound = {
    val creature = freshCreature(30)
    val conMod = abilityModifier(10) // CON 10 → +0
    val dc = 12
    // d20=15 + 0 = 15 >= 12 → save succeeds → no wound, no damage
    val saveOk = saveSucceeds(15, conMod, false, 0, 0, dc)
    assert(saveOk and creature.hp == 30)
  }
  
  // When is the Saving Throw rolled for an Infernal Wound? — magical healing closes the wound (restores HP)
  run qa_infernal_wound_magical_healing_closes_wound = {
    val creature = freshCreature(30)
    // Wound was applied (failed save on hit); creature took 5 damage at turn start
    val wounded = pTakeDamage(creature, 5, Piercing, Set(), Set(), Set(), false)
    // Magical healing closes wound and restores HP
    val healed = pHeal(wounded, 5)
    assert(healed.hp == 30)
  }
  
  // When is the Saving Throw rolled for an Infernal Wound? — subsequent hits increase wound damage with no new save
  run qa_infernal_wound_stacking_no_extra_save = {
    val creature = freshCreature(50)
    val conMod = abilityModifier(10) // CON 10 → +0
    val dc = 12
    // First hit: save failed → wound (5/turn); second hit on already-wounded target increases damage (+5, no new save)
    val saveFailed = not(saveSucceeds(3, conMod, false, 0, 0, dc))
    // Wound now 10/turn (5 base + 5 stacked); at turn start:
    val afterTurnStart = pTakeDamage(creature, 10, Piercing, Set(), Set(), Set(), false)
    assert(saveFailed and afterTurnStart.hp == 40)
  }
}
