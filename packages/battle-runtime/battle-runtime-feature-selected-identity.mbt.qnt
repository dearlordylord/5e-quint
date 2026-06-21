// -*- mode: Bluespec; -*-

module battleRuntimeFeatureSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type FeatureSelectedIdentityScenarioOutcome = | Init | Activated | SpellBenefitsProjected | NonSorcererExcluded


  type FeatureSelectedIdentityWitnessState = {
    qBonusActionAvailable: bool,
    qFeatureUsesRemaining: int,
    qInnateSorceryOccurrence: str,
    qSpellSaveDc: int,
    qSpellAttackRollMode: str,
    qScenarioOutcome: FeatureSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: FeatureSelectedIdentityWitnessState

  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qFeatureUsesRemaining: int = qState.qFeatureUsesRemaining
  pure def qInnateSorceryOccurrence: str = qState.qInnateSorceryOccurrence
  pure def qSpellSaveDc: int = qState.qSpellSaveDc
  pure def qSpellAttackRollMode: str = qState.qSpellAttackRollMode
  pure def scenarioOutcome: FeatureSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def featureSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: FeatureSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
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
    lastResult: FeatureSelectedIdentityScenarioOutcome,
  ): bool = all {
    qState' = {
      qBonusActionAvailable: bonusActionAvailable,
      qFeatureUsesRemaining: featureUsesRemaining,
      qInnateSorceryOccurrence: innateSorceryOccurrence,
      qSpellSaveDc: spellSaveDc,
      qSpellAttackRollMode: spellAttackRollMode,
      qScenarioOutcome: lastResult,
      protocol: featureSelectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(
    true,
    2,
    "inactive",
    baseSorcererSpellSaveDc,
    "none",
    Init,
  )

  action doActivateInnateSorcery = all {
    scenarioOutcome == Init,
    recordProjection(
      false,
      1,
      activeInnateSorceryOccurrence,
      innateSorcerySpellSaveDc,
      "none",
      Activated,
    ),
  }

  action doProjectInnateSorcerySpellBenefits = all {
    scenarioOutcome == Init,
    recordProjection(
      false,
      1,
      activeInnateSorceryOccurrence,
      innateSorcerySpellSaveDc,
      "advantage",
      SpellBenefitsProjected,
    ),
  }

  action doExcludeInnateSorceryNonSorcererSpellBenefits = all {
    scenarioOutcome == Init,
    recordProjection(
      false,
      1,
      activeInnateSorceryOccurrence,
      baseSorcererSpellSaveDc,
      "none",
      NonSorcererExcluded,
    ),
  }

  action step = any {
    doActivateInnateSorcery,
    doProjectInnateSorcerySpellBenefits,
    doExcludeInnateSorceryNonSorcererSpellBenefits,
  }
}
