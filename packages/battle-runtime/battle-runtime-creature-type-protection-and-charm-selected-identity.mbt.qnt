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
    qRelevantCharmSiblingPreserved: bool,
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
  pure def qRelevantCharmSiblingPreserved: bool = qState.qRelevantCharmSiblingPreserved
  pure def qTargetCharmed: bool = qState.qTargetCharmed
  pure def qAnimalFriendshipEffectPresent: bool = qState.qAnimalFriendshipEffectPresent
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qFirstLevelSlotsExpended: int = qState.qFirstLevelSlotsExpended
  pure def qScenarioOutcome: CreatureTypeProtectionAndCharmSelectedIdentityScenarioOutcome = qState.qScenarioOutcome


  pure val initialProjection: WitnessState = {
    qBeastTargetAdmitted: false,
    qHumanoidTargetAdmitted: false,
    qKnownWillingProtectionTargetAdmitted: false,
    qPlainProtectionTargetRejected: false,
    qProtectionEffectPresent: false,
    qScopedAttackRollDisadvantage: false,
    qUnscopedAttackRollNormal: false,
    qScopedCharmPrevented: false,
    qUnscopedCharmApplied: false,
    qScopedPossessionPrevented: false,
    qUnscopedPossessionUnprevented: false,
    qRelevantCharmSaveHasAdvantage: false,
    qRelevantCharmSaveCleared: false,
    qRelevantCharmSiblingPreserved: false,
    qTargetCharmed: false,
    qAnimalFriendshipEffectPresent: false,
    qActionAvailable: true,
    qFirstLevelSlotsExpended: 0,
    qScenarioOutcome: Init,
    protocol: witnessInit(CreatureTypeProtectionCharm),
  }

  action recordProjection(projection: WitnessState): bool = all {
    qState' = projection,
  }

  action init = recordProjection(initialProjection)

  action doDiscoverAnimalFriendshipBeastTargetAdmission = all {
    qScenarioOutcome == Init,
    recordProjection({
      ...initialProjection,
      qBeastTargetAdmitted: true,
      qScenarioOutcome: Discovered,
      protocol: witnessResolved(CreatureTypeProtectionCharm),
    }),
  }

  action doResolveAnimalFriendshipFailedSaveCharmed = all {
    qScenarioOutcome == Init,
    recordProjection({
      ...initialProjection,
      qBeastTargetAdmitted: true,
      qTargetCharmed: true,
      qAnimalFriendshipEffectPresent: true,
      qActionAvailable: false,
      qFirstLevelSlotsExpended: 1,
      qScenarioOutcome: Resolved,
      protocol: witnessResolved(CreatureTypeProtectionCharm),
    }),
  }

  action doResolveAnimalFriendshipCasterDamageBreak = all {
    qScenarioOutcome == Init,
    recordProjection({
      ...initialProjection,
      qBeastTargetAdmitted: true,
      qActionAvailable: false,
      qFirstLevelSlotsExpended: 1,
      qScenarioOutcome: DamageBreakResolved,
      protocol: witnessResolved(CreatureTypeProtectionCharm),
    }),
  }

  action doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection = all {
    qScenarioOutcome == Init,
    recordProjection({
      ...initialProjection,
      qKnownWillingProtectionTargetAdmitted: true,
      qPlainProtectionTargetRejected: true,
      qProtectionEffectPresent: true,
      qActionAvailable: false,
      qFirstLevelSlotsExpended: 1,
      qScenarioOutcome: ProtectionResolved,
      protocol: witnessResolved(CreatureTypeProtectionCharm),
    }),
  }

  action doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage = all {
    qScenarioOutcome == Init,
    recordProjection({
      ...initialProjection,
      qKnownWillingProtectionTargetAdmitted: true,
      qPlainProtectionTargetRejected: true,
      qProtectionEffectPresent: true,
      qScopedAttackRollDisadvantage: true,
      qUnscopedAttackRollNormal: true,
      qActionAvailable: false,
      qFirstLevelSlotsExpended: 1,
      qScenarioOutcome: ProtectionAttackProjected,
      protocol: witnessResolved(CreatureTypeProtectionCharm),
    }),
  }

  action doPreventProtectionFromEvilAndGoodScopedCharmAndPossession = all {
    qScenarioOutcome == Init,
    recordProjection({
      ...initialProjection,
      qKnownWillingProtectionTargetAdmitted: true,
      qPlainProtectionTargetRejected: true,
      qProtectionEffectPresent: true,
      qScopedCharmPrevented: true,
      qUnscopedCharmApplied: true,
      qScopedPossessionPrevented: true,
      qUnscopedPossessionUnprevented: true,
      qActionAvailable: false,
      qFirstLevelSlotsExpended: 1,
      qScenarioOutcome: ProtectionCharmPrevented,
      protocol: witnessResolved(CreatureTypeProtectionCharm),
    }),
  }

  action doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage = all {
    qScenarioOutcome == Init,
    recordProjection({
      ...initialProjection,
      qKnownWillingProtectionTargetAdmitted: true,
      qPlainProtectionTargetRejected: true,
      qProtectionEffectPresent: true,
      qRelevantCharmSaveHasAdvantage: true,
      qRelevantCharmSaveCleared: true,
      qRelevantCharmSiblingPreserved: true,
      qActionAvailable: false,
      qFirstLevelSlotsExpended: 1,
      qScenarioOutcome: ProtectionRelevantSaveResolved,
      protocol: witnessResolved(CreatureTypeProtectionCharm),
    }),
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
