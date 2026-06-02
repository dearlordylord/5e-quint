// -*- mode: Bluespec; -*-

module battleRuntimeSanctuarySelectedIdentityMbt {
  // Self-contained literal projection witness for fixed Sanctuary selected
  // identity scenarios. Runtime discovery in the TS witness remains the oracle;
  // this QNT driver records the expected replay facts without importing the
  // battle model or Sanctuary reducer closure.

  var qWardPresent: bool
  var qWardSourceIsSanctuary: bool
  var qWisdomSaveRequested: bool
  var qAttackOrSpellLost: bool
  var qSuccessfulSavePassThrough: bool
  var qLegalReplacementPassThrough: bool
  var qIllegalReplacementRejected: bool
  var qAreaEffectBypassedInterdiction: bool
  var qWardedHp: int
  var qLastResult: str

  pure def initialWardedHp: int = 12
  pure def damageDealtByWardedCreature: int = 1
  pure def wardedHpAfterDamage: int = initialWardedHp - damageDealtByWardedCreature

  action recordProjection(
    wardPresent: bool,
    wardSourceIsSanctuary: bool,
    wisdomSaveRequested: bool,
    attackOrSpellLost: bool,
    successfulSavePassThrough: bool,
    legalReplacementPassThrough: bool,
    illegalReplacementRejected: bool,
    areaEffectBypassedInterdiction: bool,
    wardedHp: int,
    lastResult: str,
  ): bool = all {
    qWardPresent' = wardPresent,
    qWardSourceIsSanctuary' = wardSourceIsSanctuary,
    qWisdomSaveRequested' = wisdomSaveRequested,
    qAttackOrSpellLost' = attackOrSpellLost,
    qSuccessfulSavePassThrough' = successfulSavePassThrough,
    qLegalReplacementPassThrough' = legalReplacementPassThrough,
    qIllegalReplacementRejected' = illegalReplacementRejected,
    qAreaEffectBypassedInterdiction' = areaEffectBypassedInterdiction,
    qWardedHp' = wardedHp,
    qLastResult' = lastResult,
  }

  action init = recordProjection(
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    initialWardedHp,
    "init",
  )

  action doCastSanctuaryWardCreation = all {
    qLastResult == "init",
    recordProjection(
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      initialWardedHp,
      "wardCreated",
    ),
  }

  action doInterdictDirectAttackFailedSaveLoss = all {
    qLastResult == "init",
    recordProjection(
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      initialWardedHp,
      "attackLost",
    ),
  }

  action doInterdictDirectSpellSuccessfulSavePassThrough = all {
    qLastResult == "init",
    recordProjection(
      true,
      true,
      true,
      false,
      true,
      false,
      false,
      false,
      initialWardedHp,
      "spellSaveSucceeded",
    ),
  }

  action doRetargetDirectAttackToLegalReplacement = all {
    qLastResult == "init",
    recordProjection(
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      initialWardedHp,
      "replacementAdmitted",
    ),
  }

  action doRejectIllegalReplacementTarget = all {
    qLastResult == "init",
    recordProjection(
      true,
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      initialWardedHp,
      "replacementRejected",
    ),
  }

  action doExcludeAreaEffectFromInterdiction = all {
    qLastResult == "init",
    recordProjection(
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      initialWardedHp,
      "areaEffectExcluded",
    ),
  }

  action doEndWardOnWardedAttackRoll = all {
    qLastResult == "init",
    recordProjection(
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      initialWardedHp,
      "attackRollEndedWard",
    ),
  }

  action doEndWardOnWardedSpellCast = all {
    qLastResult == "init",
    recordProjection(
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      initialWardedHp,
      "spellCastEndedWard",
    ),
  }

  action doEndWardOnWardedDamageDealt = all {
    qLastResult == "init",
    recordProjection(
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      wardedHpAfterDamage,
      "damageEndedWard",
    ),
  }

  action step = any {
    doCastSanctuaryWardCreation,
    doInterdictDirectAttackFailedSaveLoss,
    doInterdictDirectSpellSuccessfulSavePassThrough,
    doRetargetDirectAttackToLegalReplacement,
    doRejectIllegalReplacementTarget,
    doExcludeAreaEffectFromInterdiction,
    doEndWardOnWardedAttackRoll,
    doEndWardOnWardedSpellCast,
    doEndWardOnWardedDamageDealt,
  }
}
