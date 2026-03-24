// Source: https://rpg.stackexchange.com/q/144148
module _qa_9e769e1cad51cda6 {
  import dnd.* from "./dnd"

  // Can you replace a racial trait cantrip when leveling up?
  run qa_cannot_replace_cantrip_no_level0_slots = {
    // Accepted answer: warlock spell replacement requires "a level for which you have spell
    // slots." Cantrips are spell level 0; pSlotsPerLevel falls through to 0 for level 0
    // at every caster level — no 0th-level slots exist, so cantrips can never be replaced.
    assert(1.to(20).forall(cl => pSlotsPerLevel(cl, 0) == 0))
  }
}
