// Source: https://rpg.stackexchange.com/q/178199
module _qa_cd92e2bb2a7db659 {
  import dnd.* from "./dnd"

  // Psionic Strike: critical hits double weapon attack dice but not the separately-dealt psionic force damage
  run qa_psionic_strike_not_doubled_on_crit = {
    val weaponDieRoll = 6   // d6 result for the attack
    val strMod        = 3
    val psionicRoll   = 4   // psionic energy die result
    val intMod        = 2
  
    // Critical hit doubles weapon dice: (6 + 6) + 3 = 15
    val critWeaponDmg   = criticalDamage(weaponDieRoll, weaponDieRoll, strMod)
    // Normal (non-crit) weapon damage for comparison: 6 + 3 = 9
    val normalWeaponDmg = normalDamage(weaponDieRoll, strMod)
  
    // Psionic Strike is dealt AFTER the attack resolves — always normalDamage, never doubled
    val psionicDmgOnCrit       = normalDamage(psionicRoll, intMod)  // 4 + 2 = 6
    val psionicDmgOnNormalHit  = normalDamage(psionicRoll, intMod)  // 4 + 2 = 6 (identical)
  
    // Hypothetical (incorrect) ruling: psionic die doubled on crit = (4+4)+2 = 10
    val incorrectPsionicDmg = criticalDamage(psionicRoll, psionicRoll, intMod)
  
    assert(
      // Weapon crit correctly doubles dice
      critWeaponDmg == 15
      and normalWeaponDmg == 9
      and critWeaponDmg > normalWeaponDmg
      // Psionic Strike: not part of the attack, so same damage on crit vs normal hit
      and psionicDmgOnCrit == psionicDmgOnNormalHit
      and psionicDmgOnCrit == 6
      // The incorrect (doubled) ruling would give more damage — ruling matters
      and incorrectPsionicDmg == 10
      and psionicDmgOnCrit != incorrectPsionicDmg
    )
  }
  
  // Psionic Strike: two separate pTakeDamage calls on a crit — second (Force) is never isCritical
  run qa_psionic_strike_crit_two_independent_damage_events = {
    val target = freshCreature(30)
  
    val weaponDieRoll = 6
    val strMod        = 3
    val psionicRoll   = 4
    val intMod        = 2
  
    // Step 1 — critical weapon hit: dice doubled
    val critWeaponDmg = criticalDamage(weaponDieRoll, weaponDieRoll, strMod)  // 15
    val afterWeapon   = pTakeDamage(target, critWeaponDmg, Slashing, Set(), Set(), Set(), true)
  
    // Step 2 — Psionic Strike: separate Force damage, normalDamage only
    val psionicDmg   = normalDamage(psionicRoll, intMod)                      // 6
    val afterPsionic = pTakeDamage(afterWeapon, psionicDmg, Force, Set(), Set(), Set(), false)
  
    // Incorrect ruling: psionic die doubled → 10 force damage instead of 6
    val wrongPsionicDmg  = criticalDamage(psionicRoll, psionicRoll, intMod)   // 10
    val afterWrongPsionic = pTakeDamage(afterWeapon, wrongPsionicDmg, Force, Set(), Set(), Set(), false)
  
    assert(
      // Correct ruling: 30 - 15 - 6 = 9 HP remaining
      afterPsionic.hp == 9
      // Incorrect ruling: 30 - 15 - 10 = 5 HP remaining (wrong — psionic die was doubled)
      and afterWrongPsionic.hp == 5
      // The two rulings produce different outcomes — the distinction is material
      and afterPsionic.hp != afterWrongPsionic.hp
      // Both intermediate states after weapon hit are the same
      and afterWeapon.hp == 15
    )
  }
}
