// Source: https://rpg.stackexchange.com/q/198960
module _qa_aab48da481beddaa {
  import dnd.* from "./dnd"

  // How would resistance to non magical weapons change a creature's challenge rating?
  // Accepted answer: BPS nonmagical resistance halves each physical damage instance (floor),
  // making effective HP ~1.5-2x for CR defensive calculation purposes.
  run qa_resistance_halves_bps_damage = {
    // All three nonmagical weapon damage types are halved by resistance
    val dmgB = applyDamageModifiers(30, Bludgeoning, Set(), Set(Bludgeoning, Piercing, Slashing), Set())
    val dmgP = applyDamageModifiers(30, Piercing,    Set(), Set(Bludgeoning, Piercing, Slashing), Set())
    val dmgS = applyDamageModifiers(30, Slashing,    Set(), Set(Bludgeoning, Piercing, Slashing), Set())
    assert(dmgB == 15 and dmgP == 15 and dmgS == 15)
  }
  
  // How would resistance to non magical weapons change a creature's challenge rating?
  // Accepted answer: a damage amount that kills an unresisted creature leaves a BPS-resistant
  // creature alive, illustrating the effective-HP doubling that underlies the 1.5x CR multiplier.
  run qa_resistance_effective_hp_vs_no_resistance = {
    val lion = freshCreature(58) // lion ~58 HP
    // Without resistance: 60 slashing kills the creature (HP → 0)
    val without_resist = pTakeDamage(lion, 60, Slashing, Set(), Set(), Set(), false)
    // With Slashing resistance: 60 → 30 actual damage, creature survives at 28 HP
    val with_resist = pTakeDamage(lion, 60, Slashing, Set(Slashing), Set(), Set(), false)
    assert(without_resist.hp == 0 and with_resist.hp == 28)
  }
}
