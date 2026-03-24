// Source: https://rpg.stackexchange.com/q/179659
module _qa_89b027759045d463 {
  import dnd.* from "./dnd"

  // How would a druid protect their campsite for the night? — 6th-level druid spell slot table (4/3/3)
  run qa_druid_lv6_spell_slots = {
    assert(
      pSlotsPerLevel(6, 1) == 4 and
      pSlotsPerLevel(6, 2) == 3 and
      pSlotsPerLevel(6, 3) == 3 and
      pSlotsPerLevel(6, 4) == 0
    )
  }
  
  // How would a druid protect their campsite for the night? — successful long rest (with food) restores HP and removes one exhaustion level
  run qa_long_rest_restores_hp_and_exhaustion = {
    val druid = freshCreature(40).with("hp", 20).with("exhaustion", 1).with("hitDiceRemaining", 3)
    val afterRest = pLongRest(druid, 6, true)
    assert(afterRest.hp == 40 and afterRest.exhaustion == 0)
  }
  
  // How would a druid protect their campsite for the night? — downed party member (hp 0) gets no long rest benefit; protection is essential
  run qa_downed_creature_no_long_rest = {
    val downed = freshCreature(20).with("hp", 0)
      .with("unconscious", true).with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val afterRest = pLongRest(downed, 5, true)
    assert(afterRest.hp == 0)
  }
  
  // How would a druid protect their campsite for the night? — concentration watch spell (conjure animals) breaks on a failed save after taking damage
  run qa_watch_spell_concentration_breaks_on_failed_save = {
    val watchSlots = FRESH_SPELL_SLOTS.with("concentrationSpellId", "conjure_animals")
    val afterHit = pConcentrationCheck(watchSlots, false)
    assert(afterHit.concentrationSpellId == "")
  }
  
  // How would a druid protect their campsite for the night? — darkvision on watch converts darkness to dim-light equivalent (lightly obscured)
  run qa_darkvision_watch_in_dark = {
    val obs = pEffectiveObscurement(Dark, true)
    assert(obs == LightlyObscured)
  }
}
