// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.enemy-zero-hit-point-temporary-hit-points
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureDarkOnesBlessingCore {
  // RAW anchors:
  // - .references/srd-5.2.1/Classes/Warlock.md:460-462: Dark One's Blessing
  //   grants Temporary Hit Points equal to Charisma modifier plus Warlock level,
  //   minimum 1, when you or someone else within 10 feet reduces an enemy to 0
  //   Hit Points.
  // - UBIQUITOUS_LANGUAGE.md: Hit Points, Temporary Hit Points, Damage, and
  //   Creature.

  type DarkOnesBlessingTriggerFacts = {
    enemyReducedToZeroHitPoints: bool,
    reducedByBeneficiary: bool,
    reducedByOtherWithinTenFeet: bool,
  }

  pure def darkOnesBlessingRangeFeet: int = 10

  pure def darkOnesBlessingTriggerEligible(facts: DarkOnesBlessingTriggerFacts): bool =
    all {
      facts.enemyReducedToZeroHitPoints,
      facts.reducedByBeneficiary or facts.reducedByOtherWithinTenFeet,
    }

  pure def darkOnesBlessingTemporaryHitPoints(
    charismaModifier: int,
    warlockLevel: int,
  ): int = {
    val amount = charismaModifier + warlockLevel
    if (amount < 1) 1 else amount
  }
}
