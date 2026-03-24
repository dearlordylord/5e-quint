// Source: https://rpg.stackexchange.com/q/213927
module _qa_b1f670de8562b2a2 {
  import dnd.* from "./dnd"

  // Can you grapple a creature as an Opportunity Attack?
  run qa_grapple_as_opportunity_attack = {
    val target = freshCreature(20)
    // Target is moving and not disengaged — eligible to trigger an OA
    val targetTurn = FRESH_TURN.with("disengaged", false)
    // Attacker has reaction available (start of round)
    val attackerTurn = FRESH_TURN  // reactionAvailable: true by default
  
    // OA eligibility: target not disengaged, attacker reaction intact
    val oaEligible = pCanBeOpportunityAttacked(targetTurn) and attackerTurn.reactionAvailable
  
    // Attacker spends reaction to make the OA, then executes grapple as Unarmed Strike
    val afterReaction = pUseReaction(attackerTurn)
    // AWins = attacker wins contest / target fails saving throw; free hand available
    val grappleResult = pGrapple(Medium, Medium, target, AWins, true)
  
    assert(
      // OA was legally available
      oaEligible and
      // Reaction is consumed by the OA
      not(afterReaction.reactionAvailable) and
      // Grapple (Unarmed Strike) as OA succeeds and applies Grappled condition
      grappleResult.success and
      grappleResult.targetState.grappled
    )
  }
}
