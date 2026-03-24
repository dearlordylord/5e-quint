// Source: https://rpg.stackexchange.com/q/121744
module _qa_8f6449063533a641 {
  import dnd.* from "./dnd"

  // Does Evasion allow half damage even when unconscious?
  run qa_evasion_unconscious_auto_fails_dex_save = {
    // Unconscious creature automatically fails Dex saves — Evasion triggers but always on the fail branch
    val s0 = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val mods = pSaveModifiers(s0, Dex)
    assert(mods.autoFail)
  }
  
  // Does Evasion allow half damage even when unconscious?
  run qa_evasion_fail_half_damage_at_0hp_one_death_save = {
    // Auto-failed DEX save -> Evasion on fail -> half damage; any damage at 0 HP = 1 death save failure (not 2)
    // AOE/spell effects cannot produce critical hits, so isCritical=false
    val s0 = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    // Simulate Evasion's on-fail half-damage via Fire resistance (10 -> 5 damage)
    val s1 = pTakeDamage(s0, 10, Fire, Set(Fire), Set(), Set(), false)
    assert(s1.deathSaves.failures == 1 and not(s1.dead))
  }
  
  // Does Evasion allow half damage even when unconscious?
  run qa_evasion_half_damage_still_triggers_death_save_not_zero = {
    // Even the smallest halved damage (1) is still damage; must record exactly 1 death save failure
    val s0 = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    // 2 damage halved by Evasion = 1 damage through; still triggers the "any damage = 1 failure" rule
    val s1 = pTakeDamage(s0, 2, Fire, Set(Fire), Set(), Set(), false)
    assert(s1.deathSaves.failures == 1 and not(s1.dead))
  }
}
