// Source: https://rpg.stackexchange.com/q/76050
module _qa_11fa0e67009a19e4 {
  import dnd.* from "./dnd"

  // Vicious Weapon triggers on natural 20 only, not on Champion's Improved Critical (19-20)
  run qa_vicious_weapon_natural_20_only = {
    // Champion's Improved Critical makes a 19 count as a hit, but spec only sets isCritical
    // on a natural 20 — matching the RAW ruling that Vicious Weapon requires a "roll of 20"
    val champCrit19 = resolveAttackRoll(19, 5, 15, 0)
    // Natural 20: isCritical=true, Vicious Weapon bonus 2d6 applies
    val nat20 = resolveAttackRoll(20, 5, 15, 0)
    // On a 19: no Vicious Weapon bonus dice; on a 20: bonus dice via criticalDamage
    val dmgOn19 = normalDamage(6, 3)             // 1d6 weapon roll=6, +3 mod = 9
    val dmgOn20 = criticalDamage(6, 6 + 4, 3)   // normal(6) + extra weapon die(6) + 2d6 vicious(4) + mod(3) = 19
    assert(
      champCrit19.hits               // 19+5=24 >= AC 15, the attack does hit
      and not(champCrit19.isCritical) // but isCritical=false → Vicious Weapon bonus does NOT apply
      and nat20.hits and nat20.isCritical // natural 20 → isCritical=true → Vicious Weapon applies
      and dmgOn19 == 9
      and dmgOn20 == 19
      and dmgOn20 > dmgOn19
    )
  }
}
