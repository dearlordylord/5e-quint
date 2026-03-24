// Source: https://rpg.stackexchange.com/q/58551
module _qa_6228367883569b1a {
  import dnd.* from "./dnd"

  // Can I use a Familiar or a Ranger Companion as temporary mount?
  run qa_panther_push_drag_lift_capacity = {
    // Panther STR 14 can push/drag/lift 30×STR = 420 lbs (well over a ~95 lb elf)
    assert(pushDragLift(14, Medium) == 420)
  }
  
  // Can I use a Familiar or a Ranger Companion as temporary mount?
  run qa_panther_drag_elf_within_capacity = {
    // A 95-lb elf is within the panther's push/drag/lift limit
    assert(pushDragLift(14, Medium) >= 95)
  }
  
  // Can I use a Familiar or a Ranger Companion as temporary mount?
  run qa_panther_cannot_be_ridden_same_size = {
    // Mount must be at least one size larger than rider; Medium panther cannot carry Medium rider
    val mountSize = Medium
    val riderSize = Medium
    assert(not(sizeOrd(mountSize) >= sizeOrd(riderSize) + 1))
  }
}
