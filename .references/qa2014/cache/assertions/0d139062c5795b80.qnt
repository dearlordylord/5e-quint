// Source: https://rpg.stackexchange.com/q/211917
module _qa_0d139062c5795b80 {
  import dnd.* from "./dnd"

  // Can Warlocks take feats that require the "Spellcasting Feature"?
  run qa_spellcasting_vs_pact_magic_feat_prereq = {
    // Warlock: Pact Magic only — hasSpellcasting is false, pactSlotsMax > 0
    val warlockConfig = TEST_CONFIG.with("hasSpellcasting", false)
    val warlockSlots = FRESH_SPELL_SLOTS
      .with("pactSlotsMax", 1)
      .with("pactSlotsCurrent", 1)
      .with("pactSlotLevel", 1)
  
    // Wizard: Spellcasting feature — hasSpellcasting is true, no pact slots
    val wizardConfig = TEST_CONFIG.with("hasSpellcasting", true)
    val wizardSlots = FRESH_SPELL_SLOTS
  
    // Prereq A: "Spellcasting Feature" (e.g. Rune Shaper) — hasSpellcasting only
    val warlockMeetsSpellcastingOnly = warlockConfig.hasSpellcasting
    val wizardMeetsSpellcastingOnly  = wizardConfig.hasSpellcasting
  
    // Prereq B: "Spellcasting or Pact Magic feature" (e.g. Eldritch Adept)
    val warlockMeetsSpellcastingOrPact =
      warlockConfig.hasSpellcasting or warlockSlots.pactSlotsMax > 0
    val wizardMeetsSpellcastingOrPact =
      wizardConfig.hasSpellcasting or wizardSlots.pactSlotsMax > 0
  
    assert(and {
      // Warlock does NOT satisfy a "Spellcasting Feature"-only prereq
      not(warlockMeetsSpellcastingOnly),
      // Warlock DOES satisfy "Spellcasting or Pact Magic" (Eldritch Adept)
      warlockMeetsSpellcastingOrPact,
      // Wizard satisfies "Spellcasting Feature"-only prereq
      wizardMeetsSpellcastingOnly,
      // Wizard also satisfies the broader "or Pact Magic" prereq
      wizardMeetsSpellcastingOrPact,
    })
  }
}
