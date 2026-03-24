// Source: https://rpg.stackexchange.com/q/208935
module _qa_5ccf15ae431aa474 {
  import dnd.* from "./dnd"

  // Does Remarkable Recovery trigger on third successful death save? — Yes: self-stabilization via saves is identical to external stabilization
  run qa_remarkable_recovery_self_stabilize = {
    // Creature at 0 HP, 2 death save successes already accumulated
    val dying = freshCreature(10)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 2, failures: 0 })
    // Third successful death save (roll 10+) triggers self-stabilization
    val afterThirdSave = pDeathSave(dying, 10)
    // External stabilization (e.g. Medicine check / healer's kit) on an equivalent creature
    val dyingFresh = freshCreature(10)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val afterExternalStabilize = pStabilize(dyingFresh)
    // Accepted answer: both paths produce stable == true; the feat triggers in both cases
    assert(
      afterThirdSave.stable == true
      and afterThirdSave.deathSaves.successes == 0
      and afterThirdSave.deathSaves.failures == 0
      and afterExternalStabilize.stable == true
      and afterExternalStabilize.deathSaves.successes == 0
      and afterExternalStabilize.deathSaves.failures == 0
    )
  }
  
  // Accepted answer: rolling each of three sequential death saves (all >= 10) reaches stable == true
  run qa_remarkable_recovery_three_sequential_saves = {
    val dying = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 0, failures: 0 })
    val after1 = pDeathSave(dying, 11)
    val after2 = pDeathSave(after1, 14)
    val after3 = pDeathSave(after2, 10)
    // Three successes → stable, still at 0 HP (Remarkable Recovery would then trigger healing)
    assert(after3.stable == true and after3.hp == 0 and after3.dead == false)
  }
}
