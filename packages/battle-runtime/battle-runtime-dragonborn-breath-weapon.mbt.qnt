// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-action-area-save-damage-replacement

// Self-contained literal projection witness for Dragonborn Breath Weapon. The
// paired TypeScript selected-identity driver executes production battle
// entrypoints with the selected Draconic Ancestry source fact.
module battleRuntimeDragonbornBreathWeaponMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | DragonbornBreathWeapon

  type DragonbornBreathWeaponScenarioOutcome = | Init | Resolved | OpenedExtraAttack | RejectMissingResource | RejectMismatchedArea | RejectInvalidDamageRoll


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
    qScenarioOutcome: DragonbornBreathWeaponScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qTargetHp: int = qState.qTargetHp
  pure def qSecondTargetHp: int = qState.qSecondTargetHp
  pure def qBreathWeaponUsesRemaining: int = qState.qBreathWeaponUsesRemaining
  pure def qActionResourcesRemaining: int = qState.qActionResourcesRemaining
  pure def qScenarioOutcome: DragonbornBreathWeaponScenarioOutcome = qState.qScenarioOutcome


  action recordProjection(
    targetHp: int,
    secondTargetHp: int,
    breathWeaponUsesRemaining: int,
    actionResourcesRemaining: int,
    scenarioOutcome: DragonbornBreathWeaponScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qTargetHp: targetHp,
      qSecondTargetHp: secondTargetHp,
      qBreathWeaponUsesRemaining: breathWeaponUsesRemaining,
      qActionResourcesRemaining: actionResourcesRemaining,
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordProjection(20, 20, 3, 1, Init,
    witnessInit(DragonbornBreathWeapon),
  )

  action doResolveBreathWeapon = all {
    qScenarioOutcome == Init,
    recordProjection(10, 15, 2, 0, Resolved,
    witnessResolved(DragonbornBreathWeapon),
  ),
  }

  action doOpenExtraAttackSlot = all {
    qScenarioOutcome == Init,
    recordProjection(10, 20, 2, 1, OpenedExtraAttack,
    witnessResolved(DragonbornBreathWeapon),
  ),
  }

  action doRejectMissingResource = all {
    qScenarioOutcome == Init,
    recordProjection(20, 20, 0, 1, RejectMissingResource,
    witnessInvalid(DragonbornBreathWeapon, WInvalidFill),
  ),
  }

  action doRejectMismatchedArea = all {
    qScenarioOutcome == Init,
    recordProjection(20, 20, 3, 1, RejectMismatchedArea,
    witnessInvalid(DragonbornBreathWeapon, WInvalidFill),
  ),
  }

  action doRejectInvalidDamageRoll = all {
    qScenarioOutcome == Init,
    recordProjection(20, 20, 3, 1, RejectInvalidDamageRoll,
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
