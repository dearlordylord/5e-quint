// Source: https://rpg.stackexchange.com/q/213646
module _qa_170231cfbb5cabd5 {
  import dnd.* from "./dnd"

  // Otherworldly Steed Hit Point maximum? — max HP equals spell formula (5 + 10*spellLevel), not HD+Con calc
  run qa_steed_max_hp_from_spell_formula = {
    // Spell level 2: stated max = 5 + 10*2 = 25, not 2d10+2*CON = max 24
    val spellLevelTwoMax = 25
    val steed = freshCreature(spellLevelTwoMax)
    // Take damage so healing is meaningful
    val damaged = pTakeDamage(steed, 10, Slashing, Set(), Set(), Set(), false)
    // Heal with a surplus; must cap at spell-formula max (25), not HD+Con max (24)
    val healed = pHeal(damaged, 100)
    assert(healed.hp == spellLevelTwoMax)
  }
  
  // Otherworldly Steed Hit Point maximum? — level 9 slot: max HP = 95, not 9d10+18 = 108
  run qa_steed_max_hp_spell_level_9 = {
    // Spell level 9: stated max = 5 + 10*9 = 95, not 9d10+9*2 = max 108
    val spellLevelNineMax = 95
    val steed = freshCreature(spellLevelNineMax)
    val damaged = pTakeDamage(steed, 50, Slashing, Set(), Set(), Set(), false)
    // Overheal attempt must still cap at spell-formula max
    val healed = pHeal(damaged, 200)
    assert(healed.hp == spellLevelNineMax)
  }
  
  // Otherworldly Steed Hit Point maximum? — steed at full spell-formula HP cannot be healed further
  run qa_steed_full_hp_no_overheal = {
    val spellMax = 25
    val steed = freshCreature(spellMax)
    // Already at max; healing does nothing
    val afterHeal = pHeal(steed, 10)
    assert(afterHeal.hp == spellMax)
  }
}
