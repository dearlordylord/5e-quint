// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.magic-action-area-save-damage-healing
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.magic-action-area-save-damage-healing

// Self-contained literal projection witness for Druid Land's Aid. The paired
// TypeScript selected-identity driver executes production battle entrypoints.
module battleRuntimeDruidLandsAidMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type DruidLandsAidScenarioOutcome = | Init | Resolved | RejectMissingResource | RejectMissingAreaMembership | RejectDuplicateSaveFill | RejectInvalidHealingTarget | RejectInvalidDamageRoll | RejectInvalidHealingRoll


  type DruidLandsAidWitnessState = {
    qTargetHp: int,
    qSecondTargetHp: int,
    qHealingTargetHp: int,
    qWildShapeUsesRemaining: int,
    qActionResourcesRemaining: int,
    qScenarioOutcome: DruidLandsAidScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: DruidLandsAidWitnessState

  pure def qTargetHp: int = qState.qTargetHp
  pure def qSecondTargetHp: int = qState.qSecondTargetHp
  pure def qHealingTargetHp: int = qState.qHealingTargetHp
  pure def qWildShapeUsesRemaining: int = qState.qWildShapeUsesRemaining
  pure def qActionResourcesRemaining: int = qState.qActionResourcesRemaining
  pure def qLastResult: DruidLandsAidScenarioOutcome = qState.qScenarioOutcome

  pure def druidLandsAidProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: DruidLandsAidScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  // RAW trace:
  // - .references/srd-5.2.1/Classes/Druid.md:406-411: Land's Aid is a Magic
  //   Action that spends Wild Shape, uses a caller-selected 10-foot-radius
  //   Sphere within 60 feet, forces Constitution saves, deals 2d6 Necrotic
  //   damage with half on success, and heals one creature in the area for 2d6.
  //   The damage and healing increase to 3d6 at Druid level 10 and 4d6 at
  //   Druid level 14.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Saving Throw, Area of Effect,
  //   Sphere, Damage Type, Hit Points, and Creature.

  action recordProjection(
    targetHp: int,
    secondTargetHp: int,
    healingTargetHp: int,
    wildShapeUsesRemaining: int,
    actionResourcesRemaining: int,
    lastResult: DruidLandsAidScenarioOutcome,
  ): bool = all {
    qState' = {
      qTargetHp: targetHp,
      qSecondTargetHp: secondTargetHp,
      qHealingTargetHp: healingTargetHp,
      qWildShapeUsesRemaining: wildShapeUsesRemaining,
      qActionResourcesRemaining: actionResourcesRemaining,
      qScenarioOutcome: lastResult,
      protocol: druidLandsAidProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection(20, 20, 5, 2, 1, Init)

  // Level variants stay enumerated because each one witnesses a distinct
  // Druid-level fixture and die-count projection, not a sampled fill value.
  action doResolveAreaSaveDamageHealing = all {
    qLastResult == Init,
    recordProjection(12, 16, 12, 1, 0, Resolved),
  }

  action doResolveAreaSaveDamageHealingLevel10 = all {
    qLastResult == Init,
    recordProjection(8, 14, 17, 1, 0, Resolved),
  }

  action doResolveAreaSaveDamageHealingLevel14 = all {
    qLastResult == Init,
    recordProjection(4, 12, 20, 1, 0, Resolved),
  }

  action doRejectMissingResource = all {
    qLastResult == Init,
    recordProjection(20, 20, 5, 0, 1, RejectMissingResource),
  }

  action doRejectMissingAreaMembership = all {
    qLastResult == Init,
    recordProjection(20, 20, 5, 2, 1, RejectMissingAreaMembership),
  }

  action doRejectDuplicateSaveFill = all {
    qLastResult == Init,
    recordProjection(20, 20, 5, 2, 1, RejectDuplicateSaveFill),
  }

  action doRejectInvalidHealingTarget = all {
    qLastResult == Init,
    recordProjection(20, 20, 5, 2, 1, RejectInvalidHealingTarget),
  }

  action doRejectInvalidDamageRoll = all {
    qLastResult == Init,
    recordProjection(20, 20, 5, 2, 1, RejectInvalidDamageRoll),
  }

  action doRejectInvalidHealingRoll = all {
    qLastResult == Init,
    recordProjection(20, 20, 5, 2, 1, RejectInvalidHealingRoll),
  }

  action step = any {
    doResolveAreaSaveDamageHealing,
    doResolveAreaSaveDamageHealingLevel10,
    doResolveAreaSaveDamageHealingLevel14,
    doRejectMissingResource,
    doRejectMissingAreaMembership,
    doRejectDuplicateSaveFill,
    doRejectInvalidHealingTarget,
    doRejectInvalidDamageRoll,
    doRejectInvalidHealingRoll,
  }
}
