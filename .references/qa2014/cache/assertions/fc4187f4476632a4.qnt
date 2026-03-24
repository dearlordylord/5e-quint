// Source: https://rpg.stackexchange.com/q/137667
module _qa_fc4187f4476632a4 {
  import dnd.* from "./dnd"

  // Do constructs need air to survive? — Constructs without 'Constructed Nature' are subject to normal suffocation rules
  run qa_construct_needs_air_without_constructed_nature = {
    val creature = freshCreature(20)
    val suffocated = pSuffocate(creature)
    assert(suffocated.hp == 0 and suffocated.unconscious and not(suffocated.dead))
  }
}
