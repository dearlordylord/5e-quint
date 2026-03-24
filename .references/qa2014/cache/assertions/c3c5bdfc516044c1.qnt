// Source: https://rpg.stackexchange.com/q/118625
module _qa_c3c5bdfc516044c1 {
  import dnd.* from "./dnd"

  // Does an asleep creature (affected by Sleep spell) wake up if entangled with Entangle?
  // RAW: No — Entangle causes no damage and damage is the only relevant wake trigger here.
  run qa_sleep_not_woken_by_entangle = {
    // Simulate a Sleep-spell victim: unconscious but HP intact (Sleep doesn't deal damage)
    val asleep = freshCreature(20)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    // Entangle applies Restrained — no damage dealt, no wake-up trigger
    val afterEntangle = pApplyCondition(asleep, CRestrained)
    assert(
      // Creature is still unconscious (Sleep not broken)
      afterEntangle.unconscious == true and
      // Creature is now also restrained (vines grabbed it)
      afterEntangle.restrained == true
    )
  }
  
  // Unconscious creatures auto-fail STR saves (PHB p.292), so Entangle's STR save is auto-failed
  run qa_sleep_creature_autofails_str_save_for_entangle = {
    val asleep = freshCreature(20)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val mods = pSaveModifiers(asleep, Str)
    assert(mods.autoFail == true)
  }
}
