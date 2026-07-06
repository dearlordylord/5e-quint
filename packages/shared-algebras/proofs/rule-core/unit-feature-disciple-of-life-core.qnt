// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.spell-slot-healing-modifier
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureDiscipleOfLifeCore {
  // RAW anchors:
  // - .references/srd-5.2.1/Classes/Cleric.md:313-315: Disciple of Life adds
  //   2 plus the spell slot's level when a spell cast with a spell slot restores
  //   Hit Points to a creature on that turn.
  // - UBIQUITOUS_LANGUAGE.md: Hit Points and Spellcasting.

  type DiscipleOfLifeHealingFacts = {
    spellCastWithSpellSlot: bool,
    spellRestoresHitPoints: bool,
    healedOnCastTurn: bool,
    spellSlotLevel: int,
  }

  pure def discipleOfLifeApplies(facts: DiscipleOfLifeHealingFacts): bool =
    all {
      facts.spellCastWithSpellSlot,
      facts.spellRestoresHitPoints,
      facts.healedOnCastTurn,
      facts.spellSlotLevel >= 1,
    }

  pure def discipleOfLifeAdditionalHitPoints(facts: DiscipleOfLifeHealingFacts): int =
    if (discipleOfLifeApplies(facts)) 2 + facts.spellSlotLevel else 0
}
