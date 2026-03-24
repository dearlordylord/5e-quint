// Source: https://rpg.stackexchange.com/q/128167
module _qa_124d360a6f7ef2d2 {
  import dnd.* from "./dnd"

  // How can I end the Stunned Condition? — stunned is powerful because it also incapacitates
  run qa_stunned_implies_incapacitated = {
    val s0 = freshCreature(20)
    val s1 = pApplyCondition(s0, CStunned)
    assert(s1.stunned and isIncapacitated(s1) and s1.incapacitatedSources.contains(ISStunned))
  }
  
  // How can I end the Stunned Condition? — failing the initial save applies stunned
  run qa_failed_save_applies_stun = {
    val s0 = freshCreature(20)
    // CON save: mod +1, not proficient, profBonus 3, DC 14 — roll 8: 8+1=9 < 14
    val savePassed = saveSucceeds(8, 1, false, 3, 0, 14)
    val s1 = if (savePassed) s0 else pApplyCondition(s0, CStunned)
    assert(not(savePassed) and s1.stunned and isIncapacitated(s1))
  }
  
  // How can I end the Stunned Condition? — passing the initial save prevents stun entirely
  run qa_passed_save_prevents_stun = {
    val s0 = freshCreature(20)
    // CON save: mod +1, not proficient, profBonus 3, DC 14 — roll 15: 15+1=16 >= 14
    val savePassed = saveSucceeds(15, 1, false, 3, 0, 14)
    val s1 = if (savePassed) s0 else pApplyCondition(s0, CStunned)
    assert(savePassed and not(s1.stunned) and not(isIncapacitated(s1)))
  }
  
  // How can I end the Stunned Condition? — advantage on save (aura of purity) turns a failure into a success
  run qa_advantage_save_prevents_stun = {
    val s0 = freshCreature(20)
    // Without advantage roll 6 would fail (6+1=7 < 14); with advantage second roll 14 succeeds (14+1=15 >= 14)
    val roll1 = 6
    val roll2 = 14
    val noAdvSave = saveSucceeds(roll1, 1, false, 3, 0, 14)
    val advSave   = saveSucceeds(intMax(roll1, roll2), 1, false, 3, 0, 14)
    val s_noAdv = if (noAdvSave) s0 else pApplyCondition(s0, CStunned)
    val s_adv   = if (advSave)   s0 else pApplyCondition(s0, CStunned)
    assert(not(noAdvSave) and s_noAdv.stunned and advSave and not(s_adv.stunned))
  }
  
  // How can I end the Stunned Condition? — spell (power word heal) or natural expiry removes stun and clears incapacitation
  run qa_remove_stun_ends_incapacitation = {
    val s0 = freshCreature(20)
    val s1 = pApplyCondition(s0, CStunned)
    val s2 = pRemoveCondition(s1, CStunned)
    assert(not(s2.stunned) and not(isIncapacitated(s2)) and not(s2.incapacitatedSources.contains(ISStunned)))
  }
}
