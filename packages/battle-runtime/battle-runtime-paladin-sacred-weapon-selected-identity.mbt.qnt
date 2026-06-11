// -*- mode: Bluespec; -*-

module battleRuntimePaladinSacredWeaponSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type PaladinSacredWeaponSelectedIdentityScenarioOutcome = | Init | Activated | NoResource | RangedWeapon | Recast | AttackEffects | Dismissed | NotCarryingWeapon


  type PaladinSacredWeaponSelectedIdentityWitnessState = {
    qActivationOffered: bool,
    qChannelDivinityUsesRemaining: int,
    qBoundWeaponItemId: str,
    qActiveEffectCount: int,
    qRejected: bool,
    qScenarioOutcome: PaladinSacredWeaponSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: PaladinSacredWeaponSelectedIdentityWitnessState

  pure def qActivationOffered: bool = qState.qActivationOffered
  pure def qChannelDivinityUsesRemaining: int = qState.qChannelDivinityUsesRemaining
  pure def qBoundWeaponItemId: str = qState.qBoundWeaponItemId
  pure def qActiveEffectCount: int = qState.qActiveEffectCount
  pure def qRejected: bool = qState.qRejected
  pure def qLastResult: PaladinSacredWeaponSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: PaladinSacredWeaponSelectedIdentityScenarioOutcome,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    activationOffered: bool,
    channelDivinityUsesRemaining: int,
    boundWeaponItemId: str,
    activeEffectCount: int,
    rejected: bool,
    lastResult: PaladinSacredWeaponSelectedIdentityScenarioOutcome,
  ): bool = all {
    qState' = {
      qActivationOffered: activationOffered,
      qChannelDivinityUsesRemaining: channelDivinityUsesRemaining,
      qBoundWeaponItemId: boundWeaponItemId,
      qActiveEffectCount: activeEffectCount,
      qRejected: rejected,
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init = recordProjection(false, 2, "none", 0, false, Init)

  action doActivateSacredWeapon = all {
    qLastResult == Init,
    recordProjection(false, 1, "main:weapon_longsword", 1, false, Activated),
  }

  action doRejectSacredWeaponNoResource = all {
    qLastResult == Init,
    recordProjection(false, 0, "none", 0, true, NoResource),
  }

  action doRejectSacredWeaponRangedWeapon = all {
    qLastResult == Init,
    recordProjection(false, 2, "none", 0, true, RangedWeapon),
  }

  action doRecastSacredWeapon = all {
    qLastResult == Init,
    recordProjection(false, 0, "second:weapon_longsword", 1, false, Recast),
  }

  action doProjectSacredWeaponAttackDamageAndLight = all {
    qLastResult == Init,
    recordProjection(false, 1, "main:weapon_longsword", 1, false, AttackEffects),
  }

  action doDismissSacredWeapon = all {
    qLastResult == Init,
    recordProjection(false, 1, "none", 0, false, Dismissed),
  }

  action doEndSacredWeaponWhenNotCarryingWeapon = all {
    qLastResult == Init,
    recordProjection(false, 1, "none", 0, false, NotCarryingWeapon),
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
