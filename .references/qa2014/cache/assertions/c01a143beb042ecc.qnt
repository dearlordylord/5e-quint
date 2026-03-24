// Source: https://rpg.stackexchange.com/q/69266
module _qa_c01a143beb042ecc {
  import dnd.* from "./dnd"

  // Thunderbolt strike vs grapple: forced movement removing grappler from reach ends the grappled condition
  run qa_forced_movement_ends_grapple = {
    // Cleric is hit by Constrict: grappled and restrained
    val cleric = freshCreature(30)
    val afterConstrict = pApplyCondition(pApplyCondition(cleric, CGrappled), CRestrained)
    // Thunderbolt Strike pushes the yuan-ti out of reach → grapple ends via pReleaseGrapple
    val afterForcedMove = pReleaseGrapple(afterConstrict)
    assert(
      // Grappled condition is removed once grappler leaves reach
      not(afterForcedMove.grappled)
    )
  }
}
