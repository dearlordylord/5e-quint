// -*- mode: Bluespec; -*-

module battleRuntimeRayOfEnfeeblementLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type RayOfEnfeeblementLifecycleScenarioOutcome = | Init | Resolved | NeedsHoles | Maintained | Ended

  type RayOfEnfeeblementLifecycleWitnessState = {
    qCurrentTurnRole: str,
    qActionAvailable: bool,
    qD20EffectActive: bool,
    qDamagePenaltyActive: bool,
    qCasterConcentrating: bool,
    qSpellAvailable: bool,
    qStrAttackRollDisadvantage: bool,
    qStrAbilityCheckDisadvantage: bool,
    qStrSavingThrowDisadvantage: bool,
    qLastDamageAfterPenalty: int,
    qScenarioOutcome: RayOfEnfeeblementLifecycleScenarioOutcome,
    protocol: WitnessProtocol[str],
  }

  var qState: RayOfEnfeeblementLifecycleWitnessState

  pure def qCurrentTurnRole: str = qState.qCurrentTurnRole
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qD20EffectActive: bool = qState.qD20EffectActive
  pure def qDamagePenaltyActive: bool = qState.qDamagePenaltyActive
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qStrAttackRollDisadvantage: bool = qState.qStrAttackRollDisadvantage
  pure def qStrAbilityCheckDisadvantage: bool = qState.qStrAbilityCheckDisadvantage
  pure def qStrSavingThrowDisadvantage: bool = qState.qStrSavingThrowDisadvantage
  pure def qLastDamageAfterPenalty: int = qState.qLastDamageAfterPenalty
  pure def qHoles: Set[str] = qState.protocol.holes
  pure def qLastResult: RayOfEnfeeblementLifecycleScenarioOutcome = qState.qScenarioOutcome

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val noDamageResolved: int = -1
  pure val noHoles: Set[str] = Set()
  pure val savingThrowOutcomeHoles: Set[str] = Set("SavingThrowOutcome")

  pure def damageAfterRayPenalty(rolledDamage: int, penaltyRoll: int): int =
    if (rolledDamage <= 0)
      rolledDamage
    else if (rolledDamage - penaltyRoll < 0)
      0
    else
      rolledDamage - penaltyRoll

  pure def witnessProtocolForProjection(
    holes: Set[str],
    scenarioResult: RayOfEnfeeblementLifecycleScenarioOutcome,
    scenarioInvalidReason: str,
  ): WitnessProtocol[str] =
    if (scenarioResult == Init) witnessInit("")
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid("", WInvalidFill)
    else if (scenarioInvalidReason == "staleSubject") witnessInvalid("", WStaleSubject)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved("")

  action recordRayState(
    currentTurnRole: str,
    actionAvailable: bool,
    spellAvailable: bool,
    effectActive: bool,
    casterConcentrating: bool,
    holes: Set[str],
    lastDamageAfterPenalty: int,
    lastResult: RayOfEnfeeblementLifecycleScenarioOutcome,
  ): bool = all {
    qState' = {
      qCurrentTurnRole: currentTurnRole,
      qActionAvailable: actionAvailable,
      qSpellAvailable: spellAvailable,
      qD20EffectActive: effectActive,
      qDamagePenaltyActive: effectActive,
      qCasterConcentrating: casterConcentrating,
      qStrAttackRollDisadvantage: effectActive,
      qStrAbilityCheckDisadvantage: effectActive,
      qStrSavingThrowDisadvantage: effectActive,
      qLastDamageAfterPenalty: lastDamageAfterPenalty,
      qScenarioOutcome: lastResult,
      protocol: witnessProtocolForProjection(holes, lastResult, ""),
    },
  }

  action init = all {
    recordRayState(
      casterTurnRole,
      true,
      true,
      false,
      false,
      noHoles,
      noDamageResolved,
      Init,
    ),
  }

  action doCastFailedSave = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qSpellAvailable,
    qHoles == noHoles,
    recordRayState(
      casterTurnRole,
      false,
      false,
      true,
      true,
      noHoles,
      qLastDamageAfterPenalty,
      Resolved,
    ),
  }

  action doEndCasterTurn = all {
    qCurrentTurnRole == casterTurnRole,
    qD20EffectActive,
    qCasterConcentrating,
    qHoles == noHoles,
    recordRayState(
      targetTurnRole,
      true,
      qSpellAvailable,
      true,
      true,
      noHoles,
      qLastDamageAfterPenalty,
      Resolved,
    ),
  }

  action doResolveTargetDamage = {
    nondet penaltyRoll = Set(1, 4, 8).oneOf()
    all {
      qCurrentTurnRole == targetTurnRole,
      qActionAvailable,
      qD20EffectActive,
      qDamagePenaltyActive,
      qHoles == noHoles,
      recordRayState(
        targetTurnRole,
        false,
        qSpellAvailable,
        true,
        true,
        noHoles,
        damageAfterRayPenalty(6, penaltyRoll),
        Resolved,
      ),
    }
  }

  action doDiscoverRepeatSave = all {
    qCurrentTurnRole == targetTurnRole,
    qD20EffectActive,
    qCasterConcentrating,
    qHoles == noHoles,
    recordRayState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      savingThrowOutcomeHoles,
      qLastDamageAfterPenalty,
      NeedsHoles,
    ),
  }

  action doFillRepeatSaveFailure = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == savingThrowOutcomeHoles,
    recordRayState(
      casterTurnRole,
      true,
      qSpellAvailable,
      true,
      true,
      noHoles,
      qLastDamageAfterPenalty,
      Maintained,
    ),
  }

  action doFillRepeatSaveSuccess = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == savingThrowOutcomeHoles,
    recordRayState(
      casterTurnRole,
      true,
      qSpellAvailable,
      false,
      false,
      noHoles,
      qLastDamageAfterPenalty,
      Ended,
    ),
  }

  action step = any {
    doCastFailedSave,
    doEndCasterTurn,
    doResolveTargetDamage,
    doDiscoverRepeatSave,
    doFillRepeatSaveFailure,
    doFillRepeatSaveSuccess,
  }
}
