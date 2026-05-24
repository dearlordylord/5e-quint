// -*- mode: Bluespec; -*-

module battleRuntimeHeatMetalObjectContactMbt {
  var qCurrentTurnRole: str
  var qActionAvailable: bool
  var qBonusActionAvailable: bool
  var qSpellAvailable: bool
  var qRepeatAvailable: bool
  var qObjectContactEffectActive: bool
  var qCasterConcentrating: bool
  var qTargetHp: int
  var qLastResult: str

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val initialTargetHp: int = 40
  pure val castDamage: int = 7
  pure val repeatDamage: int = 5

  action recordHeatMetalState(
    currentTurnRole: str,
    actionAvailable: bool,
    bonusActionAvailable: bool,
    spellAvailable: bool,
    repeatAvailable: bool,
    objectContactEffectActive: bool,
    casterConcentrating: bool,
    targetHp: int,
    lastResult: str,
  ): bool = all {
    qCurrentTurnRole' = currentTurnRole,
    qActionAvailable' = actionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qSpellAvailable' = spellAvailable,
    qRepeatAvailable' = repeatAvailable,
    qObjectContactEffectActive' = objectContactEffectActive,
    qCasterConcentrating' = casterConcentrating,
    qTargetHp' = targetHp,
    qLastResult' = lastResult,
  }

  action init = all {
    recordHeatMetalState(
      casterTurnRole,
      true,
      true,
      true,
      false,
      false,
      false,
      initialTargetHp,
      "init",
    ),
  }

  action doCastNoContact = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qSpellAvailable,
    not(qObjectContactEffectActive),
    recordHeatMetalState(
      casterTurnRole,
      false,
      qBonusActionAvailable,
      false,
      false,
      true,
      true,
      qTargetHp,
      "castNoContact",
    ),
  }

  action doCastContactDamage = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qSpellAvailable,
    not(qObjectContactEffectActive),
    recordHeatMetalState(
      casterTurnRole,
      false,
      qBonusActionAvailable,
      false,
      false,
      true,
      true,
      qTargetHp - castDamage,
      "castContactDamage",
    ),
  }

  action doTrySameTurnRepeatBlocked = all {
    qCurrentTurnRole == casterTurnRole,
    qObjectContactEffectActive,
    qBonusActionAvailable,
    not(qRepeatAvailable),
    recordHeatMetalState(
      casterTurnRole,
      qActionAvailable,
      qBonusActionAvailable,
      qSpellAvailable,
      false,
      true,
      true,
      qTargetHp,
      "repeatBlocked",
    ),
  }

  action doEndCasterTurn = all {
    qCurrentTurnRole == casterTurnRole,
    qObjectContactEffectActive,
    qCasterConcentrating,
    recordHeatMetalState(
      targetTurnRole,
      true,
      true,
      false,
      false,
      true,
      true,
      qTargetHp,
      "endCasterTurn",
    ),
  }

  action doEndTargetTurn = all {
    qCurrentTurnRole == targetTurnRole,
    qObjectContactEffectActive,
    qCasterConcentrating,
    recordHeatMetalState(
      casterTurnRole,
      true,
      true,
      false,
      true,
      true,
      true,
      qTargetHp,
      "endTargetTurn",
    ),
  }

  action doRepeatContactDamage = all {
    qCurrentTurnRole == casterTurnRole,
    qRepeatAvailable,
    qObjectContactEffectActive,
    qCasterConcentrating,
    qBonusActionAvailable,
    recordHeatMetalState(
      casterTurnRole,
      qActionAvailable,
      false,
      false,
      false,
      true,
      true,
      qTargetHp - repeatDamage,
      "repeatContactDamage",
    ),
  }

  action doBreakConcentration = all {
    qObjectContactEffectActive,
    qCasterConcentrating,
    recordHeatMetalState(
      qCurrentTurnRole,
      qActionAvailable,
      qBonusActionAvailable,
      qSpellAvailable,
      false,
      false,
      false,
      qTargetHp,
      "concentrationBroken",
    ),
  }

  action step = any {
    doCastNoContact,
    doCastContactDamage,
    doTrySameTurnRepeatBlocked,
    doEndCasterTurn,
    doEndTargetTurn,
    doRepeatContactDamage,
    doBreakConcentration,
  }
}
