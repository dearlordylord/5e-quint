// Source: https://rpg.stackexchange.com/q/80271
module _qa_790816d5d6db7a88 {
  import dnd.* from "./dnd"

  // Does a wizard need to hold a component pouch or focus in one hand in order for it to work?
  run qa_same_hand_somatic_and_material = {
    val creature = freshCreature(20)
    // PHB: must have a hand free to access material components or hold a focus,
    // but it CAN be the same hand used to perform somatic components.
    // Spec encodes this with a single hasFreeHand parameter covering both S and M:
    // one free hand is sufficient even when a spell requires both S and M.
    val canCastSM_oneFreeHand = pCanProvideComponents(creature, false, true, true)
    // Without any free hand, somatic (and material access) both fail.
    val cannotCast_noFreeHand = not(pCanProvideComponents(creature, false, true, false))
    assert(canCastSM_oneFreeHand and cannotCast_noFreeHand)
  }
}
