// Source: https://rpg.stackexchange.com/q/103048
module _qa_ad0cd47081dcd200 {
  import dnd.* from "./dnd"

  // Sword of Wounding and Sneak Damage: sneak attack dice are part of weapon damage, subject to same modifiers
  run qa_sneak_attack_is_weapon_damage = {
    // Rogue hits with finesse sword (piercing): weapon d8=7, sneak 3d6=13, DEX mod=3
    // Sneak dice are part of the same damage pool as weapon dice
    val weaponRoll  = 7
    val sneakRoll   = 13
    val dexMod      = 3
    val totalDmg    = normalDamage(weaponRoll + sneakRoll, dexMod)  // 23
    // Target has resistance to piercing: combined pool halved together (floor: 11)
    val afterResist = applyDamageModifiers(totalDmg, Piercing, Set(), Set(Piercing), Set())
    assert(totalDmg == 23 and afterResist == 11)
  }
  
  // Sword of Wounding and Sneak Damage: immunity to weapon's damage type blocks sneak dice too
  run qa_sneak_attack_immunity_blocks_all = {
    // weapon d8=7, sneak 3d6=13, DEX mod=3 → 23 piercing total
    val totalDmg      = normalDamage(7 + 13, 3)
    val afterImmunity = applyDamageModifiers(totalDmg, Piercing, Set(Piercing), Set(), Set())
    assert(afterImmunity == 0)
  }
  
  // Sword of Wounding and Sneak Damage: on a critical hit, sneak dice are doubled alongside weapon dice
  run qa_sneak_attack_crit_doubles_sneak_dice = {
    // normalDice = weapon die roll + sneak dice roll (7 + 13 = 20)
    // bonusDice  = extra weapon die on crit + extra sneak dice on crit (5 + 10 = 15)
    // modifier   = DEX mod = 3
    val critDmg = criticalDamage(7 + 13, 5 + 10, 3)
    assert(critDmg == 38)
  }
}
