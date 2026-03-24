// Source: https://rpg.stackexchange.com/q/151714
module _qa_c763e390f79d69b5 {
  import dnd.* from "./dnd"

  // Does the Entangle spell require existing vegetation? — Accepted: no; plants are conjured magically; failed STR save applies Restrained regardless of environment.
  run qa_entangle_no_vegetation_required = {
    // Level 1 druid, WIS 16 (+3 mod), prof bonus +2 → spell save DC 13
    // Target: STR 10 (mod 0), rolls 7 on STR save → total 7 < 13 → fails → Restrained
    val dc = 13
    val strSaveRoll = 7
    val strMod = 0
    val profBonus = 2
    val failedSave = not(saveSucceeds(strSaveRoll, strMod, false, profBonus, 0, dc))
    val target = freshCreature(15)
    val entangled = if (failedSave) pApplyCondition(target, CRestrained) else target
    val defMods = pDefenseModifiers(entangled, true)
    val atkMods = pOwnAttackModifiers(entangled, false)
    val saveMods = pSaveModifiers(entangled, Dex)
    assert(
      failedSave
      and entangled.restrained
      and defMods.attackerAdvantage        // attackers gain advantage vs Restrained
      and atkMods.hasDisadvantage          // Restrained creature has disadv on own attacks
      and saveMods.hasDisadvantage         // Restrained creature has disadv on DEX saves
    )
  }
  
  // Does the Entangle spell require existing vegetation? — Restrained creature can use its action for STR check vs spell save DC to escape.
  run qa_entangle_escape_str_check = {
    // Same DC 13 from level 1 druid WIS 16
    val dc = 13
    val target = freshCreature(15)
    val entangled = pApplyCondition(target, CRestrained)
    // Creature rolls 15 on STR check, STR mod +2, no prof → total 17 >= 13 → escapes
    val checkPassed = checkSucceeds(15, 2, NoneProf, 2, 0, dc)
    val afterEscape = if (checkPassed) pRemoveCondition(entangled, CRestrained) else entangled
    assert(
      entangled.restrained
      and checkPassed
      and not(afterEscape.restrained)
    )
  }
  
  // Does the Entangle spell require existing vegetation? — A creature that passes its STR save is not Restrained (remains free).
  run qa_entangle_passed_save_not_restrained = {
    // Same DC 13; target STR 16 (+3 mod), rolls 12 → total 15 >= 13 → save succeeds
    val dc = 13
    val strSaveRoll = 12
    val strMod = 3
    val savedSuccessfully = saveSucceeds(strSaveRoll, strMod, false, 2, 0, dc)
    val target = freshCreature(15)
    val afterSpell = if (not(savedSuccessfully)) pApplyCondition(target, CRestrained) else target
    assert(
      savedSuccessfully
      and not(afterSpell.restrained)
    )
  }
}
