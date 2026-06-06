// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-action-area-save-damage-replacement

// Self-contained literal projection witness for Dragonborn Breath Weapon. The
// paired TypeScript selected-identity driver executes production battle
// entrypoints with the selected Draconic Ancestry source fact.
module battleRuntimeDragonbornBreathWeaponMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Character-Origins.md:107-121 defines Draconic
  //   Ancestry and Breath Weapon: replace one attack in the Attack action,
  //   self-origin Cone or Line, Dexterity Saving Throw, 8 + Constitution
  //   modifier + Proficiency Bonus DC, selected Draconic Ancestry damage type,
  //   half damage on success, 1d10/2d10/3d10/4d10 character-level tiers,
  //   Proficiency Bonus uses, and Long Rest reset.
  // - UBIQUITOUS_LANGUAGE.md: Saving Throw, Proficiency Bonus, Attack action
  //   vs attacks, Area of Effect, Long Rest, and Damage Type.
  var qTargetHp: int
  var qSecondTargetHp: int
  var qBreathWeaponUsesRemaining: int
  var qActionResourcesRemaining: int
  var qLastResult: str

  action recordProjection(
    targetHp: int,
    secondTargetHp: int,
    breathWeaponUsesRemaining: int,
    actionResourcesRemaining: int,
    lastResult: str,
  ): bool = all {
    qTargetHp' = targetHp,
    qSecondTargetHp' = secondTargetHp,
    qBreathWeaponUsesRemaining' = breathWeaponUsesRemaining,
    qActionResourcesRemaining' = actionResourcesRemaining,
    qLastResult' = lastResult,
  }

  action init = recordProjection(20, 20, 3, 1, "init")

  action doResolveBreathWeapon = all {
    qLastResult == "init",
    recordProjection(10, 15, 2, 0, "resolved"),
  }

  action doOpenExtraAttackSlot = all {
    qLastResult == "init",
    recordProjection(10, 20, 2, 1, "openedExtraAttack"),
  }

  action doRejectMissingResource = all {
    qLastResult == "init",
    recordProjection(20, 20, 0, 1, "rejectMissingResource"),
  }

  action doRejectMismatchedArea = all {
    qLastResult == "init",
    recordProjection(20, 20, 3, 1, "rejectMismatchedArea"),
  }

  action doRejectInvalidDamageRoll = all {
    qLastResult == "init",
    recordProjection(20, 20, 3, 1, "rejectInvalidDamageRoll"),
  }

  action step = any {
    doResolveBreathWeapon,
    doOpenExtraAttackSlot,
    doRejectMissingResource,
    doRejectMismatchedArea,
    doRejectInvalidDamageRoll,
  }
}
