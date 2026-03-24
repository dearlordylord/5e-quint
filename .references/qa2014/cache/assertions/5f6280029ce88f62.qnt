// Source: https://rpg.stackexchange.com/q/94032
module _qa_5f6280029ce88f62 {
  import dnd.* from "./dnd"

  // When does Arcane Ward gain hit points? — ward recharges on ANY abjuration cast, not only at 0 HP
  run qa_arcane_ward_recharges_at_partial_hp = {
    // Ward max HP = 2 * wizardLevel + intMod; use TEST_CONFIG: level 5, INT 10 → mod 0 → max 10
    val wardMaxHp = 2 * 5 + abilityModifier(10)
    val wardPartial = freshCreature(wardMaxHp).with("hp", 5)
    // Cast 2nd-level abjuration spell: recharge = 2 * spellLevel = 4
    val spellLevel = 2
    val wardAfter = pHeal(wardPartial, 2 * spellLevel)
    assert(wardAfter.hp == 9)
  }
  
  // When does Arcane Ward gain hit points? — recharge also applies when ward is at 0 HP
  run qa_arcane_ward_recharges_at_zero_hp = {
    val wardMaxHp = 2 * 5 + abilityModifier(10)
    val wardEmpty = freshCreature(wardMaxHp).with("hp", 0)
    // Cast 1st-level abjuration spell: recharge = 2 * 1 = 2
    val wardAfter = pHeal(wardEmpty, 2 * 1)
    assert(wardAfter.hp == 2)
  }
  
  // When does Arcane Ward gain hit points? — recharge is capped at ward's hit point maximum
  run qa_arcane_ward_recharge_caps_at_max_hp = {
    val wardMaxHp = 2 * 5 + abilityModifier(10)  // 10
    val wardNearFull = freshCreature(wardMaxHp).with("hp", 8)
    // Cast 3rd-level abjuration spell: recharge = 6, would overflow to 14 but caps at 10
    val wardAfter = pHeal(wardNearFull, 2 * 3)
    assert(wardAfter.hp == wardMaxHp)
  }
}
