// Source: https://rpg.stackexchange.com/q/177781
module _qa_7b9602577e02b546 {
  import dnd.* from "./dnd"

  // Can a player controlling an NPC use its Legendary Actions?
  // Accepted answer: Charmed (Dominate Monster) does NOT incapacitate the creature;
  // it retains full action capability — a prerequisite for legendary action access under total control.
  run qa_charmed_not_incapacitated = {
    val creature = freshCreature(50)
    val charmed = pApplyCondition(creature, CCharmed)
    assert(
      charmed.charmed == true
      and not(isIncapacitated(charmed))
      and pCanAct(charmed)
      and charmed.incapacitatedSources.size() == 0
    )
  }
}
