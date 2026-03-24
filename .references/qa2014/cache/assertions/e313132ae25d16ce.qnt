module _qa_e313132ae25d16ce {
  import dnd.* from "./dnd"

  // Can you silence a spell? - Silence grants thunder immunity to creatures entirely inside
  run qa_silence_thunder_immunity = {
    val dmg = applyDamageModifiers(15, Thunder, Set(Thunder), Set(), Set())
    assert(dmg == 0)
  }
  
  // Can you silence a spell? - Silence deafens creatures entirely inside the 20-ft sphere
  run qa_silence_deafens_creatures_inside = {
    val c = freshCreature(20)
    val silenced = pApplyCondition(c, CDeafened)
    assert(silenced.deafened == true)
  }
  
  // Can you silence a spell? - Thunderwave (verbal+somatic) blocked when creature cannot speak (Silence effect)
  run qa_silence_blocks_thunderwave_verbal = {
    // Paralyzed models "cannot produce sound/speech"; pCanSpeak returns false
    val c = freshCreature(20)
        .with("paralyzed", true)
        .with("incapacitatedSources", Set(ISParalyzed))
    val canCast = pCanProvideComponents(c, true, true, true)
    assert(canCast == false)
  }
  
  // Can you silence a spell? - Thunderclap (somatic only) component check passes even without verbal
  run qa_silence_thunderclap_somatic_only_ok = {
    // Thunderclap has no verbal component, so silence does not block it at the components level
    val c = freshCreature(20)
        .with("paralyzed", true)
        .with("incapacitatedSources", Set(ISParalyzed))
    val canCast = pCanProvideComponents(c, false, true, true)
    assert(canCast == true)
  }
}
