// Source: https://rpg.stackexchange.com/q/159502
module _qa_47b34b792d6c9c34 {
  import dnd.* from "./dnd"

  // How do Suggestion and Subtle Spell work together?
  // Rule: Subtle Spell removes the V component barrier but NOT the need to speak
  // the suggestion sentence — pCanProvideComponents(V=false) can pass while pCanSpeak fails.
  run qa_subtle_spell_suggestion_still_requires_speech = {
    val conscious = freshCreature(10)
    // pApplyCondition handles incapacitatedSources automatically for CUnconscious
    val unconscious = pApplyCondition(freshCreature(10), CUnconscious)
    // paralyzed also can't speak — same principle applies
    val paralyzed = pApplyCondition(freshCreature(10), CParalyzed)
  
    // Subtle Spell: requiresVerbal=false, requiresSomatic=false
    // Conscious caster: component check passes AND speech for suggestion is available
    val consciousComponentsOk     = pCanProvideComponents(conscious,   false, false, false)
    val consciousCanSpeak          = pCanSpeak(conscious)
  
    // Unconscious caster: Subtle Spell makes component check pass (no V required),
    // but the suggestion sentence itself still requires pCanSpeak — which fails
    val unconsciousComponentsOk   = pCanProvideComponents(unconscious, false, false, false)
    val unconsciousCanSpeak        = pCanSpeak(unconscious)
  
    // Paralyzed caster: same split — components ok with Subtle Spell, speech blocked
    val paralyzedComponentsOk     = pCanProvideComponents(paralyzed,   false, false, false)
    val paralyzedCanSpeak          = pCanSpeak(paralyzed)
  
    // For contrast: without Subtle Spell (requiresVerbal=true), unconscious fails
    // BOTH the component check AND the speech check — Subtle Spell only helps with one.
    val unconsciousNormalV         = pCanProvideComponents(unconscious, true, false, false)
  
    assert(
      // Conscious: can cast and can deliver the suggestion
      consciousComponentsOk and consciousCanSpeak
      // Unconscious: Subtle Spell clears component gate, but speech gate still blocks
      and unconsciousComponentsOk and not(unconsciousCanSpeak)
      // Without Subtle Spell, unconscious fails both gates
      and not(unconsciousNormalV) and not(unconsciousCanSpeak)
      // Paralyzed: same as unconscious — component gate cleared, speech gate blocks
      and paralyzedComponentsOk and not(paralyzedCanSpeak)
    )
  }
}
