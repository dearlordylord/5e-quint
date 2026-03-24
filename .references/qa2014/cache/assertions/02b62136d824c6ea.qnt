// Source: https://rpg.stackexchange.com/q/121679
module _qa_02b62136d824c6ea {
  import dnd.* from "./dnd"

  // Wildshape while "wearing" a living creature: only equipment merges, creatures are dropped
  run qa_wildshape_creature_not_merged = {
    // A creature being held/worn (e.g. a snake) is NOT equipment and cannot merge into Wild Shape.
    // The living creature must be dropped — it is not grappled by the spec's grapple mechanic,
    // but we can model the closest analogue: a grappled tiny creature is released on transform.
    // We verify that pReleaseGrapple correctly removes CGrappled from the held creature,
    // representing the mandatory drop of a non-equipment creature during Wild Shape.
    val heldCreature = pApplyCondition(freshCreature(3), CGrappled)
    val afterWildShape = pReleaseGrapple(heldCreature)
    assert(
      heldCreature.grappled == true
      and afterWildShape.grappled == false
      and afterWildShape.hp == heldCreature.hp
    )
  }
}
