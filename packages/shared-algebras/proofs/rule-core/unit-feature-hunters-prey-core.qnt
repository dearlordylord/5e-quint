// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.hunters-prey
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureHuntersPreyCore {
  // RAW anchors:
  // - .references/srd-5.2.1/Classes/Ranger.md:243-249: Hunter's Prey choice,
  //   Colossus Slayer wounded-target extra 1d8 once per turn, and Horde Breaker
  //   same-weapon extra attack target predicates once per turn.
  // - UBIQUITOUS_LANGUAGE.md: Attack Roll, Hit Points, Weapon, and Creature.

  type HuntersPreyChoice =
    | NoHuntersPreyChoice
    | ColossusSlayerChoice
    | HordeBreakerChoice

  type ColossusSlayerFacts = {
    selectedChoice: HuntersPreyChoice,
    hitWithWeapon: bool,
    targetMissingHitPoints: bool,
    usedThisTurn: bool,
  }

  type HordeBreakerFacts = {
    selectedChoice: HuntersPreyChoice,
    madeWeaponAttack: bool,
    usedThisTurn: bool,
    secondTargetDifferent: bool,
    secondTargetWithinFiveFeetOfOriginal: bool,
    secondTargetWithinWeaponRange: bool,
    secondTargetNotAttackedThisTurn: bool,
  }

  pure def colossusSlayerDamageDice: int = 1

  pure def colossusSlayerDamageDieSize: int = 8

  pure def colossusSlayerApplies(facts: ColossusSlayerFacts): bool =
    all {
      facts.selectedChoice == ColossusSlayerChoice,
      facts.hitWithWeapon,
      facts.targetMissingHitPoints,
      not(facts.usedThisTurn),
    }

  pure def hordeBreakerAttackAvailable(facts: HordeBreakerFacts): bool =
    all {
      facts.selectedChoice == HordeBreakerChoice,
      facts.madeWeaponAttack,
      not(facts.usedThisTurn),
      facts.secondTargetDifferent,
      facts.secondTargetWithinFiveFeetOfOriginal,
      facts.secondTargetWithinWeaponRange,
      facts.secondTargetNotAttackedThisTurn,
    }
}
