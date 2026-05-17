// -*- mode: Bluespec; -*-

module battleRuntimeMageArmorSelectedIdentityMbt {
  var qSelfTargetAdmitted: bool
  var qArmoredTargetRejected: bool
  var qMageArmorEffectPresent: bool
  var qStoredArmorBaseStillUnarmored: bool
  var qProjectedBaseIsMageArmor: bool
  var qArmorClass: int
  var qMageArmorDurationTicks: int
  var qLevel1SlotsExpended: int
  var qActionAvailable: bool
  var qLastResult: str

  pure def defaultUnarmoredBaseArmorClass: int = 10
  pure def mageArmorBaseArmorClass: int = 13
  pure def mageArmorDexModifier: int = 2
  pure def elapsedTimeTicksPerHour: int = 600
  pure def initialArmorClass: int = defaultUnarmoredBaseArmorClass + mageArmorDexModifier
  pure def mageArmorArmorClass: int = mageArmorBaseArmorClass + mageArmorDexModifier
  pure def mageArmorDurationTicks: int = 8 * elapsedTimeTicksPerHour

  action recordProjection(
    selfTargetAdmitted: bool,
    armoredTargetRejected: bool,
    mageArmorEffectPresent: bool,
    storedArmorBaseStillUnarmored: bool,
    projectedBaseIsMageArmor: bool,
    armorClass: int,
    durationTicks: int,
    level1SlotsExpended: int,
    actionAvailable: bool,
    lastResult: str,
  ): bool = all {
    qSelfTargetAdmitted' = selfTargetAdmitted,
    qArmoredTargetRejected' = armoredTargetRejected,
    qMageArmorEffectPresent' = mageArmorEffectPresent,
    qStoredArmorBaseStillUnarmored' = storedArmorBaseStillUnarmored,
    qProjectedBaseIsMageArmor' = projectedBaseIsMageArmor,
    qArmorClass' = armorClass,
    qMageArmorDurationTicks' = durationTicks,
    qLevel1SlotsExpended' = level1SlotsExpended,
    qActionAvailable' = actionAvailable,
    qLastResult' = lastResult,
  }

  action init = recordProjection(
    true,
    false,
    false,
    true,
    false,
    initialArmorClass,
    0,
    0,
    true,
    "init",
  )

  action doDiscoverMageArmorUnarmoredSelfTarget = all {
    qLastResult == "init",
    recordProjection(
      true,
      false,
      false,
      true,
      false,
      initialArmorClass,
      0,
      0,
      true,
      "discovered",
    ),
  }

  action doRejectMageArmorArmoredTarget = all {
    qLastResult == "init",
    recordProjection(
      true,
      true,
      false,
      true,
      false,
      initialArmorClass,
      0,
      0,
      true,
      "armoredRejected",
    ),
  }

  action doResolveMageArmorBaseArmorClassProjection = all {
    qLastResult == "init",
    recordProjection(
      true,
      false,
      true,
      true,
      true,
      mageArmorArmorClass,
      mageArmorDurationTicks,
      1,
      false,
      "resolved",
    ),
  }

  action doExpireMageArmorDuration = all {
    qLastResult == "init",
    recordProjection(
      true,
      false,
      false,
      true,
      false,
      initialArmorClass,
      0,
      1,
      false,
      "durationExpired",
    ),
  }

  action step = any {
    doDiscoverMageArmorUnarmoredSelfTarget,
    doRejectMageArmorArmoredTarget,
    doResolveMageArmorBaseArmorClassProjection,
    doExpireMageArmorDuration,
  }
}
