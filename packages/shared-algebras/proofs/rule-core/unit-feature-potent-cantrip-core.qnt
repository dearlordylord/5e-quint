// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.potent-cantrip
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeaturePotentCantripCore {
  // RAW anchors:
  // - .references/srd-5.2.1/Classes/Wizard.md:417-419: Potent Cantrip causes
  //   missed attack-roll cantrips or successful-save cantrips to deal half
  //   damage but no additional effects, and it does not apply to objects.
  // - UBIQUITOUS_LANGUAGE.md: Spellcasting, Attack Roll, Saving Throw, Damage,
  //   Objects, and Creature.

  type PotentCantripTrigger =
    | MissedCantripAttackRoll
    | SuccessfulCantripSavingThrow

  type PotentCantripFacts = {
    targetIsCreature: bool,
    isCantrip: bool,
    trigger: PotentCantripTrigger,
    normalDamage: int,
  }

  pure def potentCantripApplies(facts: PotentCantripFacts): bool =
    facts.targetIsCreature and facts.isCantrip

  pure def potentCantripDamage(facts: PotentCantripFacts): int =
    if (potentCantripApplies(facts)) facts.normalDamage / 2 else 0

  pure def potentCantripAdditionalEffectsApply(facts: PotentCantripFacts): bool =
    not(potentCantripApplies(facts))
}
