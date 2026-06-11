// -*- mode: Bluespec; -*-

module battleRuntimeDragonsBreathGrantedActionMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole =
    | SavingThrowOutcome
    | DamageRoll
    | ConcentrationSavingThrow
  type DragonsBreathGrantedActionScenarioOutcome = | Init | Cast | TargetTurn | NeedsSave | NeedsDamage | NeedsConcentration | Exhaled | ConcentrationBroken



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
  type WitnessState = {
    qTurnRole: str,
    qMagicActionAvailable: bool,
    qSpellInvocationAvailable: bool,
    qTargetEffectActive: bool,
    qEffectDamageType: str,
    qEffectOriginalSlotLevel: int,
    qEffectSpellSaveDc: int,
    qSaveOutcome: str,
    qDamageRollTotal: int,
    qCasterHp: int,
    qCasterConcentrating: bool,
    qScenarioOutcome: DragonsBreathGrantedActionScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qTurnRole: str = qState.qTurnRole
  pure def qMagicActionAvailable: bool = qState.qMagicActionAvailable
  pure def qSpellInvocationAvailable: bool = qState.qSpellInvocationAvailable
  pure def qTargetEffectActive: bool = qState.qTargetEffectActive
  pure def qEffectDamageType: str = qState.qEffectDamageType
  pure def qEffectOriginalSlotLevel: int = qState.qEffectOriginalSlotLevel
  pure def qEffectSpellSaveDc: int = qState.qEffectSpellSaveDc
  pure def qSaveOutcome: str = qState.qSaveOutcome
  pure def qDamageRollTotal: int = qState.qDamageRollTotal
  pure def qCasterHp: int = qState.qCasterHp
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def protocolHoles: Set[WitnessHole] = qState.protocol.holes
  pure def qScenarioOutcome: DragonsBreathGrantedActionScenarioOutcome = qState.qScenarioOutcome

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val noDamageType: str = "none"
  pure val noSaveOutcome: str = "none"
  pure val noHoles: Set[WitnessHole] = Set()
  pure val savingThrowOutcomeHoles: Set[WitnessHole] = Set(SavingThrowOutcome)
  pure val damageRollHoles: Set[WitnessHole] = Set(DamageRoll)
  pure val concentrationSavingThrowHoles: Set[WitnessHole] = Set(ConcentrationSavingThrow)
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
    scenarioOutcome: DragonsBreathGrantedActionScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qTurnRole: turnRole,
      qMagicActionAvailable: magicActionAvailable,
      qSpellInvocationAvailable: spellInvocationAvailable,
      qTargetEffectActive: targetEffectActive,
      qEffectDamageType: effectDamageType,
      qEffectOriginalSlotLevel: effectOriginalSlotLevel,
      qEffectSpellSaveDc: effectSpellSaveDc,
      qSaveOutcome: saveOutcome,
      qDamageRollTotal: damageRollTotal,
      qCasterHp: casterHp,
      qCasterConcentrating: casterConcentrating,
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
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
      Init,
    witnessInit(SavingThrowOutcome),
  ),
  }

  action doCastDragonsBreath = {
    nondet damageType = legalDamageTypes.oneOf()
    nondet slotLevel = 2.to(3).oneOf()
    all {
      qTurnRole == casterTurnRole,
      qSpellInvocationAvailable,
      not(qTargetEffectActive),
      protocolHoles == noHoles,
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
        Cast,
    witnessResolved(SavingThrowOutcome),
  ),
    }
  }

  action doEndCasterTurn = all {
    qTurnRole == casterTurnRole,
    qTargetEffectActive,
    qCasterConcentrating,
    protocolHoles == noHoles,
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
      TargetTurn,
    witnessResolved(SavingThrowOutcome),
  ),
  }

  action doRequestSavingThrow = all {
    qTurnRole == targetTurnRole,
    qMagicActionAvailable,
    qTargetEffectActive,
    protocolHoles == noHoles,
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
      NeedsSave,
    witnessNeedsHoles(savingThrowOutcomeHoles),
  ),
  }

  action doResolveSavingThrow = {
    nondet saveSucceeded = Set(true, false).oneOf()
    val saveOutcome = if (saveSucceeded) "success" else "failure"
    all {
      qTurnRole == targetTurnRole,
      qMagicActionAvailable,
      qTargetEffectActive,
      protocolHoles == savingThrowOutcomeHoles,
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
        NeedsDamage,
    witnessNeedsHoles(damageRollHoles),
  ),
    }
  }

  action doResolveDamageRoll = all {
    qTurnRole == targetTurnRole,
    qMagicActionAvailable,
    qTargetEffectActive,
    protocolHoles == damageRollHoles,
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
      NeedsConcentration,
    witnessNeedsHoles(concentrationSavingThrowHoles),
  ),
  }

  action doResolveConcentration = {
    nondet concentrationSucceeded = Set(true, false).oneOf()
    val damageTaken = dragonsBreathDamageAfterSave(qDamageRollTotal, qSaveOutcome)
    all {
      qTurnRole == targetTurnRole,
      qMagicActionAvailable,
      qTargetEffectActive,
      protocolHoles == concentrationSavingThrowHoles,
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
        Exhaled,
    witnessResolved(SavingThrowOutcome),
  ),
    }
  }

  action doBreakConcentration = all {
    qTargetEffectActive,
    qCasterConcentrating,
    protocolHoles == noHoles,
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
      ConcentrationBroken,
    witnessResolved(SavingThrowOutcome),
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
