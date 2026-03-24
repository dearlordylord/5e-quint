// Source: https://rpg.stackexchange.com/q/136953
module _qa_04ac48940a434ed2 {
  import dnd.* from "./dnd"

  // When does the Death Saving Throw happen w.r.t. sources of automatic ongoing damage?
  // Accepted answer: simultaneous by default (DM fiat); Xanathar's optional rule lets the
  // controlling player choose order — they pick death save first for the favorable outcome.
  run qa_simultaneous_death_save_and_damage_order = {
    // Creature at 0 HP, unconscious, with 2 existing death save failures (1 more = dead).
    // Models: start of turn, both a death save AND ongoing fire damage are triggered.
    val s0 = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 0, failures: 2 })
  
    // Order A — damage first (unfavorable, DM might rule this):
    // ongoing fire damage at 0 HP adds 1 failure → 3 failures → instant death.
    // Player never gets to roll.
    val orderA_after_damage = pTakeDamage(s0, 5, Fire, Set(), Set(), Set(), false)
  
    // Order B — death save first (Xanathar's: player chooses favorable order):
    // nat 20 → regain 1 HP, remove unconscious, reset death saves.
    val orderB_after_save = pDeathSave(s0, 20)
    // Then the ongoing fire damage hits: drops from 1 HP back to 0 HP → unconscious again,
    // but death saves are fresh — creature is NOT dead, just back to dying.
    val orderB_after_damage = pTakeDamage(orderB_after_save, 5, Fire, Set(), Set(), Set(), false)
  
    assert(
      // Order A: the 3rd failure kills the creature before it can roll
      orderA_after_damage.dead == true
      // Order B: nat-20 death save first grants 1 HP (conscious, saves reset)
      and orderB_after_save.hp == 1
      and orderB_after_save.dead == false
      and orderB_after_save.unconscious == false
      and orderB_after_save.deathSaves.failures == 0
      // subsequent fire damage knocks them back down but does not kill them
      and orderB_after_damage.dead == false
      and orderB_after_damage.hp == 0
      and orderB_after_damage.unconscious == true
    )
  }
}
