// Source: https://rpg.stackexchange.com/q/212677
module _qa_0e8f28dae2267210 {
  import dnd.* from "./dnd"

  // Is removing the frightened condition the same as making a successful saving throw when it comes to immunity from the effect?
  run qa_condition_removal_not_same_as_save_for_immunity = {
    val creature = freshCreature(20)
    // Narzugon Terrifying Command applies frightened on failed save
    val afterTerrify = pApplyCondition(creature, CFrightened)
    // Twilight Sanctuary removes frightened — not a saving throw, grants no immunity
    val afterSanctuary = pRemoveCondition(afterTerrify, CFrightened)
    // Narzugon uses Terrifying Command again next turn; creature has no immunity, so frightened re-applies
    val afterReTerrify = pApplyCondition(afterSanctuary, CFrightened)
    assert(afterReTerrify.frightened == true)
  }
}
