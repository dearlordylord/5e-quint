// Source: https://rpg.stackexchange.com/q/211147
module _qa_0f7a381d4557667d {
  import dnd.* from "./dnd"

  // Can I grapple someone's mouth shut if they're 2 inches (50.8 mm) tall and I'm 3.3866 mm tall?
  // Accepted answer: grapple target must be no more than one size larger; Tiny cannot grapple Medium.
  run qa_tiny_cannot_grapple_medium = {
    val target = freshCreature(20)
    // Tiny (attacker, sizeOrd=0) vs Medium (target, sizeOrd=2): 2 > 0+1, fails pWithinOneSize
    val result = pGrapple(Tiny, Medium, target, AWins, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // Boundary check: Tiny can grapple Small (exactly one size larger — the limit)
  run qa_tiny_can_grapple_small = {
    val target = freshCreature(20)
    // sizeOrd(Small)=1 <= sizeOrd(Tiny)+1=1 → within one size → allowed
    val result = pGrapple(Tiny, Small, target, AWins, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // Without a free hand the grapple also fails regardless of sizes
  run qa_grapple_requires_free_hand = {
    val target = freshCreature(20)
    val result = pGrapple(Tiny, Small, target, AWins, false)
    assert(not(result.success) and not(result.targetState.grappled))
  }
}
