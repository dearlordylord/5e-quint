// Source: https://rpg.stackexchange.com/q/167410
module _qa_f2f9c4089d58b726 {
  import dnd.* from "./dnd"

  // Nature's Sanctuary: grapple resolves via contest (not hit/miss), so "automatic miss" has no effect
  run qa_natures_sanctuary_no_protection_from_grapple = {
    // A beast/plant that would be forced to "miss" by Nature's Sanctuary still wins the grapple
    // contest — pGrapple uses ContestResult, not resolveAttackRoll, so miss is irrelevant
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, AWins, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // Nature's Sanctuary: shove also resolves via contest — automatic miss cannot prevent a won shove
  run qa_natures_sanctuary_no_protection_from_shove = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, AWins, ShoveProne)
    assert(result.success and result.targetState.prone)
  }
}
