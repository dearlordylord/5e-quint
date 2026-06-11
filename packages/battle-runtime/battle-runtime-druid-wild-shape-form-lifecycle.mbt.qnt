// -*- mode: Bluespec; -*-

module battleRuntimeDruidWildShapeFormLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type DruidWildShapeFormLifecycleScenarioOutcome = | Init | AssumedRidingHorse | NextTurn | ReusedCat | Dismissed | FormIncapacitated | FormDead


  type DruidWildShapeFormLifecycleWitnessState = {
    qActiveForm: str,
    qBonusActionAvailable: bool,
    qUsesRemaining: int,
    qTempHp: int,
    qArmorClass: int,
    qCreatureSize: str,
    qSpeedFeet: int,
    qShoveDc: int,
    qSpellAvailable: bool,
    qActiveFormEffectCount: int,
    qMergedEquipmentCount: int,
    qDruidStatus: str,
    qScenarioOutcome: DruidWildShapeFormLifecycleScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: DruidWildShapeFormLifecycleWitnessState

  pure def qActiveForm: str = qState.qActiveForm
  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qUsesRemaining: int = qState.qUsesRemaining
  pure def qTempHp: int = qState.qTempHp
  pure def qArmorClass: int = qState.qArmorClass
  pure def qCreatureSize: str = qState.qCreatureSize
  pure def qSpeedFeet: int = qState.qSpeedFeet
  pure def qShoveDc: int = qState.qShoveDc
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qActiveFormEffectCount: int = qState.qActiveFormEffectCount
  pure def qMergedEquipmentCount: int = qState.qMergedEquipmentCount
  pure def qDruidStatus: str = qState.qDruidStatus
  pure def qLastResult: DruidWildShapeFormLifecycleScenarioOutcome = qState.qScenarioOutcome

  pure def druidWildShapeFormLifecycleProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: DruidWildShapeFormLifecycleScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  // RAW trace:
  // - .references/srd-5.2.1/Classes/Druid.md#Level 2: Wild Shape:
  //   Bonus Action known Beast form assumption, use spending, Temporary Hit
  //   Points equal to Druid level, Beast stat-block projection, no
  //   spellcasting, reuse replacement, Bonus Action dismissal, and ending on
  //   Incapacitated or death. The Objects bullet says merged equipment has no
  //   effect while in that form.
  // - .references/srd-5.2.1/Rules-Glossary.md#Shape-Shifting:
  //   shape-shifting effects specify their own form rules and revert on death.
  // - UBIQUITOUS_LANGUAGE.md: Temporary Hit Points, Creature, Stat Block,
  //   Character Sheet, and Action Lifecycle.

  pure val ableDruidStatus: str = "able"
  pure val incapacitatedDruidStatus: str = "incapacitated"
  pure val deadDruidStatus: str = "dead"
  pure val trueForm: str = "trueForm"
  pure val ridingHorseForm: str = "ridingHorse"
  pure val catForm: str = "cat"
  pure val tinySize: str = "tiny"
  pure val mediumSize: str = "medium"
  pure val largeSize: str = "large"
  pure val initialUsesRemaining: int = 2
  pure val druidLevel: int = 2
  pure val baseFormArmorClass: int = 16
  pure val baseFormSpeedFeet: int = 30
  pure val baseFormShoveDc: int = 13
  pure val ridingHorseArmorClass: int = 11
  pure val ridingHorseSpeedFeet: int = 60
  pure val ridingHorseShoveDc: int = 13
  pure val catArmorClass: int = 12
  pure val catSpeedFeet: int = 40
  pure val catShoveDc: int = 6
  pure val selectedLoadoutMergedEquipmentCount: int = 2

  action recordWildShapeState(
    activeForm: str,
    bonusActionAvailable: bool,
    usesRemaining: int,
    tempHp: int,
    armorClass: int,
    creatureSize: str,
    speedFeet: int,
    shoveDc: int,
    spellAvailable: bool,
    activeFormEffectCount: int,
    mergedEquipmentCount: int,
    druidStatus: str,
    lastResult: DruidWildShapeFormLifecycleScenarioOutcome,
  ): bool = all {
    qState' = {
      qActiveForm: activeForm,
      qBonusActionAvailable: bonusActionAvailable,
      qUsesRemaining: usesRemaining,
      qTempHp: tempHp,
      qArmorClass: armorClass,
      qCreatureSize: creatureSize,
      qSpeedFeet: speedFeet,
      qShoveDc: shoveDc,
      qSpellAvailable: spellAvailable,
      qActiveFormEffectCount: activeFormEffectCount,
      qMergedEquipmentCount: mergedEquipmentCount,
      qDruidStatus: druidStatus,
      qScenarioOutcome: lastResult,
      protocol: druidWildShapeFormLifecycleProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordWildShapeState(
    trueForm,
    true,
    initialUsesRemaining,
    0,
    baseFormArmorClass,
    mediumSize,
    baseFormSpeedFeet,
    baseFormShoveDc,
    true,
    0,
    0,
    ableDruidStatus,
    Init,
  )

  action doAssumeRidingHorse = all {
    qDruidStatus == ableDruidStatus,
    qBonusActionAvailable,
    qUsesRemaining > 0,
    recordWildShapeState(
      ridingHorseForm,
      false,
      qUsesRemaining - 1,
      if (qTempHp > druidLevel) qTempHp else druidLevel,
      ridingHorseArmorClass,
      largeSize,
      ridingHorseSpeedFeet,
      ridingHorseShoveDc,
      false,
      1,
      selectedLoadoutMergedEquipmentCount,
      ableDruidStatus,
      AssumedRidingHorse,
    ),
  }

  action doBeginNextTurn = all {
    qDruidStatus == ableDruidStatus,
    not(qBonusActionAvailable),
    recordWildShapeState(
      qActiveForm,
      true,
      qUsesRemaining,
      qTempHp,
      qArmorClass,
      qCreatureSize,
      qSpeedFeet,
      qShoveDc,
      qSpellAvailable,
      qActiveFormEffectCount,
      qMergedEquipmentCount,
      qDruidStatus,
      NextTurn,
    ),
  }

  action doReuseAsCat = all {
    qDruidStatus == ableDruidStatus,
    qActiveForm == ridingHorseForm,
    qBonusActionAvailable,
    qUsesRemaining > 0,
    recordWildShapeState(
      catForm,
      false,
      qUsesRemaining - 1,
      if (qTempHp > druidLevel) qTempHp else druidLevel,
      catArmorClass,
      tinySize,
      catSpeedFeet,
      catShoveDc,
      false,
      1,
      selectedLoadoutMergedEquipmentCount,
      ableDruidStatus,
      ReusedCat,
    ),
  }

  action doDismissForm = all {
    qDruidStatus == ableDruidStatus,
    qActiveForm != trueForm,
    qBonusActionAvailable,
    recordWildShapeState(
      trueForm,
      false,
      qUsesRemaining,
      qTempHp,
      baseFormArmorClass,
      mediumSize,
      baseFormSpeedFeet,
      baseFormShoveDc,
      true,
      0,
      0,
      ableDruidStatus,
      Dismissed,
    ),
  }

  action doIncapacitatedReversion = all {
    qDruidStatus == ableDruidStatus,
    qActiveForm != trueForm,
    recordWildShapeState(
      trueForm,
      qBonusActionAvailable,
      qUsesRemaining,
      qTempHp,
      baseFormArmorClass,
      mediumSize,
      baseFormSpeedFeet,
      baseFormShoveDc,
      false,
      0,
      0,
      incapacitatedDruidStatus,
      FormIncapacitated,
    ),
  }

  action doDeathReversion = all {
    qDruidStatus == ableDruidStatus,
    qActiveForm != trueForm,
    recordWildShapeState(
      trueForm,
      qBonusActionAvailable,
      qUsesRemaining,
      qTempHp,
      baseFormArmorClass,
      mediumSize,
      baseFormSpeedFeet,
      baseFormShoveDc,
      false,
      0,
      0,
      deadDruidStatus,
      FormDead,
    ),
  }

  action doStutter = all {
    qDruidStatus != ableDruidStatus or (qActiveForm == trueForm and qUsesRemaining == 0),
    recordWildShapeState(
      qActiveForm,
      qBonusActionAvailable,
      qUsesRemaining,
      qTempHp,
      qArmorClass,
      qCreatureSize,
      qSpeedFeet,
      qShoveDc,
      qSpellAvailable,
      qActiveFormEffectCount,
      qMergedEquipmentCount,
      qDruidStatus,
      qLastResult,
    ),
  }

  action step = any {
    doAssumeRidingHorse,
    doBeginNextTurn,
    doReuseAsCat,
    doDismissForm,
    doIncapacitatedReversion,
    doDeathReversion,
    doStutter,
  }
}
