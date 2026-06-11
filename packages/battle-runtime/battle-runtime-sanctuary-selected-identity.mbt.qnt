// -*- mode: Bluespec; -*-

module battleRuntimeSanctuarySelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Self-contained literal projection witness for fixed Sanctuary selected
  // identity scenarios. Runtime discovery in the TS witness remains the oracle;
  // this QNT driver records the expected replay facts without importing the
  // battle model or Sanctuary reducer closure.

  type WitnessHole = | WitnessProtocolHole

  type SanctuarySelectedIdentityScenarioOutcome = | Init | WardCreated | AttackLost | SpellSaveSucceeded | ReplacementAdmitted | ReplacementRejected | AreaEffectExcluded | AttackRollEndedWard | SpellCastEndedWard | DamageEndedWard


  type SanctuarySelectedIdentityWitnessState = {
    qWardPresent: bool,
    qWardSourceIsSanctuary: bool,
    qWisdomSaveRequested: bool,
    qAttackOrSpellLost: bool,
    qSuccessfulSavePassThrough: bool,
    qLegalReplacementPassThrough: bool,
    qIllegalReplacementRejected: bool,
    qAreaEffectBypassedInterdiction: bool,
    qWardedHp: int,
    qScenarioOutcome: SanctuarySelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: SanctuarySelectedIdentityWitnessState

  pure def qWardPresent: bool = qState.qWardPresent
  pure def qWardSourceIsSanctuary: bool = qState.qWardSourceIsSanctuary
  pure def qWisdomSaveRequested: bool = qState.qWisdomSaveRequested
  pure def qAttackOrSpellLost: bool = qState.qAttackOrSpellLost
  pure def qSuccessfulSavePassThrough: bool = qState.qSuccessfulSavePassThrough
  pure def qLegalReplacementPassThrough: bool = qState.qLegalReplacementPassThrough
  pure def qIllegalReplacementRejected: bool = qState.qIllegalReplacementRejected
  pure def qAreaEffectBypassedInterdiction: bool = qState.qAreaEffectBypassedInterdiction
  pure def qWardedHp: int = qState.qWardedHp
  pure def qLastResult: SanctuarySelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def initialWardedHp: int = 12
  pure def damageDealtByWardedCreature: int = 1
  pure def wardedHpAfterDamage: int = initialWardedHp - damageDealtByWardedCreature

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: SanctuarySelectedIdentityScenarioOutcome,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

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
    lastResult: SanctuarySelectedIdentityScenarioOutcome,
  ): bool = all {
    qState' = {
      qWardPresent: wardPresent,
      qWardSourceIsSanctuary: wardSourceIsSanctuary,
      qWisdomSaveRequested: wisdomSaveRequested,
      qAttackOrSpellLost: attackOrSpellLost,
      qSuccessfulSavePassThrough: successfulSavePassThrough,
      qLegalReplacementPassThrough: legalReplacementPassThrough,
      qIllegalReplacementRejected: illegalReplacementRejected,
      qAreaEffectBypassedInterdiction: areaEffectBypassedInterdiction,
      qWardedHp: wardedHp,
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
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
    Init,
  )

  action doCastSanctuaryWardCreation = all {
    qLastResult == Init,
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
      WardCreated,
    ),
  }

  action doInterdictDirectAttackFailedSaveLoss = all {
    qLastResult == Init,
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
      AttackLost,
    ),
  }

  action doInterdictDirectSpellSuccessfulSavePassThrough = all {
    qLastResult == Init,
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
      SpellSaveSucceeded,
    ),
  }

  action doRetargetDirectAttackToLegalReplacement = all {
    qLastResult == Init,
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
      ReplacementAdmitted,
    ),
  }

  action doRejectIllegalReplacementTarget = all {
    qLastResult == Init,
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
      ReplacementRejected,
    ),
  }

  action doExcludeAreaEffectFromInterdiction = all {
    qLastResult == Init,
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
      AreaEffectExcluded,
    ),
  }

  action doEndWardOnWardedAttackRoll = all {
    qLastResult == Init,
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
      AttackRollEndedWard,
    ),
  }

  action doEndWardOnWardedSpellCast = all {
    qLastResult == Init,
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
      SpellCastEndedWard,
    ),
  }

  action doEndWardOnWardedDamageDealt = all {
    qLastResult == Init,
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
      DamageEndedWard,
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
