// Source: https://rpg.stackexchange.com/q/123616
module _qa_caff0189a7bc5ef1 {
  import dnd.* from "./dnd"

  // Life Transference: Supreme Healing does not apply — 4d8 are damage dice, not healing dice (Sage Advice, Crawford)
  run qa_life_transference_supreme_healing_does_not_apply = {
    // Life Transference: caster takes 4d8 necrotic damage; target heals for twice that amount.
    // Supreme Healing ("maximize dice when restoring HP with a spell") does NOT apply
    // because the 4d8 are rolled for necrotic damage — healing is derived, not directly rolled.
    val necrotic_roll = 16       // a valid 4d8 result (maximum would be 32)
    val max_roll     = 32        // 4 × 8: what Supreme Healing would use if it applied
    val caster = freshCreature(40)
    val target = freshCreature(50).with("hp", 10)
  
    // Caster takes actual (non-maximized) necrotic damage
    val casterAfter  = pTakeDamage(caster, necrotic_roll, Necrotic, Set(), Set(), Set(), false)
    val actualDamage = caster.hp - casterAfter.hp    // = 16
  
    // Healing = 2 × actual damage; Supreme Healing does NOT maximize the 4d8 to 32
    val healing     = actualDamage * 2               // = 32, NOT 64 (2 × 32)
    val targetAfter = pHeal(target, healing)
  
    assert(and {
      actualDamage == 16,
      healing == 32,
      healing != max_roll * 2,   // 32 ≠ 64: Supreme Healing is not maximizing the damage dice
      targetAfter.hp == 42,      // 10 + 32 = 42, below maxHp of 50
    })
  }
}
