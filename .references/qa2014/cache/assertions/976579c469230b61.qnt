// Source: https://rpg.stackexchange.com/q/211636
module _qa_976579c469230b61 {
  import dnd.* from "./dnd"

  // Can Blindness/Deafness from Find Familiar be removed by Lesser Restoration?
  // Accepted answer: Lesser Restoration technically removes the condition, but the ongoing
  // spell effect immediately reapplies it — net result is the creature remains blinded/deafened.
  run qa_lesser_restoration_cannot_remove_find_familiar_blindness = {
    val creature = freshCreature(20)
    // Step 1: Find Familiar "see through familiar's eyes" applies blinded + deafened
    val afterFindFamiliar = pApplyCondition(pApplyCondition(creature, CBlinded), CDeafened)
    // Step 2: Lesser Restoration removes the blinded condition (it technically works)
    val afterLesserRestoration = pRemoveCondition(afterFindFamiliar, CBlinded)
    // Intermediate: blinded is gone, deafened persists
    val midCheck = afterLesserRestoration.blinded == false and afterLesserRestoration.deafened == true
    // Step 3: The still-active Find Familiar effect immediately reapplies blinded
    val afterReapplication = pApplyCondition(afterLesserRestoration, CBlinded)
    // Net result: creature is still blinded and deafened — Lesser Restoration did nothing lasting
    assert(midCheck and afterReapplication.blinded == true and afterReapplication.deafened == true)
  }
}
