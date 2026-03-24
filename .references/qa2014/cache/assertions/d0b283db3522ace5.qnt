// Source: https://rpg.stackexchange.com/q/90860
module _qa_d0b283db3522ace5 {
  import dnd.* from "./dnd"

  // Are effects that activate "on a 20" by definition "critical effects"?
  // Accepted: No. "Roll a 20" effects (e.g. Sword of Sharpness +14) check d20Roll == 20;
  // critical hit effects (extra dice) check isCritical. Improved Critical makes roll 18
  // a critical hit (isCritical: true) but does NOT trigger "roll a 20" effects.
  run qa_nat20_vs_critical_hit_distinction = {
    // resolveAttackRoll: only d20Roll == 20 sets isCritical = true (base rules)
    val nat20Result    = resolveAttackRoll(20, 3, 15, 0)
    val roll18Result   = resolveAttackRoll(18, 3, 15, 0) // 18+3=21 >= 15, hits but not crit
  
    // Simulate Improved Critical: roll 18 counts as critical hit (isCritical: true),
    // but d20Roll is still 18. Spec only models base rules; construct manually.
    val improvedCritResult = { hits: true, isCritical: true }
    val improvedCritRoll   = 18
  
    // "Sword of Sharpness" / "Vorpal" effects: check d20Roll == 20, NOT isCritical
    val swordBonus_nat20      = if (20 == 20) 14 else 0            // 14 — triggers
    val swordBonus_hit18      = if (18 == 20) 14 else 0            // 0  — does not trigger
    val swordBonus_imprCrit18 = if (improvedCritRoll == 20) 14 else 0  // 0 — still does NOT trigger
  
    // Critical hit effects (extra dice, Brutal Critical, etc.) check isCritical
    val normalDmg = normalDamage(8, 3)           // 11
    val critDmg   = criticalDamage(8, 8, 3)      // 19 — extra dice on crit
  
    val critEffects_nat20     = nat20Result.isCritical       // true
    val critEffects_hit18     = roll18Result.isCritical      // false
    val critEffects_imprCrit  = improvedCritResult.isCritical // true — Improved Crit applies
  
    assert(
      // Nat 20: both "roll a 20" and critical hit effects apply
      nat20Result.hits
      and nat20Result.isCritical
      and swordBonus_nat20 == 14
      and critEffects_nat20
      // Plain roll-18 hit: neither effect applies
      and roll18Result.hits
      and not(roll18Result.isCritical)
      and swordBonus_hit18 == 0
      and not(critEffects_hit18)
      // Improved Critical on roll 18: critical effects apply, "roll a 20" effects do NOT
      and critEffects_imprCrit
      and swordBonus_imprCrit18 == 0
      // Critical damage (isCritical path) exceeds normal damage
      and critDmg > normalDmg
    )
  }
}
