// -*- mode: Bluespec; -*-

module battleRuntimePaladinSacredWeaponSelectedIdentityMbt {
  var qActivationOffered: bool
  var qChannelDivinityUsesRemaining: int
  var qBoundWeaponItemId: str
  var qActiveEffectCount: int
  var qRejected: bool
  var qLastResult: str

  action recordProjection(
    activationOffered: bool,
    channelDivinityUsesRemaining: int,
    boundWeaponItemId: str,
    activeEffectCount: int,
    rejected: bool,
    lastResult: str,
  ): bool = all {
    qActivationOffered' = activationOffered,
    qChannelDivinityUsesRemaining' = channelDivinityUsesRemaining,
    qBoundWeaponItemId' = boundWeaponItemId,
    qActiveEffectCount' = activeEffectCount,
    qRejected' = rejected,
    qLastResult' = lastResult,
  }

  action init = recordProjection(false, 2, "none", 0, false, "init")

  action doActivateSacredWeapon = all {
    qLastResult == "init",
    recordProjection(false, 1, "main:weapon_longsword", 1, false, "activated"),
  }

  action doRejectSacredWeaponNoResource = all {
    qLastResult == "init",
    recordProjection(false, 0, "none", 0, true, "noResource"),
  }

  action doRejectSacredWeaponRangedWeapon = all {
    qLastResult == "init",
    recordProjection(false, 2, "none", 0, true, "rangedWeapon"),
  }

  action doRecastSacredWeapon = all {
    qLastResult == "init",
    recordProjection(false, 0, "second:weapon_longsword", 1, false, "recast"),
  }

  action step = any {
    doActivateSacredWeapon,
    doRejectSacredWeaponNoResource,
    doRejectSacredWeaponRangedWeapon,
    doRecastSacredWeapon,
  }
}
