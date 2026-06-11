// -*- mode: Bluespec; -*-

module battleRuntimeCreatureTypeProtectionAndCharmSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | CreatureTypeProtectionCharm

  type WitnessState = {
    qBeastTargetAdmitted: bool,
    qHumanoidTargetAdmitted: bool,
    qKnownWillingProtectionTargetAdmitted: bool,
    qPlainProtectionTargetRejected: bool,
    qProtectionEffectPresent: bool,
    qScopedAttackRollDisadvantage: bool,
    qUnscopedAttackRollNormal: bool,
    qScopedCharmPrevented: bool,
    qUnscopedCharmApplied: bool,
    qScopedPossessionPrevented: bool,
    qUnscopedPossessionUnprevented: bool,
    qRelevantCharmSaveHasAdvantage: bool,
    qRelevantCharmSaveCleared: bool,
    qTargetCharmed: bool,
    qAnimalFriendshipEffectPresent: bool,
    qActionAvailable: bool,
    qFirstLevelSlotsExpended: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qBeastTargetAdmitted: bool = qState.qBeastTargetAdmitted
  pure def qHumanoidTargetAdmitted: bool = qState.qHumanoidTargetAdmitted
  pure def qKnownWillingProtectionTargetAdmitted: bool = qState.qKnownWillingProtectionTargetAdmitted
  pure def qPlainProtectionTargetRejected: bool = qState.qPlainProtectionTargetRejected
  pure def qProtectionEffectPresent: bool = qState.qProtectionEffectPresent
  pure def qScopedAttackRollDisadvantage: bool = qState.qScopedAttackRollDisadvantage
  pure def qUnscopedAttackRollNormal: bool = qState.qUnscopedAttackRollNormal
  pure def qScopedCharmPrevented: bool = qState.qScopedCharmPrevented
  pure def qUnscopedCharmApplied: bool = qState.qUnscopedCharmApplied
  pure def qScopedPossessionPrevented: bool = qState.qScopedPossessionPrevented
  pure def qUnscopedPossessionUnprevented: bool = qState.qUnscopedPossessionUnprevented
  pure def qRelevantCharmSaveHasAdvantage: bool = qState.qRelevantCharmSaveHasAdvantage
  pure def qRelevantCharmSaveCleared: bool = qState.qRelevantCharmSaveCleared
  pure def qTargetCharmed: bool = qState.qTargetCharmed
  pure def qAnimalFriendshipEffectPresent: bool = qState.qAnimalFriendshipEffectPresent
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qFirstLevelSlotsExpended: int = qState.qFirstLevelSlotsExpended
  pure def qScenarioResult: str = qState.qScenarioResult


  action recordProjection(
    beastTargetAdmitted: bool,
    humanoidTargetAdmitted: bool,
    knownWillingProtectionTargetAdmitted: bool,
    plainProtectionTargetRejected: bool,
    protectionEffectPresent: bool,
    scopedAttackRollDisadvantage: bool,
    unscopedAttackRollNormal: bool,
    scopedCharmPrevented: bool,
    unscopedCharmApplied: bool,
    scopedPossessionPrevented: bool,
    unscopedPossessionUnprevented: bool,
    relevantCharmSaveHasAdvantage: bool,
    relevantCharmSaveCleared: bool,
    targetCharmed: bool,
    animalFriendshipEffectPresent: bool,
    actionAvailable: bool,
    firstLevelSlotsExpended: int,
    scenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qBeastTargetAdmitted: beastTargetAdmitted,
      qHumanoidTargetAdmitted: humanoidTargetAdmitted,
      qKnownWillingProtectionTargetAdmitted: knownWillingProtectionTargetAdmitted,
      qPlainProtectionTargetRejected: plainProtectionTargetRejected,
      qProtectionEffectPresent: protectionEffectPresent,
      qScopedAttackRollDisadvantage: scopedAttackRollDisadvantage,
      qUnscopedAttackRollNormal: unscopedAttackRollNormal,
      qScopedCharmPrevented: scopedCharmPrevented,
      qUnscopedCharmApplied: unscopedCharmApplied,
      qScopedPossessionPrevented: scopedPossessionPrevented,
      qUnscopedPossessionUnprevented: unscopedPossessionUnprevented,
      qRelevantCharmSaveHasAdvantage: relevantCharmSaveHasAdvantage,
      qRelevantCharmSaveCleared: relevantCharmSaveCleared,
      qTargetCharmed: targetCharmed,
      qAnimalFriendshipEffectPresent: animalFriendshipEffectPresent,
      qActionAvailable: actionAvailable,
      qFirstLevelSlotsExpended: firstLevelSlotsExpended,
      qScenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = recordProjection(
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    0,
    "init",
    witnessInit(CreatureTypeProtectionCharm),
  )

  action doDiscoverAnimalFriendshipBeastTargetAdmission = all {
    qScenarioResult == "init",
    recordProjection(
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      0,
      "discovered",
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doResolveAnimalFriendshipFailedSaveCharmed = all {
    qScenarioResult == "init",
    recordProjection(
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      1,
      "resolved",
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doResolveAnimalFriendshipCasterDamageBreak = all {
    qScenarioResult == "init",
    recordProjection(
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      1,
      "damageBreakResolved",
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection = all {
    qScenarioResult == "init",
    recordProjection(
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      1,
      "protectionResolved",
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage = all {
    qScenarioResult == "init",
    recordProjection(
      false,
      false,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      1,
      "protectionAttackProjected",
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doPreventProtectionFromEvilAndGoodScopedCharmAndPossession = all {
    qScenarioResult == "init",
    recordProjection(
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      1,
      "protectionCharmPrevented",
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage = all {
    qScenarioResult == "init",
    recordProjection(
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      1,
      "protectionRelevantSaveResolved",
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action step = any {
    doDiscoverAnimalFriendshipBeastTargetAdmission,
    doResolveAnimalFriendshipFailedSaveCharmed,
    doResolveAnimalFriendshipCasterDamageBreak,
    doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection,
    doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage,
    doPreventProtectionFromEvilAndGoodScopedCharmAndPossession,
    doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage,
  }
}
