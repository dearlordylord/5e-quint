// -*- mode: Bluespec; -*-

module battleRuntimeFeatureSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type FeatureSelectedIdentityWitnessState = {
    qBonusActionAvailable: bool,
    qFeatureUsesRemaining: int,
    qInnateSorceryOccurrence: str,
    qSpellSaveDc: int,
    qSpellAttackRollMode: str,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: FeatureSelectedIdentityWitnessState

  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qFeatureUsesRemaining: int = qState.qFeatureUsesRemaining
  pure def qInnateSorceryOccurrence: str = qState.qInnateSorceryOccurrence
  pure def qSpellSaveDc: int = qState.qSpellSaveDc
  pure def qSpellAttackRollMode: str = qState.qSpellAttackRollMode
  pure def qLastResult: str = qState.qScenarioResult

  pure def featureSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  pure def baseSorcererSpellSaveDc: int = 13
  pure def innateSorcerySpellSaveDc: int = 14
  pure def activeInnateSorceryOccurrence: str = "activeUntilEndOfRound11"

  action recordProjection(
    bonusActionAvailable: bool,
    featureUsesRemaining: int,
    innateSorceryOccurrence: str,
    spellSaveDc: int,
    spellAttackRollMode: str,
    lastResult: str,
  ): bool = all {
    qState' = {
      qBonusActionAvailable: bonusActionAvailable,
      qFeatureUsesRemaining: featureUsesRemaining,
      qInnateSorceryOccurrence: innateSorceryOccurrence,
      qSpellSaveDc: spellSaveDc,
      qSpellAttackRollMode: spellAttackRollMode,
      qScenarioResult: lastResult,
      protocol: featureSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection(
    true,
    2,
    "inactive",
    baseSorcererSpellSaveDc,
    "none",
    "init",
  )

  action doActivateInnateSorcery = all {
    qLastResult == "init",
    recordProjection(
      false,
      1,
      activeInnateSorceryOccurrence,
      innateSorcerySpellSaveDc,
      "none",
      "activated",
    ),
  }

  action doProjectInnateSorcerySpellBenefits = all {
    qLastResult == "init",
    recordProjection(
      false,
      1,
      activeInnateSorceryOccurrence,
      innateSorcerySpellSaveDc,
      "advantage",
      "spellBenefitsProjected",
    ),
  }

  action doExcludeInnateSorceryNonSorcererSpellBenefits = all {
    qLastResult == "init",
    recordProjection(
      false,
      1,
      activeInnateSorceryOccurrence,
      baseSorcererSpellSaveDc,
      "none",
      "nonSorcererExcluded",
    ),
  }

  action step = any {
    doActivateInnateSorcery,
    doProjectInnateSorcerySpellBenefits,
    doExcludeInnateSorceryNonSorcererSpellBenefits,
  }
}
