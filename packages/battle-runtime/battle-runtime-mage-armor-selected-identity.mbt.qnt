// -*- mode: Bluespec; -*-

module battleRuntimeMageArmorSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type MageArmorSelectedIdentityScenarioOutcome = | Init | Discovered | ArmoredRejected | Resolved | DurationExpired

  type MageArmorSelectedIdentityWitnessState = {
    qSelfTargetAdmitted: bool,
    qArmoredTargetRejected: bool,
    qMageArmorEffectPresent: bool,
    qStoredArmorBaseStillUnarmored: bool,
    qProjectedBaseIsMageArmor: bool,
    qArmorClass: int,
    qMageArmorDurationTicks: int,
    qLevel1SlotsExpended: int,
    qActionAvailable: bool,
    qScenarioOutcome: MageArmorSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: MageArmorSelectedIdentityWitnessState

  pure def qSelfTargetAdmitted: bool = qState.qSelfTargetAdmitted
  pure def qArmoredTargetRejected: bool = qState.qArmoredTargetRejected
  pure def qMageArmorEffectPresent: bool = qState.qMageArmorEffectPresent
  pure def qStoredArmorBaseStillUnarmored: bool = qState.qStoredArmorBaseStillUnarmored
  pure def qProjectedBaseIsMageArmor: bool = qState.qProjectedBaseIsMageArmor
  pure def qArmorClass: int = qState.qArmorClass
  pure def qMageArmorDurationTicks: int = qState.qMageArmorDurationTicks
  pure def qLevel1SlotsExpended: int = qState.qLevel1SlotsExpended
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def scenarioOutcome: MageArmorSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def defaultUnarmoredBaseArmorClass: int = 10
  pure def mageArmorBaseArmorClass: int = 13
  pure def mageArmorDexModifier: int = 2
  pure def elapsedTimeTicksPerHour: int = 600
  pure def initialArmorClass: int = defaultUnarmoredBaseArmorClass + mageArmorDexModifier
  pure def mageArmorArmorClass: int = mageArmorBaseArmorClass + mageArmorDexModifier
  pure def mageArmorDurationTicks: int = 8 * elapsedTimeTicksPerHour

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: MageArmorSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

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
    lastResult: MageArmorSelectedIdentityScenarioOutcome,
  ): bool = all {
    qState' = {
      qSelfTargetAdmitted: selfTargetAdmitted,
      qArmoredTargetRejected: armoredTargetRejected,
      qMageArmorEffectPresent: mageArmorEffectPresent,
      qStoredArmorBaseStillUnarmored: storedArmorBaseStillUnarmored,
      qProjectedBaseIsMageArmor: projectedBaseIsMageArmor,
      qArmorClass: armorClass,
      qMageArmorDurationTicks: durationTicks,
      qLevel1SlotsExpended: level1SlotsExpended,
      qActionAvailable: actionAvailable,
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult),
    },
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
    Init,
  )

  action doDiscoverMageArmorUnarmoredSelfTarget = all {
    scenarioOutcome == Init,
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
      Discovered,
    ),
  }

  action doRejectMageArmorArmoredTarget = all {
    scenarioOutcome == Init,
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
      ArmoredRejected,
    ),
  }

  action doResolveMageArmorBaseArmorClassProjection = all {
    scenarioOutcome == Init,
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
      Resolved,
    ),
  }

  action doExpireMageArmorDuration = all {
    scenarioOutcome == Init,
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
      DurationExpired,
    ),
  }

  action step = any {
    doDiscoverMageArmorUnarmoredSelfTarget,
    doRejectMageArmorArmoredTarget,
    doResolveMageArmorBaseArmorClassProjection,
    doExpireMageArmorDuration,
  }
}
