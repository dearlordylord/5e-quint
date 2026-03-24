module _qa_eab6fc33cc4564c6 {
  import dnd.* from "./dnd"

  // Calm Emotions suppresses charmed applied after casting—post-cast effects also suppressed
  run qa_calm_emotions_suppresses_post_cast_charmed = {
    val creature = freshCreature(20)
    val ssActive = FRESH_SPELL_SLOTS.with("concentrationSpellId", "calm_emotions")
    // Charmed effect applied AFTER calm emotions was already cast and active
    val charmedAfterCast = pApplyCondition(creature, CCharmed)
    // Suppression: concentration active => remove charmed (any effect, any timing)
    val suppressed = pRemoveCondition(charmedAfterCast, CCharmed)
    assert(isConcentrating(ssActive) and not(suppressed.charmed))
  }
  
  // Calm Emotions suppresses frightened applied after casting for full duration
  run qa_calm_emotions_suppresses_post_cast_frightened = {
    val creature = freshCreature(20)
    val ssActive = FRESH_SPELL_SLOTS.with("concentrationSpellId", "calm_emotions")
    // Frightened effect applied after calm emotions was cast
    val frightenedAfterCast = pApplyCondition(creature, CFrightened)
    // Suppression: concentration active => remove frightened
    val suppressed = pRemoveCondition(frightenedAfterCast, CFrightened)
    assert(isConcentrating(ssActive) and not(suppressed.frightened))
  }
  
  // When Calm Emotions ends, suppressed charmed/frightened resume if their duration not expired
  run qa_calm_emotions_suppressed_effects_resume_on_end = {
    val ssActive = FRESH_SPELL_SLOTS.with("concentrationSpellId", "calm_emotions")
    val creature = freshCreature(20)
    // While active: charmed suppressed (apply then remove)
    val suppressedCreature = pRemoveCondition(pApplyCondition(creature, CCharmed), CCharmed)
    // Calm emotions ends (concentration broken)
    val ssEnded = pBreakConcentration(ssActive)
    // Original charmed effect resumes—caller re-applies it since its duration hadn't expired
    val resumedCreature = pApplyCondition(suppressedCreature, CCharmed)
    assert(not(isConcentrating(ssEnded)) and resumedCreature.charmed)
  }
}
