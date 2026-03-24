// Source: https://rpg.stackexchange.com/q/176350
module _qa_18c185f9d2e34e87 {
  import dnd.* from "./dnd"

  // Banshee's Wail failed save (drop to 0 HP) is not damage; Arcane Ward (modeled as tempHP) unaffected
  run qa_arcane_ward_survives_banshee_wail = {
    val wardHp = 10
    val wizard = freshCreature(20).with("tempHp", wardHp)
    // Wail on failed save: "drop to 0 HP" — not a damage effect, bypasses pTakeDamage entirely
    val wailed = pApplyCondition(wizard.with("hp", 0), CUnconscious)
    // Ward (tempHP) is intact; wizard unconscious at 0 HP
    assert(wailed.tempHp == wardHp and wailed.hp == 0 and wailed.unconscious)
  }
  
  // Arcane Ward (tempHP) still absorbs damage at 0 HP, preventing death save failures
  run qa_arcane_ward_absorbs_damage_at_0hp = {
    val wizard = freshCreature(20)
      .with("hp", 0)
      .with("tempHp", 10)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    // While unconscious, takes 5 slashing damage — ward absorbs all of it
    val afterDamage = pTakeDamage(wizard, 5, Slashing, Set(), Set(), Set(), false)
    assert(afterDamage.deathSaves.failures == 0 and afterDamage.tempHp == 5 and afterDamage.hp == 0)
  }
  
  // Without the ward at 0 HP, the same damage adds a death save failure
  run qa_no_ward_damage_at_0hp_causes_ds_failure = {
    val wizard = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val afterDamage = pTakeDamage(wizard, 5, Slashing, Set(), Set(), Set(), false)
    assert(afterDamage.deathSaves.failures == 1 and afterDamage.tempHp == 0)
  }
}
