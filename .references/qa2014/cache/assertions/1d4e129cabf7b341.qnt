module _qa_1d4e129cabf7b341 {
  import dnd.* from "./dnd"

  // In D&D 5e, do most wands no longer require command words?
  run qa_wand_no_components_by_default = {
    // Rule: spells from magic items require no components unless item description says otherwise.
    // Most wands need no command word (verbal=false); Wand of Enemy Detection is the sole exception.
    // A paralyzed creature (cannot speak) can activate a standard wand but not Wand of Enemy Detection.
    val silenced = freshCreature(20)
      .with("paralyzed", true)
      .with("incapacitatedSources", Set(ISParalyzed))
    val canActivateStandardWand    = pCanProvideComponents(silenced, false, false, false)
    val canActivateEnemyDetection  = pCanProvideComponents(silenced, true,  false, false)
    assert(canActivateStandardWand and not(canActivateEnemyDetection))
  }
  
  // In D&D 5e, do most wands no longer require command words?
  run qa_speaking_creature_can_use_any_wand = {
    // A creature that can speak satisfies both the no-component case (standard wand)
    // and the command-word case (Wand of Enemy Detection).
    val creature = freshCreature(20)
    val canActivateStandardWand   = pCanProvideComponents(creature, false, false, false)
    val canActivateEnemyDetection = pCanProvideComponents(creature, true,  false, false)
    assert(canActivateStandardWand and canActivateEnemyDetection)
  }
}
