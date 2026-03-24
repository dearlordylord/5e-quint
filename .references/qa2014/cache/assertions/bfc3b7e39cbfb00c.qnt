// Source: https://rpg.stackexchange.com/q/83015
module _qa_bfc3b7e39cbfb00c {
  import dnd.* from "./dnd"

  // Verbal components require specific sounds (PHB p.203: "particular combination of sounds...sets the threads of magic in motion")
  run qa_verbal_components_require_speech = {
    val healthy = freshCreature(20)
    assert(pCanProvideComponents(healthy, true, false, false))
  }
  
  // Verbal components: paralysis silences the caster, blocking verbal component production
  run qa_verbal_blocked_by_paralysis = {
    val paralyzed = pApplyCondition(freshCreature(20), CParalyzed)
    assert(not(pCanProvideComponents(paralyzed, true, false, false)))
  }
  
  // Verbal components: unconscious creature cannot produce the required sounds
  run qa_verbal_blocked_by_unconscious = {
    val unconscious = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    assert(not(pCanProvideComponents(unconscious, true, false, false)))
  }
  
  // Verbal components: petrification (turned to stone) prevents speech, blocking verbal casting
  run qa_verbal_blocked_by_petrification = {
    val petrified = pApplyCondition(freshCreature(20), CPetrified)
    assert(not(pCanProvideComponents(petrified, true, false, false)))
  }
  
  // Deafness does not block verbal components: caster produces the resonant sounds even if unable to hear them
  run qa_verbal_not_blocked_by_deafness = {
    val deafened = pApplyCondition(freshCreature(20), CDeafened)
    assert(pCanProvideComponents(deafened, true, false, false))
  }
  
  // Non-verbal spells cast freely even when paralyzed (no speech required, weave manipulation is not sound-dependent)
  run qa_nonverbal_spell_unaffected_by_paralysis = {
    val paralyzed = pApplyCondition(freshCreature(20), CParalyzed)
    // somatic also blocked by paralysis (no free hand), but a pure material-only spell (no V, no S) is fine
    assert(pCanProvideComponents(paralyzed, false, false, false))
  }
}
