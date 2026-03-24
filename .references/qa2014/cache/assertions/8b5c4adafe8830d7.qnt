// Source: https://rpg.stackexchange.com/q/187950
module _qa_8b5c4adafe8830d7 {
  import dnd.* from "./dnd"

  // Is a Dryad able to issue commands to a charmed creature that doesn't understand Sylvan or Elvish?
  run qa_charmed_no_shared_language = {
    val creature = freshCreature(20)
    val charmedCreature = pApplyCondition(creature, CCharmed)
    // Charmed sets only the charmed flag — no psychic bond, no shared language,
    // no incapacitation. Creature retains full cognitive function; communication
    // still requires a common language or nonverbal means.
    assert(
      charmedCreature.charmed == true
      and charmedCreature.incapacitatedSources == Set()
      and not(isIncapacitated(charmedCreature))
      and pCanAct(charmedCreature)
      and pCanSpeak(charmedCreature)
      and charmedCreature.unconscious == false
      and charmedCreature.paralyzed == false
      and charmedCreature.stunned == false
      and charmedCreature.hp == creature.hp
    )
  }
}
