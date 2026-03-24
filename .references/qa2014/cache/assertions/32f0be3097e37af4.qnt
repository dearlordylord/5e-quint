// Source: https://rpg.stackexchange.com/q/121165
module _qa_32f0be3097e37af4 {
  import dnd.* from "./dnd"

  // Can I cast spells with one hand and wield a sword with another?
  run qa_somatic_free_hand_permits_casting = {
    val creature = freshCreature(20)
    // PHB: somatic requires free use of at least one hand
    // Warlock: sword in one hand, other hand free → somatic satisfied
    assert(pCanProvideComponents(creature, false, true, true))
  }
  
  // Can I cast spells with one hand and wield a sword with another?
  run qa_somatic_no_free_hand_prevents_casting = {
    val creature = freshCreature(20)
    // Both hands occupied, no arcane focus → somatic component cannot be performed
    assert(not(pCanProvideComponents(creature, false, true, false)))
  }
  
  // Can I cast spells with one hand and wield a sword with another? (V+S spell needs both)
  run qa_verbal_somatic_requires_speech_and_free_hand = {
    val creature = freshCreature(20)
    // V+S spell: conscious creature with free hand → can cast
    // V+S spell: conscious creature without free hand → blocked by somatic
    val withHand = pCanProvideComponents(creature, true, true, true)
    val noHand   = pCanProvideComponents(creature, true, true, false)
    assert(withHand and not(noHand))
  }
  
  // Can I cast spells with one hand and wield a sword with another? (focus hand counts for S+M)
  run qa_sm_focus_hand_satisfies_somatic = {
    val creature = freshCreature(20)
    // PHB: hand holding a spellcasting focus can be the same hand used for somatic gestures
    // → hasFreeHand=true models the focus-holding hand; S+M spell resolves with one hand
    val smSpellWithFocusHand = pCanProvideComponents(creature, false, true, true)
    assert(smSpellWithFocusHand)
  }
}
