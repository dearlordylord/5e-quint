// Source: https://rpg.stackexchange.com/q/130339
module _qa_40fdc5c37967b4a0 {
  import dnd.* from "./dnd"

  // A mechanic for party member discouragement? — failed WIS save applies frightened; gives attack and check disadvantage
  run qa_discouragement_failed_save_disadvantage = {
    val wisMod = abilityModifier(13) // WIS 13 → +1
    val dc = 15
    val roll = 8 // 8 + 1 = 9 < 15 → fails
    val saveResult = saveSucceeds(roll, wisMod, false, proficiencyBonus(5), 0, dc)
    val base = freshCreature(20)
    // PHB closest analog for discouragement is Frightened (disadvantage on attacks/checks toward source)
    val affected = pApplyCondition(base, CFrightened)
    val attackMods = pOwnAttackModifiers(affected, true) // nothic in LOS
    val checkMods  = pCheckModifiers(affected, false, false, true)
    assert(
      not(saveResult) and
      affected.frightened and
      attackMods.hasDisadvantage and
      checkMods.hasDisadvantage
    )
  }
  
  // A mechanic for party member discouragement? — successful WIS save leaves creature unaffected (no disadvantage)
  run qa_discouragement_successful_save_no_effect = {
    val wisMod = abilityModifier(13) // WIS 13 → +1
    val dc = 15
    val roll = 16 // 16 + 1 = 17 >= 15 → succeeds
    val saveResult = saveSucceeds(roll, wisMod, false, proficiencyBonus(5), 0, dc)
    val base = freshCreature(20)
    val attackMods = pOwnAttackModifiers(base, true)
    val checkMods  = pCheckModifiers(base, false, false, true)
    assert(
      saveResult and
      not(base.frightened) and
      not(attackMods.hasDisadvantage) and
      not(checkMods.hasDisadvantage)
    )
  }
}
