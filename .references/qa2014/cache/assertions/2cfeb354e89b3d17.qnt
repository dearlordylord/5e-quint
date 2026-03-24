// Source: https://rpg.stackexchange.com/q/177732
module _qa_2cfeb354e89b3d17 {
  import dnd.* from "./dnd"

  // Can a Way of the Astral Self monk grapple with its Arms of the Astral Self?
  // Accepted: grapple and shove are not unarmed strikes; they resolve via contested checks, not attack rolls
  run qa_grapple_uses_contest_not_unarmed_strike = {
    val target = freshCreature(20)
    val win  = pGrapple(Medium, Medium, target, AWins, true)
    val lose = pGrapple(Medium, Medium, target, BWins, true)
    val tie  = pGrapple(Medium, Medium, target, Tie,   true)
    assert(
      win.success  and     win.targetState.grappled
      and not(lose.success) and not(lose.targetState.grappled)
      and not(tie.success)  and not(tie.targetState.grappled)
    )
  }
  
  // Shove likewise resolves as a contest, not as an unarmed strike attack roll
  run qa_shove_uses_contest_not_unarmed_strike = {
    val target = freshCreature(20)
    val win  = pShove(Medium, Medium, target, AWins, ShoveProne)
    val lose = pShove(Medium, Medium, target, BWins, ShoveProne)
    val tie  = pShove(Medium, Medium, target, Tie,   ShoveProne)
    assert(
      win.success  and     win.targetState.prone
      and not(lose.success) and not(lose.targetState.prone)
      and not(tie.success)  and not(tie.targetState.prone)
    )
  }
  
  // Unarmed strike uses attack-roll resolution (mechanically distinct from grapple/shove)
  run qa_unarmed_strike_uses_attack_roll_not_contest = {
    // nat20 always hits and crits regardless of AC — pure attack-roll mechanic
    val atkHit  = resolveAttackRoll(20, 5, 20, 0)
    // nat1 always misses — pure attack-roll mechanic
    val atkMiss = resolveAttackRoll(1, 99, 5, 0)
    // damage = 1 + STR mod (bludgeoning), no contest involved
    val dmg = unarmedDamage(3)
    assert(
      atkHit.hits and atkHit.isCritical
      and not(atkMiss.hits)
      and dmg == 4
    )
  }
}
