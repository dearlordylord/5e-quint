// Source: https://rpg.stackexchange.com/q/162411
module _qa_895e526a27294d41 {
  import dnd.* from "./dnd"

  // Q&A: "Do Monsters gain Maximum HP when they gain Hit Dice?"
  run qa_gaining_hit_dice_increases_max_hp = {
    // A partially-injured creature (like a Nabassu mid-combat)
    val initial = freshCreature(20).with("hp", 15)
    // Monster gains a hit die; roll result = 10
    val hdRoll = 10
    // Gaining HD increases BOTH maxHp and current HP by the rolled amount
    // (not a heal — it's a permanent increase to the hit point maximum)
    val afterGainHd = initial
      .with("maxHp", initial.maxHp + hdRoll)
      .with("hp", initial.hp + hdRoll)
    // pHeal alone would cap at old maxHp=20, giving hp=20 not 25
    val afterHealOnly = pHeal(initial, hdRoll)
    assert(
      // Max HP increased by the rolled amount
      afterGainHd.maxHp == 30
      // Current HP also increased by the rolled amount (not capped at old max)
      and afterGainHd.hp == 25
      // Contrast: simple healing caps at existing maxHp
      and afterHealOnly.hp == 20
      and afterHealOnly.maxHp == 20
      // Key invariant: after gaining HD, maxHp grew but hp remains within bounds
      and afterGainHd.hp <= afterGainHd.maxHp
    )
  }
  
  // Q&A: "Do Monsters gain Maximum HP when they gain Hit Dice?"
  run qa_gaining_hit_dice_at_full_hp_also_increases_max = {
    // A creature already at full HP gains hit dice (e.g. Nabassu devours a soul)
    val initial = freshCreature(20)
    val hdRoll = 6
    // Even at full HP, gaining HD raises the maximum — it is not capped or wasted
    val afterGainHd = initial
      .with("maxHp", initial.maxHp + hdRoll)
      .with("hp", initial.hp + hdRoll)
    assert(
      afterGainHd.maxHp == 26
      and afterGainHd.hp == 26
      and afterGainHd.hp <= afterGainHd.maxHp
    )
  }
  
  // Q&A: "Do Monsters gain Maximum HP when they gain Hit Dice?"
  run qa_hit_dice_gain_is_not_bounded_by_old_max_hp = {
    // Rule: "increase the nabassu's hit points by the numbers rolled"
    // means irrespective of prior HP loss — the increase is to max, not a heal
    val initial = freshCreature(10).with("hp", 1)  // barely alive
    val hdRoll = 8
    val afterGainHd = initial
      .with("maxHp", initial.maxHp + hdRoll)
      .with("hp", initial.hp + hdRoll)
    // pHeal on a creature with maxHp=10 and hp=1 would give at most hp=10
    val afterHealOnly = pHeal(initial, hdRoll)
    assert(
      // Gaining HD: new max = 18, current = 9
      afterGainHd.maxHp == 18
      and afterGainHd.hp == 9
      // Healing: current capped at old maxHp=10; max unchanged
      and afterHealOnly.maxHp == 10
      and afterHealOnly.hp == 9
      // The decisive difference: gaining HD increased maxHp, healing did not
      and afterGainHd.maxHp > afterHealOnly.maxHp
    )
  }
}
