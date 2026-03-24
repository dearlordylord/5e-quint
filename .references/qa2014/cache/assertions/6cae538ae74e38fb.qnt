// Source: https://rpg.stackexchange.com/q/143024
module _qa_6cae538ae74e38fb {
  import dnd.* from "./dnd"

  // Dueling Fighting Style: not applicable to Shocking Grasp (melee spell attack — no weapon damage roll)
  run qa_dueling_shocking_grasp_no_bonus = {
    // Shocking Grasp is a melee spell attack; Dueling's +2 applies only to weapon damage rolls.
    // Damage = dice only, no Dueling modifier.
    val diceRoll = 6
    val damage = normalDamage(diceRoll, 0)
    assert(damage == 6)
  }
  
  // Dueling Fighting Style: +2 bonus applies to Booming Blade's initial weapon attack damage
  run qa_dueling_booming_blade_initial_weapon_hit = {
    // Booming Blade requires "a melee attack with a weapon"; Dueling's +2 is part of that weapon's damage modifier.
    val weaponDice = 6
    val dexMod = 3       // DEX 16 → +3
    val duelingBonus = 2
    val damage = normalDamage(weaponDice, dexMod + duelingBonus)
    assert(damage == 11)
  }
  
  // Dueling Fighting Style: does NOT apply to Booming Blade's secondary thunder damage (spell effect, not weapon)
  run qa_dueling_booming_blade_secondary_thunder_no_bonus = {
    // The 1d8 thunder damage when the target willingly moves comes from the spell, not from the weapon.
    // Dueling's +2 is not added to this secondary damage instance.
    val thunderDice = 6
    val damage = normalDamage(thunderDice, 0)
    assert(damage == 6)
  }
  
  // Contrast: Booming Blade initial hit exceeds Shocking Grasp by exactly (abilityMod + duelingBonus)
  run qa_dueling_bb_initial_vs_shocking_grasp_contrast = {
    val diceRoll = 5
    val dexMod = 3
    val duelingBonus = 2
    // Shocking Grasp: pure spell damage, no weapon modifiers
    val sgDamage = normalDamage(diceRoll, 0)
    // Booming Blade initial weapon hit: weapon damage + ability mod + Dueling bonus
    val bbInitialDamage = normalDamage(diceRoll, dexMod + duelingBonus)
    // BB secondary thunder: spell damage, same as SG — no Dueling bonus
    val bbThunderDamage = normalDamage(diceRoll, 0)
    assert(
      bbInitialDamage == sgDamage + dexMod + duelingBonus and
      bbThunderDamage == sgDamage
    )
  }
}
