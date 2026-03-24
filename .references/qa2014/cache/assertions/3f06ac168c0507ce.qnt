// Source: https://rpg.stackexchange.com/q/201614
module _qa_3f06ac168c0507ce {
  import dnd.* from "./dnd"

  // Greater Restoration cures petrification (Basilisk, Death Tyrant, Gorgon, Medusa per MM; Wand of Wonder per DMG)
  run qa_greater_restoration_cures_petrification = {
    val base = freshCreature(20)
    val petrified = pApplyCondition(base, CPetrified)
    val cured = pRemoveCondition(petrified, CPetrified)
    assert(
      petrified.petrified == true
      and petrified.incapacitatedSources.contains(ISPetrified)
      and not(pCanAct(petrified))
      and cured.petrified == false
      and not(cured.incapacitatedSources.contains(ISPetrified))
      and pCanAct(cured)
    )
  }
  
  // Greater Restoration cures charmed condition (Modify Memory charm per PHB; Contact Other Plane charm-based insanity)
  run qa_greater_restoration_cures_charmed = {
    val base = freshCreature(20)
    val charmed = pApplyCondition(base, CCharmed)
    val cured = pRemoveCondition(charmed, CCharmed)
    assert(
      charmed.charmed == true
      and cured.charmed == false
    )
  }
  
  // Petrified creatures cannot be poisoned; Greater Restoration removes petrification, restoring normal poison vulnerability
  run qa_petrified_blocks_poison_gr_restores_vulnerability = {
    val base = freshCreature(20)
    val petrified = pApplyCondition(base, CPetrified)
    val poisonAttemptWhilePetrified = pApplyCondition(petrified, CPoisoned)
    // GR removes petrification (e.g., from Medusa, Basilisk, Gorgon per MM)
    val afterGR = pRemoveCondition(poisonAttemptWhilePetrified, CPetrified)
    val poisonedAfterGR = pApplyCondition(afterGR, CPoisoned)
    assert(
      poisonAttemptWhilePetrified.poisoned == false  // spec: petrified blocks CPoisoned application
      and afterGR.poisoned == false                  // still not poisoned until re-applied
      and poisonedAfterGR.poisoned == true           // vulnerable again once petrification is cured
    )
  }
  
  // Greater Restoration cures petrification, converting all-damage resistance back to none (petrified grants resistance to all damage types via pTakeDamage)
  run qa_petrified_damage_resistance_removed_after_gr = {
    val base = freshCreature(20)
    val petrified = pApplyCondition(base, CPetrified)
    // While petrified: pTakeDamage uses ALL_DAMAGE_TYPES as effective resistances (spec §10)
    val damagedWhilePetrified = pTakeDamage(petrified, 10, Fire, Set(), Set(), Set(), false)
    // After GR cures petrification: same damage with no resistances applies fully
    val cured = pRemoveCondition(petrified, CPetrified)
    val damagedAfterGR = pTakeDamage(cured, 10, Fire, Set(), Set(), Set(), false)
    assert(
      damagedWhilePetrified.hp == 20 - 5   // 10 fire halved by petrification resistance = 5
      and damagedAfterGR.hp == 20 - 10     // 10 fire applied fully after petrification removed
    )
  }
}
