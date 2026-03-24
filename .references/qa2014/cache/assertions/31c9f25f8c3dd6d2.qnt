// Source: https://rpg.stackexchange.com/q/190914
module _qa_31c9f25f8c3dd6d2 {
  import dnd.* from "./dnd"

  // Can an Armorer Artificer wear another set of armor with their Arcane Armor?
  // Rule: PHB "one suit of armor" — ArmorState is a single slot; donning a second armor replaces the first, not stacks with it.
  run qa_arcane_armor_single_slot = {
    val dexMod = 0
    // "Arcane Armor" represented as chain mail in ArmorState (heavy, baseAC 16)
    val acWithArcaneArmor = calculateAC(WearingArmor(CHAIN_MAIL), dexMod, false, NoUnarmoredDefense, 0, 0)
    // Donning a second suit transitions ArmorState to a single new entry — old armor is fully replaced
    val acAfterDonningSecond = calculateAC(WearingArmor(PLATE), dexMod, false, NoUnarmoredDefense, 0, 0)
    assert(
      acWithArcaneArmor == 16        // chain mail AC alone
      and acAfterDonningSecond == 18 // plate AC alone — not 16+18=34; no stacking possible in single-slot ArmorState
    )
  }
}
