// -*- mode: Bluespec; -*-

module battleRuntimeCreatureTypeProtectionAndCharmSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | CreatureTypeProtectionCharm

  type CreatureTypeProtectionAndCharmSelectedIdentityScenarioOutcome = | Init | Discovered | Resolved | DamageBreakResolved | ProtectionResolved | ProtectionAttackProjected | ProtectionCharmPrevented | ProtectionRelevantSaveResolved


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
    qScenarioOutcome: CreatureTypeProtectionAndCharmSelectedIdentityScenarioOutcome,
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
  pure def qScenarioOutcome: CreatureTypeProtectionAndCharmSelectedIdentityScenarioOutcome = qState.qScenarioOutcome


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
    scenarioOutcome: CreatureTypeProtectionAndCharmSelectedIdentityScenarioOutcome,
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
      qScenarioOutcome: scenarioOutcome,
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
    Init,
    witnessInit(CreatureTypeProtectionCharm),
  )

  action doDiscoverAnimalFriendshipBeastTargetAdmission = all {
    qScenarioOutcome == Init,
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
      Discovered,
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doResolveAnimalFriendshipFailedSaveCharmed = all {
    qScenarioOutcome == Init,
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
      Resolved,
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doResolveAnimalFriendshipCasterDamageBreak = all {
    qScenarioOutcome == Init,
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
      DamageBreakResolved,
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection = all {
    qScenarioOutcome == Init,
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
      ProtectionResolved,
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage = all {
    qScenarioOutcome == Init,
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
      ProtectionAttackProjected,
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doPreventProtectionFromEvilAndGoodScopedCharmAndPossession = all {
    qScenarioOutcome == Init,
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
      ProtectionCharmPrevented,
    witnessResolved(CreatureTypeProtectionCharm),
  ),
  }

  action doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage = all {
    qScenarioOutcome == Init,
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
      ProtectionRelevantSaveResolved,
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
