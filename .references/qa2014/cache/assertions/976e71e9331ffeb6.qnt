// Source: https://rpg.stackexchange.com/q/182022
module _qa_976e71e9331ffeb6 {
  import dnd.* from "./dnd"

  // What happens when an aboleth enslaves another aboleth who's enslaved a werewolf?
  // Key ruling: CCharmed does NOT incapacitate — a charmed aboleth 1 can still act and speak,
  // so aboleth 2's commands can flow indirectly through aboleth 1 to the werewolf.
  run qa_charmed_creature_can_act_and_relay_commands = {
    // Aboleth 1 enslaved (charmed) by Aboleth 2
    val aboleth1 = pApplyCondition(freshCreature(50), CCharmed)
    // Werewolf enslaved (charmed) by Aboleth 1
    val werewolf = pApplyCondition(freshCreature(30), CCharmed)
    assert(
      // Aboleth 1 is charmed but NOT incapacitated — it retains the ability to act
      // and speak, which is what makes the indirect command chain possible
      aboleth1.charmed == true
      and not(isIncapacitated(aboleth1))
      and pCanAct(aboleth1)
      and pCanSpeak(aboleth1)
      // Werewolf is charmed but also still capable of acting (can receive and obey commands)
      and werewolf.charmed == true
      and not(isIncapacitated(werewolf))
      and pCanAct(werewolf)
      and pCanSpeak(werewolf)
    )
  }
}
