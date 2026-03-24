// Source: https://rpg.stackexchange.com/q/124391
module _qa_3b2abccf19acd2b5 {
  import dnd.* from "./dnd"

  // Can you use an Opportunity Attack on a Marked enemy if you already used your Reaction?
  // Mark OA (DMG p.271) doesn't expend a reaction; blocked only if *prevented* from taking reactions.
  // Spending your reaction does not prevent you — only conditions like incapacitated do.
  run qa_mark_oa_spent_reaction_does_not_prevent = {
    val attacker = freshCreature(20)
    // Attacker already spent their reaction this round (e.g., Shield spell)
    val t1 = pUseReaction(FRESH_TURN)
    // Mark OA eligibility: not(isIncapacitated). Reaction-spent is irrelevant to this check.
    // reactionAvailable is false, but attacker is not incapacitated → Mark OA is still available.
    assert(t1.reactionAvailable == false and not(isIncapacitated(attacker)))
  }
  
  // Incapacitated condition actively *prevents* taking reactions → blocks the Mark OA
  run qa_mark_oa_incapacitated_blocks = {
    val attacker = pApplyCondition(freshCreature(20), CIncapacitated)
    // isIncapacitated is the spec-level gate for "prevented from taking reactions"
    assert(isIncapacitated(attacker))
  }
  
  // Contrast: spent reaction + not incapacitated vs. incapacitated (regardless of reaction state)
  run qa_mark_oa_prevention_is_incapacitation_not_spent_reaction = {
    val fresh = freshCreature(20)
    val spentReactionOnly = pUseReaction(FRESH_TURN)
    val incapAttacker = pApplyCondition(fresh, CIncapacitated)
    // Spent reaction alone does NOT satisfy the "prevented" condition
    val spentButNotPrevented = spentReactionOnly.reactionAvailable == false and not(isIncapacitated(fresh))
    // Incapacitated DOES satisfy the "prevented" condition
    val incapIsPrevented = isIncapacitated(incapAttacker)
    assert(spentButNotPrevented and incapIsPrevented)
  }
}
