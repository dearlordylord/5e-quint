// Source: https://rpg.stackexchange.com/q/64711
module _qa_bf7103e8820fd149 {
  import dnd.* from "./dnd"

  // When is entropic ward considered "used"? — reaction consumed on use, not contingent on miss
  run qa_entropic_ward_used_on_reaction = {
      val t = FRESH_TURN
      // Warlock uses reaction (Entropic Ward) to impose disadvantage on the incoming roll
      val afterReaction = pUseReaction(t)
      // Case A: attacker misses (roll 3 + bonus 5 = 8 vs AC 12) — feature already spent
      val missResult = resolveAttackRoll(3, 5, 12, 0)
      // Case B: attacker hits (roll 15 + bonus 5 = 20 vs AC 12) — feature equally spent
      val hitResult = resolveAttackRoll(15, 5, 12, 0)
      assert(
          // Reaction is gone the moment it was used, regardless of hit/miss outcome
          not(afterReaction.reactionAvailable)
          and not(missResult.hits)   // miss case confirmed
          and hitResult.hits         // hit case confirmed
      )
  }
}
