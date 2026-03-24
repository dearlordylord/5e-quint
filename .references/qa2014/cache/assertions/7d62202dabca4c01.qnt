// Source: https://rpg.stackexchange.com/q/201293
module _qa_7d62202dabca4c01 {
  import dnd.* from "./dnd"

  // Can I keep concentration on a spell and an ability that works like concentration?
  run qa_concentration_feature_replaced_by_spell = {
    // Favored Foe uses "as if concentrating on a spell" — occupies the same slot
    val ss0 = FRESH_SPELL_SLOTS
    val ss1 = pStartConcentration(ss0, "favored_foe")
    // Casting hex (a concentration spell) replaces favored_foe concentration
    val ss2 = pStartConcentration(ss1, "hex")
    assert(
      ss1.concentrationSpellId == "favored_foe" and
      ss2.concentrationSpellId == "hex" and
      ss2.concentrationSpellId != "favored_foe"
    )
  }
}
