// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.magic-action-area-save-damage-healing
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.magic-action-area-save-damage-healing

// Self-contained literal projection witness for Druid Land's Aid. The paired
// TypeScript selected-identity driver executes production battle entrypoints.
module battleRuntimeDruidLandsAidMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Classes/Druid.md:406-411: Land's Aid is a Magic
  //   Action that spends Wild Shape, uses a caller-selected 10-foot-radius
  //   Sphere within 60 feet, forces Constitution saves, deals 2d6 Necrotic
  //   damage with half on success, and heals one creature in the area for 2d6.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Saving Throw, Area of Effect,
  //   Sphere, Damage Type, Hit Points, and Creature.
  var qTargetHp: int
  var qSecondTargetHp: int
  var qHealingTargetHp: int
  var qWildShapeUsesRemaining: int
  var qActionResourcesRemaining: int
  var qLastResult: str

  action recordProjection(
    targetHp: int,
    secondTargetHp: int,
    healingTargetHp: int,
    wildShapeUsesRemaining: int,
    actionResourcesRemaining: int,
    lastResult: str,
  ): bool = all {
    qTargetHp' = targetHp,
    qSecondTargetHp' = secondTargetHp,
    qHealingTargetHp' = healingTargetHp,
    qWildShapeUsesRemaining' = wildShapeUsesRemaining,
    qActionResourcesRemaining' = actionResourcesRemaining,
    qLastResult' = lastResult,
  }

  action init = recordProjection(20, 20, 5, 2, 1, "init")

  action doResolveAreaSaveDamageHealing = all {
    qLastResult == "init",
    recordProjection(12, 16, 12, 1, 0, "resolved"),
  }

  action doRejectMissingResource = all {
    qLastResult == "init",
    recordProjection(20, 20, 5, 0, 1, "rejectMissingResource"),
  }

  action doRejectMissingAreaMembership = all {
    qLastResult == "init",
    recordProjection(20, 20, 5, 2, 1, "rejectMissingAreaMembership"),
  }

  action doRejectDuplicateSaveFill = all {
    qLastResult == "init",
    recordProjection(20, 20, 5, 2, 1, "rejectDuplicateSaveFill"),
  }

  action doRejectInvalidHealingTarget = all {
    qLastResult == "init",
    recordProjection(20, 20, 5, 2, 1, "rejectInvalidHealingTarget"),
  }

  action doRejectInvalidDamageRoll = all {
    qLastResult == "init",
    recordProjection(20, 20, 5, 2, 1, "rejectInvalidDamageRoll"),
  }

  action doRejectInvalidHealingRoll = all {
    qLastResult == "init",
    recordProjection(20, 20, 5, 2, 1, "rejectInvalidHealingRoll"),
  }

  action step = any {
    doResolveAreaSaveDamageHealing,
    doRejectMissingResource,
    doRejectMissingAreaMembership,
    doRejectDuplicateSaveFill,
    doRejectInvalidHealingTarget,
    doRejectInvalidDamageRoll,
    doRejectInvalidHealingRoll,
  }
}
