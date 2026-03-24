// Source: https://rpg.stackexchange.com/q/211763
module _qa_7f2353428c874f44 {
  import dnd.* from "./dnd"

  // Vecna's Rotten Fate: damage reducing to 0 HP (non-massive) yields unconscious, not instant death
  run qa_rotten_fate_to_zero_hp_yields_unconscious = {
    val creature = freshCreature(20).with("hp", 15)
    // 20 necrotic damage: overflow = 5, maxHp = 20; 5 < 20 → standard unconscious path
    val result = pTakeDamage(creature, 20, Necrotic, Set(), Set(), Set(), false)
    assert(result.hp == 0 and result.unconscious == true and result.dead == false)
  }
  
  // Vecna's Rotten Fate: overflow >= maxHp triggers PHB massive damage instant death (no death saves)
  run qa_rotten_fate_massive_damage_instant_death = {
    val creature = freshCreature(20).with("hp", 15)
    // 80 necrotic damage: overflow = 65, maxHp = 20; 65 >= 20 → instant death, skips unconscious
    val result = pTakeDamage(creature, 80, Necrotic, Set(), Set(), Set(), false)
    assert(result.dead == true and result.hp == 0 and result.unconscious == false)
  }
  
  // Vecna's Rotten Fate: after standard drop to 0 HP, death saving throws proceed as normal
  run qa_rotten_fate_death_saves_proceed_normally = {
    val creature = freshCreature(20).with("hp", 15)
    val atZero = pTakeDamage(creature, 20, Necrotic, Set(), Set(), Set(), false)
    // atZero is unconscious at 0 HP with 0 successes; roll 15 >= 10 → 1 success, still alive
    val afterSave = pDeathSave(atZero, 15)
    assert(
      atZero.unconscious == true
      and afterSave.deathSaves.successes == 1
      and afterSave.dead == false
    )
  }
}
