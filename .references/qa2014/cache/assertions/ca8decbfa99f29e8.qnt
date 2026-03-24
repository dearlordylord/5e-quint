// Source: https://rpg.stackexchange.com/q/218269
module _qa_ca8decbfa99f29e8 {
  import dnd.* from "./dnd"

  // Can my familiar hold an action to deliver Cure Wounds to me when I drop to less than 1 HP?
  run qa_dropping_to_0hp_breaks_concentration = {
    // Creature at 10 HP concentrating on the readied spell the familiar would deliver
    val creature = freshCreature(10)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "cure_wounds")
    // Take exactly 10 damage: HP → 0, pTakeDamage applies CUnconscious (overflow=0 < maxHp=10)
    val s1 = pTakeDamage(creature, 10, Slashing, Set(), Set(), Set(), false)
    // Becoming incapacitated (via unconscious) breaks concentration — spell lost before familiar acts
    val ss1 = if (isConcentrating(ss) and isIncapacitated(s1) and not(isIncapacitated(creature)))
                pBreakConcentration(ss)
              else ss
    assert(
      s1.unconscious         and   // dropping to 0 HP forces unconscious
      isIncapacitated(s1)    and   // unconscious implies incapacitated
      not(isConcentrating(ss1))    // concentration broken; familiar has no spell to deliver
    )
  }
}
