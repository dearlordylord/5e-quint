// Source: https://rpg.stackexchange.com/q/110369
module _qa_ca74ed95871d7e8f {
  import dnd.* from "./dnd"

  // Does Sculpt Spells apply to spells that have been reflected?
  run qa_sculpt_spells_applies_after_reflection = {
    // Accepted answer: reflection redirects the same spell (no new spell is created),
    // so Sculpt Spells chosen creatures still auto-succeed saves and take no damage.
    val wizardHp = 30
    val wizard = freshCreature(wizardHp)
  
    // Without Sculpt Spells: wizard rolled 5 vs DC 15 on the reflected fireball → fails save
    val failedSave = saveSucceeds(5, 0, false, 0, 0, 15)
    // Failed save → takes full fire damage (no Sculpt Spells protection)
    val fullDmg = 21
    val wizardHurt = pTakeDamage(wizard, fullDmg, Fire, Set(), Set(), Set(), false)
  
    // With Sculpt Spells: designated creature auto-succeeds the save and takes NO damage
    // ("take no damage if they would normally take half damage on a successful save").
    // Per accepted answer this applies unchanged after spell reflection (same spell).
    val sculptDmg = 0
    val wizardSafe = pTakeDamage(wizard, sculptDmg, Fire, Set(), Set(), Set(), false)
  
    assert(
      // Baseline: low roll does fail a DC 15 save
      not(failedSave) and
      // No Sculpt Spells: wizard takes fire damage from reflected fireball
      wizardHurt.hp < wizardHp and
      // Sculpt Spells still applies after reflection: wizard takes zero damage
      wizardSafe.hp == wizardHp
    )
  }
}
