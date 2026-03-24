// Source: https://rpg.stackexchange.com/q/188821
module _qa_3f025f86ba4756e6 {
  import dnd.* from "./dnd"

  // Is a Sidekick's base +2 proficiency bonus already included in their source stat block?
  run qa_sidekick_prof_bonus_at_level1_is_plus2 = {
    // Level 1 sidekick proficiency bonus equals +2 — same as CR ≤1/2 creature's built-in bonus; no increase occurs
    assert(proficiencyBonus(1) == 2)
  }
  
  // Is a Sidekick's base +2 proficiency bonus already included in their source stat block?
  run qa_sidekick_no_prof_increase_levels_1_through_4 = {
    // Proficiency bonus stays at +2 through levels 1-4; sidekick rules only trigger on an *increase*, so no stat block adjustment at level 1
    assert(
      proficiencyBonus(1) == proficiencyBonus(2) and
      proficiencyBonus(2) == proficiencyBonus(3) and
      proficiencyBonus(3) == proficiencyBonus(4)
    )
  }
  
  // Is a Sidekick's base +2 proficiency bonus already included in their source stat block?
  run qa_sidekick_bandit_attack_bonus_unchanged_at_level1 = {
    // Bandit: DEX 12 (mod +1), printed attack bonus +3 = DEX mod + proficiency (+2)
    // A level-1 sidekick still has prof +2, so attack bonus = 1 + 2 = 3 — no change to stat block
    val dexMod    = abilityModifier(12)
    val profBonus = proficiencyBonus(1)
    assert(dexMod + profBonus == 3)
  }
  
  // Is a Sidekick's base +2 proficiency bonus already included in their source stat block?
  run qa_sidekick_first_prof_bonus_increase_is_at_level5 = {
    // The FIRST actual increase (+2 → +3) happens at class level 5, not level 1;
    // only at that point should attack bonuses and DCs in the stat block be bumped by 1
    assert(proficiencyBonus(5) == proficiencyBonus(4) + 1)
  }
}
