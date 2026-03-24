// Source: https://rpg.stackexchange.com/q/116821
module _qa_370803b572db291c {
  import dnd.* from "./dnd"

  // Does a failed Stabilize action count as a failed death saving throw?
  run qa_failed_stabilize_no_death_save_failure = {
    // Dying creature at 0 HP with 1 existing death save failure
    val dying = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 0, failures: 1 })
  
    // Per PHB pp.197-198: a failed Medicine check to stabilize has NO adverse effect —
    // it does not add a death save failure to the dying creature.
    // Model: failed stabilize = pStabilize not applied; state is unchanged.
    val afterFailedStabilize = dying
  
    // Contrast: a successful stabilize resets saves and sets stable, but never increments failures.
    val afterSuccessfulStabilize = pStabilize(dying)
  
    assert(
      // Failed attempt: death save failures unchanged (not incremented by failure)
      afterFailedStabilize.deathSaves.failures == 1
      // Successful stabilize: stable=true, saves reset to 0 (not incremented either)
      and afterSuccessfulStabilize.stable == true
      and afterSuccessfulStabilize.deathSaves.failures == 0
      // In neither case does the stabilize attempt add a death save failure
      and afterFailedStabilize.deathSaves.failures == dying.deathSaves.failures
    )
  }
}
