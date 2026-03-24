// Source: https://rpg.stackexchange.com/q/171471
module _qa_fb67222e2ba75dd0 {
  import dnd.* from "./dnd"

  // Deflect Missiles against unusual projectiles? — caught missile treated as improvised weapon (1d4 single type, no extra effects)
  run qa_deflect_missiles_improvised_weapon = {
    // Monk (DEX mod +3) catches a Drider's poisoned arrow via Deflect Missiles.
    // Rule: caught projectile = improvised weapon → 1d4 + DEX mod, DM-assigned type only.
    // The Drider's bonus 1d8 poison does NOT automatically transfer to the throw-back attack.
    val dexMod = 3
    val d4Roll = 4  // pre-resolved improvised weapon die (1d4 max)
  
    // Improvised weapon damage formula: normalDamage(diceResult, modifier)
    val improvisedDmg = normalDamage(d4Roll, dexMod)  // 4 + 3 = 7
  
    val target = freshCreature(20)
  
    // Only base Piercing damage from improvised throw-back; no separate Poison application
    val afterThrowback = pTakeDamage(target, improvisedDmg, Piercing, Set(), Set(), Set(), false)
  
    // Verify: improvised weapon deals 7, target HP 20 → 13; no extra poison component
    assert(improvisedDmg == 7 and afterThrowback.hp == 13)
  }
}
