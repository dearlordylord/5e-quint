// Source: https://rpg.stackexchange.com/q/67757
module _qa_a2a3febe60b3c3bd {
  import dnd.* from "./dnd"

  // Does Arcane Lock Make An Object More Resistant to Damage?
  // RAW: Arcane Lock raises the break/pick DC by 10 but does NOT change object AC,
  // so attack rolls against the object are completely unaffected by the spell.
  run qa_arcane_lock_does_not_affect_ac = {
    val objectAC          = 15   // e.g. a sturdy wooden door
    val normalBreakDC     = 15
    val arcaneLockDcBonus = 10
    val arcaneLockBreakDC = normalBreakDC + arcaneLockDcBonus  // 25
  
    // Attack roll: Arcane Lock provides no AC bonus, so both rolls resolve identically.
    val d20Attack   = 12   // 12 + 5 = 17, clears AC 15
    val attackBonus = 5
    val hit_normal       = resolveAttackRoll(d20Attack, attackBonus, objectAC, 0)
    val hit_arcaneLocked = resolveAttackRoll(d20Attack, attackBonus, objectAC, 0) // AC unchanged
  
    // Ability check to break: DC rises by 10 under Arcane Lock.
    // Roll that beats DC 15 but not DC 25: 14 + 3 (STR mod) + 2 (prof) = 19.
    val d20Check  = 14
    val strMod    = 3
    val profBonus = 2
    val breakCheck_normal       = checkSucceeds(d20Check, strMod, Proficient, profBonus, 0, normalBreakDC)
    val breakCheck_arcaneLocked = checkSucceeds(d20Check, strMod, Proficient, profBonus, 0, arcaneLockBreakDC)
  
    assert(
      // Attack resolves identically — Arcane Lock never touches AC
      hit_normal == hit_arcaneLocked
      // The attack still hits the object (AC 15, total 17)
      and hit_arcaneLocked.hits
      // A STR check total of 19 breaks a normal door (DC 15)
      and breakCheck_normal
      // The same check total of 19 fails an Arcane Locked door (DC 25)
      and not(breakCheck_arcaneLocked)
    )
  }
}
