// Source: https://rpg.stackexchange.com/q/197946
module _qa_ad2ce1cb131ca0fe {
  import dnd.* from "./dnd"

  // Can the Armorer Artificer's Infiltrator Lightning Launcher be used with a full hand?
  // Accepted: no free hand required — resolveAttackRoll has no free-hand parameter,
  // unlike pGrapple which explicitly gates on attackerHasFreeHand.
  run qa_lightning_launcher_no_free_hand_required = {
    // A ranged attack (Lightning Launcher analog) resolves normally with no free-hand check.
    // The spec encodes zero free-hand requirement in resolveAttackRoll.
    val rangedHit = resolveAttackRoll(15, 5, 14, 0)
  
    // By contrast, grapple explicitly requires a free hand; AWins contest still fails without one.
    val grappleNoFreeHand = pGrapple(Medium, Medium, freshCreature(10), AWins, false)
  
    assert(
      // Lightning-launcher-style attack: hits regardless of hand state (no parameter for it)
      rangedHit.hits == true
      // Grapple with full hand: fails even when attacker wins the contest
      and not(grappleNoFreeHand.success)
    )
  }
}
