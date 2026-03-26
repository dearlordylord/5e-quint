// Source: https://rpg.stackexchange.com/q/158522
module _qa_506ac698c413d4db {
  import dnd.* from "./dnd"

  // Can the target of Nature's Wrath use an action to attempt to free itself?
  run qa_restrained_no_action_escape = {
    // Accepted answer: no — restrained (Nature's Wrath) can only end via the end-of-turn save.
    // The spec has no pEscapeRestrained; pUseAction leaves the restrained condition untouched.
    val s = freshCreature(20).with("restrained", true)
    val t1 = pUseAction(FRESH_TURN, s, AAttack)
    // Action consumed, but restrained condition unchanged — no action-based escape exists
    assert(s.restrained == true and t1.actionsRemaining == 0)
  }
  
  // Contrast: grapple explicitly has an action-based escape mechanic (pEscapeGrapple)
  run qa_grapple_has_action_escape_unlike_natures_wrath_restrained = {
    // pEscapeGrapple models the PHB rule "a grappled creature can use its action to escape";
    // no analogous function exists for restrained, encoding the accepted answer.
    val s = freshCreature(20).with("grappled", true)
    // BWins = grappled creature wins the contested Athletics/Acrobatics check → freed
    val escaped = pEscapeGrapple(s, BWins)
    assert(escaped.grappled == false)
  }
}
