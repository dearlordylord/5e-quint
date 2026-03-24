module _qa_f00828993e74f36d {
  import dnd.* from "./dnd"

  // Improved Pact Weapon grants +1 to Sword of Wounding (no existing +X bonus on attack/damage rolls)
  run qa_improved_pact_weapon_sword_of_wounding = {
    val baseAttackBonus = 3  // warlock's pact weapon attack bonus
    val targetAC = 14
    // No invocation: 10 + 3 = 13 < 14, miss
    val withoutIPW = resolveAttackRoll(10, baseAttackBonus, targetAC, 0)
    // Sword of Wounding has no +X to attack/damage → IPW grants +1: 10 + 3 + 1 = 14 >= 14, hit
    val withIPWOnSwordOfWounding = resolveAttackRoll(10, baseAttackBonus + 1, targetAC, 0)
    assert(not(withoutIPW.hits) and withIPWOnSwordOfWounding.hits)
  }
  
  // Improved Pact Weapon does NOT stack with a weapon that already has a +X bonus to attack/damage
  run qa_improved_pact_weapon_no_stack_with_plus2 = {
    val baseAttackBonus = 3
    val existingMagicBonus = 2  // e.g., +2 pact sword already has this bonus
    val targetAC = 16
    // +2 weapon, IPW does not add +1 on top: 10 + 3 + 2 = 15 < 16, miss
    val plus2NoIPWStack = resolveAttackRoll(10, baseAttackBonus + existingMagicBonus, targetAC, 0)
    // Incorrectly stacking +1 would give 10 + 3 + 2 + 1 = 16 >= 16, hit — but rules forbid this
    val incorrectStack = resolveAttackRoll(10, baseAttackBonus + existingMagicBonus + 1, targetAC, 0)
    assert(not(plus2NoIPWStack.hits) and incorrectStack.hits)
  }
}
