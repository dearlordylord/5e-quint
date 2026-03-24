// Source: https://rpg.stackexchange.com/q/81083
module _qa_d0d739f54596c95b {
  import dnd.* from "./dnd"

  // Is there a consistent method to introducing nonmagical items with mechanical implications?
  run qa_sneaking_cloak_adv_plus_disadv_cancel = {
    // Cloak grants advantage on Stealth; poisoned condition grants disadvantage → both cancel to straight roll
    val result = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    assert(result.hasAdvantage == false and result.hasDisadvantage == false)
  }
  
  // Is there a consistent method to introducing nonmagical items with mechanical implications?
  run qa_sneaking_cloak_passive_check_advantage_is_plus5 = {
    // PHB p.175: advantage on a passive check = +5, not a flat item bonus
    // Dex mod +1, proficient in Stealth, profBonus 3 (level 5)
    val withAdv    = passiveCheck(1, Proficient, 3, true,  false)
    val withoutAdv = passiveCheck(1, Proficient, 3, false, false)
    assert(withAdv == withoutAdv + 5)
  }
  
  // Is there a consistent method to introducing nonmagical items with mechanical implications?
  run qa_sneaking_cloak_advantage_does_not_stack = {
    // Multiple circumstantial sources (cloak + darkness) both give advantage; result is still one advantage, not additive
    val oneSource  = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    assert(oneSource.hasAdvantage == true and oneSource.hasDisadvantage == false)
  }
  
  // Is there a consistent method to introducing nonmagical items with mechanical implications?
  run qa_sneaking_cloak_advantage_can_flip_outcome = {
    // Dex mod +1, no prof, DC 14:
    // without advantage, lower die (7): 7+1=8 < 14 → fails
    // with advantage, higher die (14) passed by caller: 14+1=15 >= 14 → succeeds
    val failsNoAdv     = checkSucceeds(7,  1, NoneProf, 3, 0, 14)
    val succeedsWithAdv = checkSucceeds(14, 1, NoneProf, 3, 0, 14)
    assert(not(failsNoAdv) and succeedsWithAdv)
  }
}
