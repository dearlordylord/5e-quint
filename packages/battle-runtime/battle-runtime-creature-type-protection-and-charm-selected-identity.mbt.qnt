// -*- mode: Bluespec; -*-

module battleRuntimeCreatureTypeProtectionAndCharmSelectedIdentityMbt {
  var qBeastTargetAdmitted: bool
  var qHumanoidTargetAdmitted: bool
  var qTargetCharmed: bool
  var qAnimalFriendshipEffectPresent: bool
  var qActionAvailable: bool
  var qFirstLevelSlotsExpended: int
  var qLastResult: str

  action recordProjection(
    beastTargetAdmitted: bool,
    humanoidTargetAdmitted: bool,
    targetCharmed: bool,
    animalFriendshipEffectPresent: bool,
    actionAvailable: bool,
    firstLevelSlotsExpended: int,
    lastResult: str,
  ): bool = all {
    qBeastTargetAdmitted' = beastTargetAdmitted,
    qHumanoidTargetAdmitted' = humanoidTargetAdmitted,
    qTargetCharmed' = targetCharmed,
    qAnimalFriendshipEffectPresent' = animalFriendshipEffectPresent,
    qActionAvailable' = actionAvailable,
    qFirstLevelSlotsExpended' = firstLevelSlotsExpended,
    qLastResult' = lastResult,
  }

  action init = recordProjection(false, false, false, false, true, 0, "init")

  action doDiscoverAnimalFriendshipBeastTargetAdmission = all {
    qLastResult == "init",
    recordProjection(true, false, false, false, true, 0, "discovered"),
  }

  action doResolveAnimalFriendshipFailedSaveCharmed = all {
    qLastResult == "init",
    recordProjection(true, false, true, true, false, 1, "resolved"),
  }

  action doResolveAnimalFriendshipCasterDamageBreak = all {
    qLastResult == "init",
    recordProjection(true, false, false, false, false, 1, "damageBreakResolved"),
  }

  action step = any {
    doDiscoverAnimalFriendshipBeastTargetAdmission,
    doResolveAnimalFriendshipFailedSaveCharmed,
    doResolveAnimalFriendshipCasterDamageBreak,
  }
}
