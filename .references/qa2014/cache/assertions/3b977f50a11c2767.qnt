// Source: https://rpg.stackexchange.com/q/110674
module _qa_3b977f50a11c2767 {
  import dnd.* from "./dnd"

  // Can you attack from inside Rope Trick and vice versa?
  run qa_rope_trick_no_attacks_cross_boundary = {
    // PHB p.272: "Attacks and spells can't cross through the entrance into or out of
    // the extradimensional space" — modeled as TotalCover in both directions;
    // neither inside→outside nor outside→inside targeting is permitted
    assert(
      not(canBeTargeted(TotalCover)) // outside→inside blocked
      and
      not(canBeTargeted(TotalCover)) // inside→outside blocked (symmetric)
    )
  }
}
