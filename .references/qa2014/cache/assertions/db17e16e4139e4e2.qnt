// Source: https://rpg.stackexchange.com/q/178243
module _qa_db17e16e4139e4e2 {
  import dnd.* from "./dnd"

  // Does the Psi Warrior's Psionic Strike ability prompt a second Concentration save?
  // Accepted answer: Psionic Strike is a separate damage source, requiring its own concentration check.
  run qa_psionic_strike_two_concentration_checks = {
    // Caster is concentrating on a spell
    val slots = FRESH_SPELL_SLOTS.with("concentrationSpellId", "bless")
  
    // First check: weapon attack damage — save passes (roll 15, CON mod +2, DC 10)
    val dc1 = pConcentrationDC(10) // max(10, 5) = 10
    val conSave1 = saveSucceeds(15, 2, false, 0, 0, dc1) // true
    val afterWeaponCheck = pConcentrationCheck(slots, conSave1)
  
    // Second check: psionic strike force damage (separate source) — save fails (roll 5, CON mod +2, DC 10)
    val dc2 = pConcentrationDC(8) // max(10, 4) = 10
    val conSave2 = saveSucceeds(5, 2, false, 0, 0, dc2) // false
    val afterPsionicCheck = pConcentrationCheck(afterWeaponCheck, conSave2)
  
    assert(
      // After passing first check, still concentrating
      isConcentrating(afterWeaponCheck)
      // After failing second (separate source) check, concentration is broken
      and not(isConcentrating(afterPsionicCheck))
    )
  }
  
  // Each damage source gets its own DC — not combined into one roll
  run qa_psionic_strike_independent_concentration_dc = {
    // Weapon deals 20 damage, psionic deals 8 damage
    val weaponDmg   = 20  // DC = max(10, 10) = 10
    val psionicDmg  = 8   // DC = max(10,  4) = 10
    val combinedDmg = weaponDmg + psionicDmg // DC = max(10, 14) = 14 (wrong single-source approach)
  
    val dcWeapon   = pConcentrationDC(weaponDmg)
    val dcPsionic  = pConcentrationDC(psionicDmg)
    val dcCombined = pConcentrationDC(combinedDmg)
  
    assert(
      // Two separate DCs at 10 each (two checks at the lower threshold)
      dcWeapon  == 10
      and dcPsionic  == 10
      // Single combined check would impose a harder DC — incorrect per accepted answer
      and dcCombined == 14
      and dcCombined > dcWeapon
      and dcCombined > dcPsionic
    )
  }
}
