// -*- mode: Bluespec; -*-

module battleRuntimeRayOfEnfeeblementLifecycleMbt {
  var qCurrentTurnRole: str
  var qActionAvailable: bool
  var qD20EffectActive: bool
  var qDamagePenaltyActive: bool
  var qCasterConcentrating: bool
  var qSpellAvailable: bool
  var qStrAttackRollDisadvantage: bool
  var qStrAbilityCheckDisadvantage: bool
  var qStrSavingThrowDisadvantage: bool
  var qHoles: Set[str]
  var qLastDamageAfterPenalty: int
  var qLastResult: str

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

  action recordRayState(
    currentTurnRole: str,
    actionAvailable: bool,
    spellAvailable: bool,
    effectActive: bool,
    casterConcentrating: bool,
    holes: Set[str],
    lastDamageAfterPenalty: int,
    lastResult: str,
  ): bool = all {
    qCurrentTurnRole' = currentTurnRole,
    qActionAvailable' = actionAvailable,
    qSpellAvailable' = spellAvailable,
    qD20EffectActive' = effectActive,
    qDamagePenaltyActive' = effectActive,
    qCasterConcentrating' = casterConcentrating,
    qStrAttackRollDisadvantage' = effectActive,
    qStrAbilityCheckDisadvantage' = effectActive,
    qStrSavingThrowDisadvantage' = effectActive,
    qHoles' = holes,
    qLastDamageAfterPenalty' = lastDamageAfterPenalty,
    qLastResult' = lastResult,
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
      "init",
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
      "resolved",
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
      "resolved",
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
        "resolved",
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
      "needsHoles",
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
      "maintained",
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
      "ended",
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
