// -*- mode: Bluespec; -*-

module battleRuntimeDragonsBreathGrantedActionMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Dragon's Breath:
  //   the target can take a Magic Action to exhale a 15-foot Cone; each
  //   creature in the area makes a Dexterity Saving Throw, taking 3d6 damage
  //   of the chosen type on a failed save or half as much on a successful one;
  //   damage increases by 1d6 for each spell slot level above 2.
  // - .references/srd-5.2.1/Rules-Glossary.md#Cone and #Concentration.
  // - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Saving Throw, Concentration, Cast
  //   Level, Spell Effect, Damage Roll, and Area of Effect.
  var qTurnRole: str
  var qMagicActionAvailable: bool
  var qSpellInvocationAvailable: bool
  var qTargetEffectActive: bool
  var qEffectDamageType: str
  var qEffectOriginalSlotLevel: int
  var qEffectSpellSaveDc: int
  var qSaveOutcome: str
  var qDamageRollTotal: int
  var qCasterHp: int
  var qCasterConcentrating: bool
  var qHoles: Set[str]
  var qLastResult: str

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val noDamageType: str = "none"
  pure val noSaveOutcome: str = "none"
  pure val noHoles: Set[str] = Set()
  pure val savingThrowOutcomeHoles: Set[str] = Set("SavingThrowOutcome")
  pure val damageRollHoles: Set[str] = Set("DamageRoll")
  pure val concentrationSavingThrowHoles: Set[str] = Set("ConcentrationSavingThrow")
  pure val casterFullHp: int = 12
  pure val casterSpellSaveDc: int = 13
  pure val legalDamageTypes: Set[str] = Set("acid", "cold", "fire", "lightning", "poison")

  pure def dragonsBreathDamageRollTotal(slotLevel: int): int =
    if (slotLevel == 2) 6 else 11

  pure def dragonsBreathDamageAfterSave(damageRollTotal: int, saveOutcome: str): int =
    if (saveOutcome == "success") damageRollTotal / 2 else damageRollTotal

  action recordDragonsBreathState(
    turnRole: str,
    magicActionAvailable: bool,
    spellInvocationAvailable: bool,
    targetEffectActive: bool,
    effectDamageType: str,
    effectOriginalSlotLevel: int,
    effectSpellSaveDc: int,
    saveOutcome: str,
    damageRollTotal: int,
    casterHp: int,
    casterConcentrating: bool,
    holes: Set[str],
    lastResult: str,
  ): bool = all {
    qTurnRole' = turnRole,
    qMagicActionAvailable' = magicActionAvailable,
    qSpellInvocationAvailable' = spellInvocationAvailable,
    qTargetEffectActive' = targetEffectActive,
    qEffectDamageType' = effectDamageType,
    qEffectOriginalSlotLevel' = effectOriginalSlotLevel,
    qEffectSpellSaveDc' = effectSpellSaveDc,
    qSaveOutcome' = saveOutcome,
    qDamageRollTotal' = damageRollTotal,
    qCasterHp' = casterHp,
    qCasterConcentrating' = casterConcentrating,
    qHoles' = holes,
    qLastResult' = lastResult,
  }

  action init = all {
    recordDragonsBreathState(
      casterTurnRole,
      true,
      true,
      false,
      noDamageType,
      0,
      0,
      noSaveOutcome,
      0,
      casterFullHp,
      false,
      noHoles,
      "init",
    ),
  }

  action doCastDragonsBreath = {
    nondet damageType = legalDamageTypes.oneOf()
    nondet slotLevel = 2.to(3).oneOf()
    all {
      qTurnRole == casterTurnRole,
      qSpellInvocationAvailable,
      not(qTargetEffectActive),
      qHoles == noHoles,
      recordDragonsBreathState(
        casterTurnRole,
        true,
        false,
        true,
        damageType,
        slotLevel,
        casterSpellSaveDc,
        noSaveOutcome,
        0,
        qCasterHp,
        true,
        noHoles,
        "cast",
      ),
    }
  }

  action doEndCasterTurn = all {
    qTurnRole == casterTurnRole,
    qTargetEffectActive,
    qCasterConcentrating,
    qHoles == noHoles,
    recordDragonsBreathState(
      targetTurnRole,
      true,
      false,
      true,
      qEffectDamageType,
      qEffectOriginalSlotLevel,
      qEffectSpellSaveDc,
      noSaveOutcome,
      0,
      qCasterHp,
      true,
      noHoles,
      "targetTurn",
    ),
  }

  action doRequestSavingThrow = all {
    qTurnRole == targetTurnRole,
    qMagicActionAvailable,
    qTargetEffectActive,
    qHoles == noHoles,
    recordDragonsBreathState(
      targetTurnRole,
      true,
      false,
      true,
      qEffectDamageType,
      qEffectOriginalSlotLevel,
      qEffectSpellSaveDc,
      noSaveOutcome,
      0,
      qCasterHp,
      true,
      savingThrowOutcomeHoles,
      "needsSave",
    ),
  }

  action doResolveSavingThrow = {
    nondet saveSucceeded = Set(true, false).oneOf()
    val saveOutcome = if (saveSucceeded) "success" else "failure"
    all {
      qTurnRole == targetTurnRole,
      qMagicActionAvailable,
      qTargetEffectActive,
      qHoles == savingThrowOutcomeHoles,
      recordDragonsBreathState(
        targetTurnRole,
        true,
        false,
        true,
        qEffectDamageType,
        qEffectOriginalSlotLevel,
        qEffectSpellSaveDc,
        saveOutcome,
        0,
        qCasterHp,
        true,
        damageRollHoles,
        "needsDamage",
      ),
    }
  }

  action doResolveDamageRoll = all {
    qTurnRole == targetTurnRole,
    qMagicActionAvailable,
    qTargetEffectActive,
    qHoles == damageRollHoles,
    recordDragonsBreathState(
      targetTurnRole,
      true,
      false,
      true,
      qEffectDamageType,
      qEffectOriginalSlotLevel,
      qEffectSpellSaveDc,
      qSaveOutcome,
      dragonsBreathDamageRollTotal(qEffectOriginalSlotLevel),
      qCasterHp,
      true,
      concentrationSavingThrowHoles,
      "needsConcentration",
    ),
  }

  action doResolveConcentration = {
    nondet concentrationSucceeded = Set(true, false).oneOf()
    val damageTaken = dragonsBreathDamageAfterSave(qDamageRollTotal, qSaveOutcome)
    all {
      qTurnRole == targetTurnRole,
      qMagicActionAvailable,
      qTargetEffectActive,
      qHoles == concentrationSavingThrowHoles,
      recordDragonsBreathState(
        targetTurnRole,
        false,
        false,
        concentrationSucceeded,
        if (concentrationSucceeded) qEffectDamageType else noDamageType,
        if (concentrationSucceeded) qEffectOriginalSlotLevel else 0,
        if (concentrationSucceeded) qEffectSpellSaveDc else 0,
        qSaveOutcome,
        qDamageRollTotal,
        qCasterHp - damageTaken,
        concentrationSucceeded,
        noHoles,
        "exhaled",
      ),
    }
  }

  action doBreakConcentration = all {
    qTargetEffectActive,
    qCasterConcentrating,
    qHoles == noHoles,
    recordDragonsBreathState(
      qTurnRole,
      qMagicActionAvailable,
      false,
      false,
      noDamageType,
      0,
      0,
      noSaveOutcome,
      qDamageRollTotal,
      qCasterHp,
      false,
      noHoles,
      "concentrationBroken",
    ),
  }

  action step = any {
    doCastDragonsBreath,
    doEndCasterTurn,
    doRequestSavingThrow,
    doResolveSavingThrow,
    doResolveDamageRoll,
    doResolveConcentration,
    doBreakConcentration,
  }
}
