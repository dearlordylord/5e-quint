// -*- mode: Bluespec; -*-

module battleRuntimePaladinSacredWeaponSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type PaladinSacredWeaponSelectedIdentityWitnessState = {
    qActivationOffered: bool,
    qChannelDivinityUsesRemaining: int,
    qBoundWeaponItemId: str,
    qActiveEffectCount: int,
    qRejected: bool,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: PaladinSacredWeaponSelectedIdentityWitnessState

  pure def qActivationOffered: bool = qState.qActivationOffered
  pure def qChannelDivinityUsesRemaining: int = qState.qChannelDivinityUsesRemaining
  pure def qBoundWeaponItemId: str = qState.qBoundWeaponItemId
  pure def qActiveEffectCount: int = qState.qActiveEffectCount
  pure def qRejected: bool = qState.qRejected
  pure def qLastResult: str = qState.qScenarioResult

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    activationOffered: bool,
    channelDivinityUsesRemaining: int,
    boundWeaponItemId: str,
    activeEffectCount: int,
    rejected: bool,
    lastResult: str,
  ): bool = all {
    qState' = {
      qActivationOffered: activationOffered,
      qChannelDivinityUsesRemaining: channelDivinityUsesRemaining,
      qBoundWeaponItemId: boundWeaponItemId,
      qActiveEffectCount: activeEffectCount,
      qRejected: rejected,
      qScenarioResult: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
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

  action doProjectSacredWeaponAttackDamageAndLight = all {
    qLastResult == "init",
    recordProjection(false, 1, "main:weapon_longsword", 1, false, "attackEffects"),
  }

  action doDismissSacredWeapon = all {
    qLastResult == "init",
    recordProjection(false, 1, "none", 0, false, "dismissed"),
  }

  action doEndSacredWeaponWhenNotCarryingWeapon = all {
    qLastResult == "init",
    recordProjection(false, 1, "none", 0, false, "notCarryingWeapon"),
  }

  action step = any {
    doActivateSacredWeapon,
    doRejectSacredWeaponNoResource,
    doRejectSacredWeaponRangedWeapon,
    doRecastSacredWeapon,
    doProjectSacredWeaponAttackDamageAndLight,
    doDismissSacredWeapon,
    doEndSacredWeaponWhenNotCarryingWeapon,
  }
}
