// -*- mode: Bluespec; -*-

module battleRuntimeFeatureSelectedIdentityMbt {
  var qBonusActionAvailable: bool
  var qFeatureUsesRemaining: int
  var qInnateSorceryOccurrence: str
  var qSpellSaveDc: int
  var qSpellAttackRollMode: str
  var qLastResult: str

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
    qBonusActionAvailable' = bonusActionAvailable,
    qFeatureUsesRemaining' = featureUsesRemaining,
    qInnateSorceryOccurrence' = innateSorceryOccurrence,
    qSpellSaveDc' = spellSaveDc,
    qSpellAttackRollMode' = spellAttackRollMode,
    qLastResult' = lastResult,
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
