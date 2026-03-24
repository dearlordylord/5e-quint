// Source: https://rpg.stackexchange.com/q/136174
module _qa_320143b5890121a8 {
  import dnd.* from "./dnd"

  // Can I apply multiple doses of Basic Poison to a weapon and get a cumulative effect?
  run qa_basic_poison_doses_do_not_stack = {
    // DMG errata "Combining Game Effects": same-named game effects don't stack —
    // only the most potent (here: one dose, 1d4 poison) applies per hit.
    val creature = freshCreature(20)
    val dieRoll = 3 // pre-resolved 1d4
    // Correct (non-stacking): two doses on the weapon behave identically to one dose
    val oneDoseResult = pTakeDamage(creature, dieRoll, Poison, Set(), Set(), Set(), false)
    // Wrong (stacking) interpretation: each dose deals damage independently
    val stackingResult = pTakeDamage(
      pTakeDamage(creature, dieRoll, Poison, Set(), Set(), Set(), false),
      dieRoll, Poison, Set(), Set(), Set(), false
    )
    assert(
      // One dose removes 3 HP: 20 - 3 = 17
      oneDoseResult.hp == 17
      // Stacking (wrong) would remove 6 HP: 20 - 3 - 3 = 14
      and stackingResult.hp == 14
      // The two interpretations differ — rule mandates the non-stacking one is correct
      and oneDoseResult.hp != stackingResult.hp
    )
  }
}
