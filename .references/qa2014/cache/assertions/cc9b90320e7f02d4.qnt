// Source: https://rpg.stackexchange.com/q/176814
module _qa_cc9b90320e7f02d4 {
  import dnd.* from "./dnd"

  // Can an orthon use its Explosive Retribution if it is reduced from 16+ HP to 0 HP at once?
  run qa_reaction_blocked_at_0hp = {
    // Creature at 20 HP (above 15-HP threshold) takes exactly 20 damage in one hit
    val creature = freshCreature(20)
    val s1 = pTakeDamage(creature, 20, Bludgeoning, Set(), Set(), Set(), false)
    // PHB/DMG: reaction with unspecified timing fires AFTER trigger completes.
    // At 0 HP the trigger (drop below 16 HP) is resolved; creature is now
    // unconscious → incapacitated → cannot take reactions.
    assert(
      s1.hp == 0
      and s1.unconscious
      and isIncapacitated(s1)
      and not(pCanAct(s1))
    )
  }
}
