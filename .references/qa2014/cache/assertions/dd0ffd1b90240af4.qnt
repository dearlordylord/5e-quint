// Source: https://rpg.stackexchange.com/q/97971
module _qa_dd0ffd1b90240af4 {
  import dnd.* from "./dnd"

  // Can a grappler grapple the same target multiple times? (PHB p.290: "condition's effects don't get worse; a creature either has a condition or doesn't")
  run qa_grapple_condition_idempotent = {
    val creature = freshCreature(20)
    val afterFirst  = pApplyCondition(creature, CGrappled)
    val afterSecond = pApplyCondition(afterFirst, CGrappled)
    // Applying CGrappled a second time must not change state — the condition is binary, not a stack
    assert(afterFirst == afterSecond and afterSecond.grappled)
  }
  
  // Single escape (BWins contest) clears grappled regardless of how many times the condition was applied
  run qa_grapple_single_escape_sufficient_per_spec = {
    val creature = freshCreature(20)
    // Simulate "grappled by two separate grapples" — spec collapses both to one boolean flag
    val doubleGrappled = pApplyCondition(pApplyCondition(creature, CGrappled), CGrappled)
    val escaped = pEscapeGrapple(doubleGrappled, BWins)
    // The spec's binary model: one successful escape removes the condition entirely
    assert(not(escaped.grappled))
  }
  
  // Tie or AWins in escape contest leaves grappled intact (status quo — grappler holds on)
  run qa_grapple_escape_fails_on_tie_or_attacker_wins = {
    val creature = freshCreature(20)
    val grappled = pApplyCondition(creature, CGrappled)
    val afterTie  = pEscapeGrapple(grappled, Tie)
    val afterAWin = pEscapeGrapple(grappled, AWins)
    assert(afterTie.grappled and afterAWin.grappled)
  }
}
