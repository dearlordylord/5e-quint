// Source: https://rpg.stackexchange.com/q/120727
module _qa_48db06f5067b0d3e {
  import dnd.* from "./dnd"

  // What is the 5e wizard equivalent of the Still Spell and Silent Spell feats from 3.5e?
  // Core RAW: spells require verbal (need speech) and somatic (need free hand) components — no PHB wizard bypass exists.
  
  // Baseline: a conscious, unimpaired caster with a free hand can provide both V and S components.
  run qa_verbal_and_somatic_require_speech_and_free_hand = {
    val creature = freshCreature(20)
    val canCastNormally = pCanProvideComponents(creature, true, true, true)
    assert(canCastNormally)
  }
  
  // Verbal component requires ability to speak; a paralyzed creature cannot speak and thus cannot provide it.
  run qa_paralyzed_cannot_provide_verbal_component = {
    val creature = pApplyCondition(freshCreature(20), CParalyzed)
    // requiresVerbal=true, requiresSomatic=false, hasFreeHand=true
    val canProvide = pCanProvideComponents(creature, true, false, true)
    assert(not(canProvide))
  }
  
  // Somatic component requires a free hand; without one the component cannot be provided.
  run qa_no_free_hand_blocks_somatic_component = {
    val creature = freshCreature(20)
    // requiresVerbal=false, requiresSomatic=true, hasFreeHand=false
    val canProvide = pCanProvideComponents(creature, false, true, false)
    assert(not(canProvide))
  }
  
  // Both components fail when creature is unconscious (can't speak) and has no free hand.
  run qa_unconscious_no_hand_blocks_both_components = {
    val creature = freshCreature(20).with("hp", 0)
                                    .with("unconscious", true)
                                    .with("prone", true)
                                    .with("incapacitatedSources", Set(ISUnconscious))
    val canProvide = pCanProvideComponents(creature, true, true, false)
    assert(not(canProvide))
  }
}
