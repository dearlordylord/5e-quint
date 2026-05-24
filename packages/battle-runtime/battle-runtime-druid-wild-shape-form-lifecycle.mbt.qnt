// -*- mode: Bluespec; -*-

module battleRuntimeDruidWildShapeFormLifecycleMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Classes/Druid.md#Level 2: Wild Shape:
  //   Bonus Action known Beast form assumption, use spending, Temporary Hit
  //   Points equal to Druid level, Beast stat-block projection, no
  //   spellcasting, reuse replacement, Bonus Action dismissal, and ending on
  //   Incapacitated or death.
  // - .references/srd-5.2.1/Rules-Glossary.md#Shape-Shifting:
  //   shape-shifting effects specify their own form rules and revert on death.
  // - UBIQUITOUS_LANGUAGE.md: Temporary Hit Points, Creature, Stat Block,
  //   Character Sheet, and Action Lifecycle.
  var qActiveForm: str
  var qBonusActionAvailable: bool
  var qUsesRemaining: int
  var qTempHp: int
  var qArmorClass: int
  var qCreatureSize: str
  var qSpeedFeet: int
  var qShoveDc: int
  var qSpellAvailable: bool
  var qActiveFormEffectCount: int
  var qDruidStatus: str
  var qLastResult: str

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
  pure val baseFormArmorClass: int = 10
  pure val baseFormSpeedFeet: int = 30
  pure val baseFormShoveDc: int = 13
  pure val ridingHorseArmorClass: int = 11
  pure val ridingHorseSpeedFeet: int = 60
  pure val ridingHorseShoveDc: int = 13
  pure val catArmorClass: int = 12
  pure val catSpeedFeet: int = 40
  pure val catShoveDc: int = 6

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
    druidStatus: str,
    lastResult: str,
  ): bool = all {
    qActiveForm' = activeForm,
    qBonusActionAvailable' = bonusActionAvailable,
    qUsesRemaining' = usesRemaining,
    qTempHp' = tempHp,
    qArmorClass' = armorClass,
    qCreatureSize' = creatureSize,
    qSpeedFeet' = speedFeet,
    qShoveDc' = shoveDc,
    qSpellAvailable' = spellAvailable,
    qActiveFormEffectCount' = activeFormEffectCount,
    qDruidStatus' = druidStatus,
    qLastResult' = lastResult,
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
    ableDruidStatus,
    "init",
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
      ableDruidStatus,
      "assumedRidingHorse",
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
      qDruidStatus,
      "nextTurn",
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
      ableDruidStatus,
      "reusedCat",
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
      ableDruidStatus,
      "dismissed",
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
      incapacitatedDruidStatus,
      "incapacitated",
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
      deadDruidStatus,
      "dead",
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
