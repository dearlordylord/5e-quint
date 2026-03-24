// Source: https://rpg.stackexchange.com/q/105568
module _qa_572ae8d136927e5c {
  import dnd.* from "./dnd"

  // Does it require a free hand to use a Touch spell?
  // Accepted answer: no RAW rule requires a free hand for touch range; only Somatic components impose a free-hand requirement
  run qa_touch_spell_no_free_hand_rule = {
    val creature = freshCreature(20)
    // Somatic (S) component blocks casting without a free hand
    val somatic_blocked = not(pCanProvideComponents(creature, false, true, false))
    // Touch-range spell with no Somatic component: no free-hand requirement (touch range not a separate rule)
    val touch_no_somatic_ok = pCanProvideComponents(creature, false, false, false)
    assert(somatic_blocked and touch_no_somatic_ok)
  }
}
