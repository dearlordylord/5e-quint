// -*- mode: Bluespec; -*-

module battleRuntimeAntimagicFieldOngoingSuppressionMbt {
  var qActionAvailable: bool
  var qSpellAvailable: bool
  var qOngoingSpellEffectActive: bool
  var qSuppressionActive: bool
  var qSuppressedEffectRefCount: int
  var qOngoingSpellSuppressed: bool
  var qAntimagicCasterConcentrating: bool
  var qLastResult: str

  action recordAntimagicFieldState(
    actionAvailable: bool,
    spellAvailable: bool,
    ongoingSpellEffectActive: bool,
    suppressionActive: bool,
    suppressedEffectRefCount: int,
    ongoingSpellSuppressed: bool,
    antimagicCasterConcentrating: bool,
    lastResult: str,
  ): bool = all {
    qActionAvailable' = actionAvailable,
    qSpellAvailable' = spellAvailable,
    qOngoingSpellEffectActive' = ongoingSpellEffectActive,
    qSuppressionActive' = suppressionActive,
    qSuppressedEffectRefCount' = suppressedEffectRefCount,
    qOngoingSpellSuppressed' = ongoingSpellSuppressed,
    qAntimagicCasterConcentrating' = antimagicCasterConcentrating,
    qLastResult' = lastResult,
  }

  action init = all {
    recordAntimagicFieldState(
      true,
      true,
      true,
      false,
      0,
      false,
      false,
      "init",
    ),
  }

  action doSuppressOrdinarySpell = all {
    qActionAvailable,
    qSpellAvailable,
    qOngoingSpellEffectActive,
    not(qSuppressionActive),
    recordAntimagicFieldState(
      false,
      false,
      true,
      true,
      1,
      true,
      true,
      "suppressedOrdinarySpell",
    ),
  }

  action doSuppressArtifactSpell = all {
    qActionAvailable,
    qSpellAvailable,
    qOngoingSpellEffectActive,
    not(qSuppressionActive),
    recordAntimagicFieldState(
      false,
      false,
      true,
      true,
      0,
      false,
      true,
      "suppressedArtifactSpell",
    ),
  }

  action doBreakAntimagicConcentration = all {
    qSuppressionActive,
    qAntimagicCasterConcentrating,
    recordAntimagicFieldState(
      qActionAvailable,
      qSpellAvailable,
      true,
      false,
      0,
      false,
      false,
      "restored",
    ),
  }

  action step = any {
    doSuppressOrdinarySpell,
    doSuppressArtifactSpell,
    doBreakAntimagicConcentration,
  }
}
