// Source: https://rpg.stackexchange.com/q/114369
module _qa_d344198d322cd9c7 {
  import dnd.* from "./dnd"

  // Can spells with attack rolls crit? — spell attacks use the same resolveAttackRoll; nat 20 = isCritical
  run qa_spell_attack_roll_crits_on_nat20 = {
    // Nat 20 on a spell attack (e.g. Shocking Grasp, Ray of Frost) hits and crits
    val spellAttackBonus = 5   // e.g. level 5 caster: +3 prof + +2 Int mod
    val targetAC = 18
    val critResult   = resolveAttackRoll(20, spellAttackBonus, targetAC, 0)
    val normalResult = resolveAttackRoll(15, spellAttackBonus, targetAC, 0)
  
    // On a crit: roll normal dice + bonus dice (extra set), modifier NOT doubled
    val normalDiceRoll = 6    // pre-resolved normal die (e.g. 1d8 Ray of Frost)
    val bonusDiceRoll  = 4    // pre-resolved extra die for the crit
    val spellMod       = 0    // spell attacks don't add ability mod to damage
    val dmgOnCrit   = criticalDamage(normalDiceRoll, bonusDiceRoll, spellMod)
    val dmgOnNormal = normalDamage(normalDiceRoll, spellMod)
  
    assert(
      // Nat 20 spell attack hits and is a critical
      critResult.hits     == true  and
      critResult.isCritical == true  and
      // A normal hit (roll 15, total 20 >= AC 18) is NOT a critical
      normalResult.hits      == true  and
      normalResult.isCritical == false and
      // Crit deals more damage than a normal hit (bonus dice added)
      dmgOnCrit  == normalDiceRoll + bonusDiceRoll + spellMod and
      dmgOnNormal == normalDiceRoll + spellMod and
      dmgOnCrit > dmgOnNormal
    )
  }
}
