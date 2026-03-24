// Source: https://rpg.stackexchange.com/q/94927
module _qa_8d93f3f35c5110ed {
  import dnd.* from "./dnd"

  // Does a Paladin's Aura of Protection Affect Allies' Death Saving Throws?
  // Rule: misc bonuses to all saving throws (e.g. Aura of Protection CHA mod) apply to death saves;
  // a roll of 5 + 5 (Aura bonus) = 10 meets DC 10, so the ally succeeds.
  run qa_death_save_misc_bonus_applies = {
    assert(saveSucceeds(5, 0, false, 0, 5, 10))
  }
  
  // Does a Paladin's Aura of Protection Affect Allies' Death Saving Throws?
  // Rule: nat 1 on a death save always causes 2 failures regardless of any bonuses —
  // specific death-save language overrides general save rules.
  run qa_death_save_nat1_always_two_failures = {
    val dying = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val result = pDeathSave(dying, 1)
    assert(result.deathSaves.failures == 2)
  }
  
  // Does a Paladin's Aura of Protection Affect Allies' Death Saving Throws?
  // Rule: nat 20 on a death save always revives (regain 1 HP, lose unconscious) —
  // special effects are tied to the die face only, not the total.
  run qa_death_save_nat20_always_revives = {
    val dying = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val result = pDeathSave(dying, 20)
    assert(result.hp == 1 and not(result.unconscious))
  }
}
