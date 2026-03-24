// Source: https://rpg.stackexchange.com/q/122785
module _qa_e387820bab57b288 {
  import dnd.* from "./dnd"

  // From where can a creature attempt to overcome a Scroll of Protection?
  // Accepted: anywhere — spec imposes no distance restriction; mechanic is DC 15 CHA check as an action
  run qa_scroll_protection_cha_check_success_uses_action = {
    // CHA 14 -> mod +2; roll 13: 13+2=15 >= 15 -> success, action consumed
    val chaMod = abilityModifier(14)
    val d20Roll = 13
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, AUseObject)
    assert(
      t1.actionUsed
      and checkSucceeds(d20Roll, chaMod, NoneProf, proficiencyBonus(1), 0, 15)
    )
  }
  
  // From where can a creature attempt to overcome a Scroll of Protection?
  // Roll just below DC: 12+2=14 < 15 -> failure, but action still consumed
  run qa_scroll_protection_cha_check_failure_still_uses_action = {
    val chaMod = abilityModifier(14)
    val d20Roll = 12
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, AUseObject)
    assert(
      t1.actionUsed
      and not(checkSucceeds(d20Roll, chaMod, NoneProf, proficiencyBonus(1), 0, 15))
    )
  }
  
  // From where can a creature attempt to overcome a Scroll of Protection?
  // Incapacitated creature cannot spend the action required for the CHA check
  run qa_scroll_protection_incapacitated_cannot_attempt = {
    val creature = pApplyCondition(freshCreature(20), CIncapacitated)
    val t1 = pUseAction(FRESH_TURN, creature, AUseObject)
    assert(not(t1.actionUsed))
  }
  
  // From where can a creature attempt to overcome a Scroll of Protection?
  // Boundary: CHA mod -1 (CHA 8) needs nat20 to hit DC 15 (19 < 15 false, 20+(-1)=19 < 15 false)
  // Actually nat20 attack always hits but checkSucceeds has no auto-success; roll 16+(-1)=15 succeeds
  run qa_scroll_protection_low_cha_exact_dc = {
    val chaMod = abilityModifier(8) // -1
    val d20Roll = 16 // 16 + (-1) = 15 >= 15 -> success
    assert(checkSucceeds(d20Roll, chaMod, NoneProf, proficiencyBonus(1), 0, 15))
  }
}
