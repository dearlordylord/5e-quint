// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.grappler
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureGrapplerCore {
  import creatureSizeOrder.* from "./creature-size-order"

  // RAW anchors:
  // - .references/srd-5.2.1/Feats.md:73-85: Grappler Punch and Grab, Attack
  //   Advantage, and Fast Wrestler.
  // - UBIQUITOUS_LANGUAGE.md: Attack Roll, Grappled, Unarmed Strike, Size, and
  //   Movement.

  type GrapplerPunchAndGrabFacts = {
    hitWithUnarmedStrike: bool,
    partOfAttackActionOnTurn: bool,
    usedThisTurn: bool,
  }

  pure def grapplerPunchAndGrabAvailable(facts: GrapplerPunchAndGrabFacts): bool =
    all {
      facts.hitWithUnarmedStrike,
      facts.partOfAttackActionOnTurn,
      not(facts.usedThisTurn),
    }

  pure def grapplerAttackAdvantageApplies(targetGrappledByAttacker: bool): bool =
    targetGrappledByAttacker

  pure def grapplerFastWrestlerAvoidsExtraMovement(
    grapplerSize: RuleSize,
    grappledCreatureSize: RuleSize,
  ): bool =
    sizeRank(grappledCreatureSize) <= sizeRank(grapplerSize)
}
