// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.magic-action-healing-pool
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeaturePreserveLifeCore {
  // RAW anchors:
  // - .references/srd-5.2.1/Classes/Cleric.md:330-332: Preserve Life Magic
  //   Action, Channel Divinity spend, 5 times Cleric level healing pool, Bloodied
  //   creatures within 30 feet including self, and half-Hit-Point maximum cap.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Hit Points, Bloodied, and Creature.

  type PreserveLifeTargetFacts = {
    bloodied: bool,
    withinThirtyFeet: bool,
  }

  pure def preserveLifeRangeFeet: int = 30

  pure def preserveLifeHealingPool(clericLevel: int): int =
    5 * clericLevel

  pure def preserveLifeTargetEligible(facts: PreserveLifeTargetFacts): bool =
    facts.bloodied and facts.withinThirtyFeet

  pure def preserveLifeTargetHealingCap(hitPointMaximum: int): int =
    hitPointMaximum / 2
}
