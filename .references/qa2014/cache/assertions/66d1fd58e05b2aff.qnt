// Source: https://rpg.stackexchange.com/q/93743
module _qa_66d1fd58e05b2aff {
  import dnd.* from "./dnd"

  // Is it possible to combo Create Water + Lightning Bolt for extra damage via vulnerability?
  run qa_wet_vulnerability_doubles_lightning_too_strong = {
    // Accepted answer: vulnerability is too strong — doubles damage, don't grant it
    val baseDamage = 28 // average 8d6 lightning bolt
    val withVulnerability = applyDamageModifiers(baseDamage, Lightning, Set(), Set(), Set(Lightning))
    val withNoMod = applyDamageModifiers(baseDamage, Lightning, Set(), Set(), Set())
    // Vulnerability doubles 28 → 56; balanced ruling keeps it at 28
    assert(withVulnerability == 56 and withNoMod == 28 and withVulnerability == withNoMod * 2)
  }
  
  // Is it possible to combo Create Water + Lightning Bolt for extra damage via disadvantage on save?
  run qa_wet_disadvantage_dex_save_correct_ruling = {
    // Accepted answer: grant disadvantage on DEX save instead — balanced, within DM discretion (DMG 239)
    // Disadvantage = take lower of two d20 rolls
    val dexMod = 2        // typical creature
    val dc = 14           // typical wizard lightning bolt DC (8 + 4 prof + 2 INT mod at level 5)
    val highRoll = 15     // 15+2=17 >= 14, would normally save for half
    val lowRoll = 7       // 7+2=9 < 14, fails save → takes full 28 damage
    val saveNormal = saveSucceeds(highRoll, dexMod, false, 0, 0, dc)
    val saveWithDisadvantage = saveSucceeds(lowRoll, dexMod, false, 0, 0, dc)
    // With disadvantage the creature uses the lower roll and fails where it would otherwise succeed
    assert(saveNormal and not(saveWithDisadvantage))
  }
}
