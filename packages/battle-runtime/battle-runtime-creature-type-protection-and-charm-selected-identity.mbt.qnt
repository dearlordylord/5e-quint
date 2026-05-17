// -*- mode: Bluespec; -*-

module battleRuntimeCreatureTypeProtectionAndCharmSelectedIdentityMbt {
  var qBeastTargetAdmitted: bool
  var qHumanoidTargetAdmitted: bool
  var qKnownWillingProtectionTargetAdmitted: bool
  var qPlainProtectionTargetRejected: bool
  var qProtectionEffectPresent: bool
  var qScopedAttackRollDisadvantage: bool
  var qUnscopedAttackRollNormal: bool
  var qScopedCharmPrevented: bool
  var qUnscopedCharmApplied: bool
  var qScopedPossessionPrevented: bool
  var qUnscopedPossessionUnprevented: bool
  var qRelevantCharmSaveHasAdvantage: bool
  var qRelevantCharmSaveCleared: bool
  var qTargetCharmed: bool
  var qAnimalFriendshipEffectPresent: bool
  var qActionAvailable: bool
  var qFirstLevelSlotsExpended: int
  var qLastResult: str

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
    lastResult: str,
  ): bool = all {
    qBeastTargetAdmitted' = beastTargetAdmitted,
    qHumanoidTargetAdmitted' = humanoidTargetAdmitted,
    qKnownWillingProtectionTargetAdmitted' = knownWillingProtectionTargetAdmitted,
    qPlainProtectionTargetRejected' = plainProtectionTargetRejected,
    qProtectionEffectPresent' = protectionEffectPresent,
    qScopedAttackRollDisadvantage' = scopedAttackRollDisadvantage,
    qUnscopedAttackRollNormal' = unscopedAttackRollNormal,
    qScopedCharmPrevented' = scopedCharmPrevented,
    qUnscopedCharmApplied' = unscopedCharmApplied,
    qScopedPossessionPrevented' = scopedPossessionPrevented,
    qUnscopedPossessionUnprevented' = unscopedPossessionUnprevented,
    qRelevantCharmSaveHasAdvantage' = relevantCharmSaveHasAdvantage,
    qRelevantCharmSaveCleared' = relevantCharmSaveCleared,
    qTargetCharmed' = targetCharmed,
    qAnimalFriendshipEffectPresent' = animalFriendshipEffectPresent,
    qActionAvailable' = actionAvailable,
    qFirstLevelSlotsExpended' = firstLevelSlotsExpended,
    qLastResult' = lastResult,
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
  )

  action doDiscoverAnimalFriendshipBeastTargetAdmission = all {
    qLastResult == "init",
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
    ),
  }

  action doResolveAnimalFriendshipFailedSaveCharmed = all {
    qLastResult == "init",
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
    ),
  }

  action doResolveAnimalFriendshipCasterDamageBreak = all {
    qLastResult == "init",
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
    ),
  }

  action doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection = all {
    qLastResult == "init",
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
    ),
  }

  action doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage = all {
    qLastResult == "init",
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
    ),
  }

  action doPreventProtectionFromEvilAndGoodScopedCharmAndPossession = all {
    qLastResult == "init",
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
    ),
  }

  action doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage = all {
    qLastResult == "init",
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
