// Source: https://rpg.stackexchange.com/q/163472
module _qa_5313de7174194a9b {
  import dnd.* from "./dnd"

  // Does the Avatar of Death make "attacks" for the purposes of resistance or immunity?
  // Reaping Scythe has no attack roll → not an "Attack"; werewolf immunity is
  // "from Nonmagical Attacks", so the qualifier never triggers and full slashing lands.
  run qa_non_attack_ability_bypasses_attack_conditional_immunity = {
    // Werewolf: immune to "Bludgeoning, Piercing, Slashing from Nonmagical Attacks"
    // Reaping Scythe is NOT an attack → immunity condition is not met → empty immunity set
    val slashingThrough = applyDamageModifiers(7, Slashing, Set(), Set(), Set())
    val necroticThrough  = applyDamageModifiers(4, Necrotic,  Set(), Set(), Set())
    assert(slashingThrough == 7 and necroticThrough == 4)
  }
  
  // Does the Avatar of Death make "attacks" for the purposes of resistance or immunity?
  // Black Pudding is immune to "Slashing" with no "from attacks" qualifier, so the
  // unconditional immunity applies to Reaping Scythe regardless of it not being an attack.
  run qa_non_attack_ability_still_triggers_unconditional_immunity = {
    // Black Pudding: immune to Slashing (no qualifier) → immunity always applies
    val slashingBlocked = applyDamageModifiers(7, Slashing, Set(Slashing), Set(), Set())
    val necroticThrough  = applyDamageModifiers(4, Necrotic,  Set(Slashing), Set(), Set())
    assert(slashingBlocked == 0 and necroticThrough == 4)
  }
}
