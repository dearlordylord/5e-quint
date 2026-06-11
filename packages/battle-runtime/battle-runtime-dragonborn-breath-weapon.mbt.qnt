// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-action-area-save-damage-replacement

// Self-contained literal projection witness for Dragonborn Breath Weapon. The
// paired TypeScript selected-identity driver executes production battle
// entrypoints with the selected Draconic Ancestry source fact.
module battleRuntimeDragonbornBreathWeaponMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | DragonbornBreathWeapon

  // RAW trace:
  // - .references/srd-5.2.1/Character-Origins.md:107-121 defines Draconic
  //   Ancestry and Breath Weapon: replace one attack in the Attack action,
  //   self-origin Cone or Line, Dexterity Saving Throw, 8 + Constitution
  //   modifier + Proficiency Bonus DC, selected Draconic Ancestry damage type,
  //   half damage on success, 1d10/2d10/3d10/4d10 character-level tiers,
  //   Proficiency Bonus uses, and Long Rest reset.
  // - UBIQUITOUS_LANGUAGE.md: Saving Throw, Proficiency Bonus, Attack action
  //   vs attacks, Area of Effect, Long Rest, and Damage Type.
  type WitnessState = {
    qTargetHp: int,
    qSecondTargetHp: int,
    qBreathWeaponUsesRemaining: int,
    qActionResourcesRemaining: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qTargetHp: int = qState.qTargetHp
  pure def qSecondTargetHp: int = qState.qSecondTargetHp
  pure def qBreathWeaponUsesRemaining: int = qState.qBreathWeaponUsesRemaining
  pure def qActionResourcesRemaining: int = qState.qActionResourcesRemaining
  pure def qScenarioResult: str = qState.qScenarioResult


  action recordProjection(
    targetHp: int,
    secondTargetHp: int,
    breathWeaponUsesRemaining: int,
    actionResourcesRemaining: int,
    scenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qTargetHp: targetHp,
      qSecondTargetHp: secondTargetHp,
      qBreathWeaponUsesRemaining: breathWeaponUsesRemaining,
      qActionResourcesRemaining: actionResourcesRemaining,
      qScenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = recordProjection(20, 20, 3, 1, "init",
    witnessInit(DragonbornBreathWeapon),
  )

  action doResolveBreathWeapon = all {
    qScenarioResult == "init",
    recordProjection(10, 15, 2, 0, "resolved",
    witnessResolved(DragonbornBreathWeapon),
  ),
  }

  action doOpenExtraAttackSlot = all {
    qScenarioResult == "init",
    recordProjection(10, 20, 2, 1, "openedExtraAttack",
    witnessResolved(DragonbornBreathWeapon),
  ),
  }

  action doRejectMissingResource = all {
    qScenarioResult == "init",
    recordProjection(20, 20, 0, 1, "rejectMissingResource",
    witnessInvalid(DragonbornBreathWeapon, WInvalidFill),
  ),
  }

  action doRejectMismatchedArea = all {
    qScenarioResult == "init",
    recordProjection(20, 20, 3, 1, "rejectMismatchedArea",
    witnessInvalid(DragonbornBreathWeapon, WInvalidFill),
  ),
  }

  action doRejectInvalidDamageRoll = all {
    qScenarioResult == "init",
    recordProjection(20, 20, 3, 1, "rejectInvalidDamageRoll",
    witnessInvalid(DragonbornBreathWeapon, WInvalidFill),
  ),
  }

  action step = any {
    doResolveBreathWeapon,
    doOpenExtraAttackSlot,
    doRejectMissingResource,
    doRejectMismatchedArea,
    doRejectInvalidDamageRoll,
  }
}
