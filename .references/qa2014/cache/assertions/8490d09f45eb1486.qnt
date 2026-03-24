// Source: https://rpg.stackexchange.com/q/171650
module _qa_8490d09f45eb1486 {
  import dnd.* from "./dnd"

  // DMG Chase Rules: at exhaustion 0, first dash Con check has no disadvantage
  run qa_chase_first_con_check_no_disadvantage = {
    val s0 = freshCreature(20)
    // exhaustion 0 → pCheckModifiers reports no disadvantage
    val mods = pCheckModifiers(s0, false, false, false)
    assert(not(mods.hasDisadvantage))
  }
  
  // DMG Chase Rules: after failing first check (gain exhaustion 1), second check gets disadvantage
  run qa_chase_second_con_check_disadv_from_first_failure = {
    val s0 = freshCreature(20)
    // first extra dash check fails → 1 level of exhaustion
    val s1 = pAddExhaustion(s0, 1)
    // second check on same turn: exhaustion >= 1 → disadvantage on ability checks
    val mods = pCheckModifiers(s1, false, false, false)
    assert(mods.hasDisadvantage and s1.exhaustion == 1)
  }
  
  // DMG Chase Rules: two failed checks in same turn resolve sequentially → exhaustion 2
  run qa_chase_two_failed_checks_two_exhaustion_levels = {
    val s0 = freshCreature(20)
    val s1 = pAddExhaustion(s0, 1) // first check fails
    val s2 = pAddExhaustion(s1, 1) // second check fails (caller uses lower d20 due to disadv)
    assert(s2.exhaustion == 2)
  }
  
  // DMG Chase Rules: action Dash and bonus-action Dash (Step of Wind / Cunning Action) each consume separate turn resources
  run qa_chase_action_and_bonus_dash_consume_separate_slots = {
    val s0 = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, s0, ADash)   // regular Dash action
    val t2 = pUseBonusAction(t1, s0)     // bonus-action Dash (Step of the Wind / Cunning Action)
    assert(t2.actionUsed and t2.bonusActionUsed)
  }
  
  // DMG Chase Rules: failed Con check uses checkSucceeds; DC 10 with no proficiency fails on low roll
  run qa_chase_con_check_dc10_low_roll_fails = {
    // conMod = +2 (CON 14 as in TEST_CONFIG), roll 5: 5 + 2 = 7 < 10 → fail
    val conMod = abilityModifier(14)
    val result = checkSucceeds(5, conMod, NoneProf, proficiencyBonus(5), 0, 10)
    assert(not(result))
  }
  
  // DMG Chase Rules: failed Con check uses checkSucceeds; DC 10 passes on sufficient roll
  run qa_chase_con_check_dc10_high_roll_passes = {
    // conMod = +2, roll 9: 9 + 2 = 11 >= 10 → pass → no exhaustion
    val conMod = abilityModifier(14)
    val result = checkSucceeds(9, conMod, NoneProf, proficiencyBonus(5), 0, 10)
    assert(result)
  }
}
