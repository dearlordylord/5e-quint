// Source: https://rpg.stackexchange.com/q/183664
module _qa_4f264bb5d9ca0e63 {
  import dnd.* from "./dnd"

  // If you transmute Enervation to another element, do you still benefit from the healing?
  run qa_transmuted_spell_cannot_convert_necrotic = {
    // Transmuted Spell metamagic only operates on: acid, cold, fire, lightning, poison, thunder
    val transmutableTypes: Set[DamageType] = Set(Acid, Cold, Fire, Lightning, Poison, Thunder)
    // Enervation deals Necrotic — not in the eligible list, so the metamagic cannot apply
    assert(not(transmutableTypes.contains(Necrotic)))
  }
}
