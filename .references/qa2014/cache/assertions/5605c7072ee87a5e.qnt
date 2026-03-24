// Source: https://rpg.stackexchange.com/q/101952
module _qa_5605c7072ee87a5e {
  import dnd.* from "./dnd"

  // Restoring vitality with Hit Dice: spending a HD at non-max HP restores HP capped at effectiveMaxHp (not overflow)
  run qa_hit_die_heals_hp_not_vitality_below_max = {
    // Fighter: CON 15 -> conMod=2, effectiveMaxHp=19, currently at 17 HP, 1 HD remaining
    // Roll 8 + conMod 2 = 10 healing; 17+10=27 would overflow, but caps at 19 (gains only 2 HP)
    val creature = freshCreature(19).with("hp", 17).with("hitDiceRemaining", 1)
    val healed = pSpendHitDie(creature, 2, 8)
    assert(
      healed.hp == 19
      and healed.hitDiceRemaining == 0
    )
  }
  
  // Restoring vitality with Hit Dice: spending a HD when already at max HP produces no HP change (spec has no vitality field)
  run qa_hit_die_at_max_hp_no_additional_gain = {
    // Fighter at 19/19 HP (full), 1 HD remaining; roll 10 + conMod 2 = 12, but already at max — no change
    val creature = freshCreature(19).with("hp", 19).with("hitDiceRemaining", 1)
    val healed = pSpendHitDie(creature, 2, 10)
    assert(
      healed.hp == 19
      and healed.hitDiceRemaining == 0
    )
  }
  
  // SKIP: UA Vitality — the overflow-to-vitality mechanic (1 VIT per 10 pts healing at max HP) has no representation in the spec (no vitality field)
}
