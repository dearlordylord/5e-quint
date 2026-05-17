// -*- mode: Bluespec; -*-

module battleRuntimeLevel1BuffMarkSmiteSelectedIdentityMbt {
  var qDivineFavorActiveRiderCount: int
  var qTargetHp: int
  var qLongstriderTargetSpeedFeet: int
  var qLongstriderSpeedEffectSourceSpellId: str
  var qLongstriderSpeedEffectTarget: str
  var qLongstriderSpeedDeltaFeet: int
  var qCasterTempHp: int
  var qCasterFrightened: bool
  var qSpellSlotSpentThisTurn: bool
  var qLevel1SlotsRemaining: int
  var qDamageRiderSourceSpellId: str
  var qDamageRiderDamageType: str
  var qDamageRiderDice: int
  var qDamageRiderDieSize: int
  var qTemporaryHitPointsSourceSpellId: str
  var qTemporaryHitPointsDice: int
  var qTemporaryHitPointsDieSize: int
  var qTemporaryHitPointsFlat: int
  var qFrightenedImmunitySourceSpellId: str
  var qFrightenedImmunityCondition: str
  var qTurnStartTemporaryHitPointsSourceSpellId: str
  var qTurnStartTemporaryHitPointsAmount: int
  var qEnsnaringStrikeRestrainedBeforeEscape: bool
  var qTargetRestrained: bool
  var qCasterConcentrating: bool
  var qEnsnaringStrikeSaveSourceSpellId: str
  var qEnsnaringStrikeSaveAbility: str
  var qTurnStartDamageSourceSpellId: str
  var qTurnStartDamageDamageType: str
  var qTurnStartDamageDice: int
  var qTurnStartDamageDieSize: int
  var qEscapeCheckAbility: str
  var qEscapeCheckSkill: str
  var qHuntersMarkDamageHoleSourceSpellId: str
  var qHuntersMarkDamageHoleDamageType: str
  var qHuntersMarkDamageHoleDice: int
  var qHuntersMarkDamageHoleDieSize: int
  var qHuntersMarkActiveMarkSourceSpellId: str
  var qHuntersMarkActiveMarkTarget: str
  var qHuntersMarkConcentrationSourceSpellId: str
  var qHuntersMarkTransferKindOnDropTurn: str
  var qHuntersMarkActiveMarkTransferKind: str
  var qHuntersMarkActiveMarkRetargetTiming: str
  var qHuntersMarkTransferVisibleOnDropTurn: bool
  var qHexDamageHoleSourceSpellId: str
  var qHexDamageHoleDamageType: str
  var qHexDamageHoleDice: int
  var qHexDamageHoleDieSize: int
  var qHexActiveMarkSourceSpellId: str
  var qHexActiveMarkTarget: str
  var qHexAbilityCheckAbility: str
  var qHexTransferKindOnDropTurn: str
  var qHexActiveMarkTransferKind: str
  var qHexActiveMarkRetargetTiming: str
  var qHexTransferVisibleOnDropTurn: bool
  var qLastResult: str

  action recordProjection(
    divineFavorActiveRiderCount: int,
    targetHp: int,
    longstriderTargetSpeedFeet: int,
    longstriderSpeedEffectSourceSpellId: str,
    longstriderSpeedEffectTarget: str,
    longstriderSpeedDeltaFeet: int,
    casterTempHp: int,
    casterFrightened: bool,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    damageRiderSourceSpellId: str,
    damageRiderDamageType: str,
    damageRiderDice: int,
    damageRiderDieSize: int,
    temporaryHitPointsSourceSpellId: str,
    temporaryHitPointsDice: int,
    temporaryHitPointsDieSize: int,
    temporaryHitPointsFlat: int,
    frightenedImmunitySourceSpellId: str,
    frightenedImmunityCondition: str,
    turnStartTemporaryHitPointsSourceSpellId: str,
    turnStartTemporaryHitPointsAmount: int,
    ensnaringStrikeRestrainedBeforeEscape: bool,
    targetRestrained: bool,
    casterConcentrating: bool,
    ensnaringStrikeSaveSourceSpellId: str,
    ensnaringStrikeSaveAbility: str,
    turnStartDamageSourceSpellId: str,
    turnStartDamageDamageType: str,
    turnStartDamageDice: int,
    turnStartDamageDieSize: int,
    escapeCheckAbility: str,
    escapeCheckSkill: str,
    huntersMarkDamageHoleSourceSpellId: str,
    huntersMarkDamageHoleDamageType: str,
    huntersMarkDamageHoleDice: int,
    huntersMarkDamageHoleDieSize: int,
    huntersMarkActiveMarkSourceSpellId: str,
    huntersMarkActiveMarkTarget: str,
    huntersMarkConcentrationSourceSpellId: str,
    huntersMarkTransferKindOnDropTurn: str,
    huntersMarkActiveMarkTransferKind: str,
    huntersMarkActiveMarkRetargetTiming: str,
    huntersMarkTransferVisibleOnDropTurn: bool,
    hexDamageHoleSourceSpellId: str,
    hexDamageHoleDamageType: str,
    hexDamageHoleDice: int,
    hexDamageHoleDieSize: int,
    hexActiveMarkSourceSpellId: str,
    hexActiveMarkTarget: str,
    hexAbilityCheckAbility: str,
    hexTransferKindOnDropTurn: str,
    hexActiveMarkTransferKind: str,
    hexActiveMarkRetargetTiming: str,
    hexTransferVisibleOnDropTurn: bool,
    lastResult: str,
  ): bool = all {
    qDivineFavorActiveRiderCount' = divineFavorActiveRiderCount,
    qTargetHp' = targetHp,
    qLongstriderTargetSpeedFeet' = longstriderTargetSpeedFeet,
    qLongstriderSpeedEffectSourceSpellId' = longstriderSpeedEffectSourceSpellId,
    qLongstriderSpeedEffectTarget' = longstriderSpeedEffectTarget,
    qLongstriderSpeedDeltaFeet' = longstriderSpeedDeltaFeet,
    qCasterTempHp' = casterTempHp,
    qCasterFrightened' = casterFrightened,
    qSpellSlotSpentThisTurn' = spellSlotSpentThisTurn,
    qLevel1SlotsRemaining' = level1SlotsRemaining,
    qDamageRiderSourceSpellId' = damageRiderSourceSpellId,
    qDamageRiderDamageType' = damageRiderDamageType,
    qDamageRiderDice' = damageRiderDice,
    qDamageRiderDieSize' = damageRiderDieSize,
    qTemporaryHitPointsSourceSpellId' = temporaryHitPointsSourceSpellId,
    qTemporaryHitPointsDice' = temporaryHitPointsDice,
    qTemporaryHitPointsDieSize' = temporaryHitPointsDieSize,
    qTemporaryHitPointsFlat' = temporaryHitPointsFlat,
    qFrightenedImmunitySourceSpellId' = frightenedImmunitySourceSpellId,
    qFrightenedImmunityCondition' = frightenedImmunityCondition,
    qTurnStartTemporaryHitPointsSourceSpellId' = turnStartTemporaryHitPointsSourceSpellId,
    qTurnStartTemporaryHitPointsAmount' = turnStartTemporaryHitPointsAmount,
    qEnsnaringStrikeRestrainedBeforeEscape' = ensnaringStrikeRestrainedBeforeEscape,
    qTargetRestrained' = targetRestrained,
    qCasterConcentrating' = casterConcentrating,
    qEnsnaringStrikeSaveSourceSpellId' = ensnaringStrikeSaveSourceSpellId,
    qEnsnaringStrikeSaveAbility' = ensnaringStrikeSaveAbility,
    qTurnStartDamageSourceSpellId' = turnStartDamageSourceSpellId,
    qTurnStartDamageDamageType' = turnStartDamageDamageType,
    qTurnStartDamageDice' = turnStartDamageDice,
    qTurnStartDamageDieSize' = turnStartDamageDieSize,
    qEscapeCheckAbility' = escapeCheckAbility,
    qEscapeCheckSkill' = escapeCheckSkill,
    qHuntersMarkDamageHoleSourceSpellId' = huntersMarkDamageHoleSourceSpellId,
    qHuntersMarkDamageHoleDamageType' = huntersMarkDamageHoleDamageType,
    qHuntersMarkDamageHoleDice' = huntersMarkDamageHoleDice,
    qHuntersMarkDamageHoleDieSize' = huntersMarkDamageHoleDieSize,
    qHuntersMarkActiveMarkSourceSpellId' = huntersMarkActiveMarkSourceSpellId,
    qHuntersMarkActiveMarkTarget' = huntersMarkActiveMarkTarget,
    qHuntersMarkConcentrationSourceSpellId' = huntersMarkConcentrationSourceSpellId,
    qHuntersMarkTransferKindOnDropTurn' = huntersMarkTransferKindOnDropTurn,
    qHuntersMarkActiveMarkTransferKind' = huntersMarkActiveMarkTransferKind,
    qHuntersMarkActiveMarkRetargetTiming' = huntersMarkActiveMarkRetargetTiming,
    qHuntersMarkTransferVisibleOnDropTurn' = huntersMarkTransferVisibleOnDropTurn,
    qHexDamageHoleSourceSpellId' = hexDamageHoleSourceSpellId,
    qHexDamageHoleDamageType' = hexDamageHoleDamageType,
    qHexDamageHoleDice' = hexDamageHoleDice,
    qHexDamageHoleDieSize' = hexDamageHoleDieSize,
    qHexActiveMarkSourceSpellId' = hexActiveMarkSourceSpellId,
    qHexActiveMarkTarget' = hexActiveMarkTarget,
    qHexAbilityCheckAbility' = hexAbilityCheckAbility,
    qHexTransferKindOnDropTurn' = hexTransferKindOnDropTurn,
    qHexActiveMarkTransferKind' = hexActiveMarkTransferKind,
    qHexActiveMarkRetargetTiming' = hexActiveMarkRetargetTiming,
    qHexTransferVisibleOnDropTurn' = hexTransferVisibleOnDropTurn,
    qLastResult' = lastResult,
  }

  action recordWithoutMarkedDamageProjection(
    divineFavorActiveRiderCount: int,
    targetHp: int,
    casterTempHp: int,
    casterFrightened: bool,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    damageRiderSourceSpellId: str,
    damageRiderDamageType: str,
    damageRiderDice: int,
    damageRiderDieSize: int,
    temporaryHitPointsSourceSpellId: str,
    temporaryHitPointsDice: int,
    temporaryHitPointsDieSize: int,
    temporaryHitPointsFlat: int,
    frightenedImmunitySourceSpellId: str,
    frightenedImmunityCondition: str,
    turnStartTemporaryHitPointsSourceSpellId: str,
    turnStartTemporaryHitPointsAmount: int,
    ensnaringStrikeRestrainedBeforeEscape: bool,
    targetRestrained: bool,
    casterConcentrating: bool,
    ensnaringStrikeSaveSourceSpellId: str,
    ensnaringStrikeSaveAbility: str,
    turnStartDamageSourceSpellId: str,
    turnStartDamageDamageType: str,
    turnStartDamageDice: int,
    turnStartDamageDieSize: int,
    escapeCheckAbility: str,
    escapeCheckSkill: str,
    lastResult: str,
  ): bool = recordProjection(
    divineFavorActiveRiderCount,
    targetHp,
    30,
    "none",
    "none",
    0,
    casterTempHp,
    casterFrightened,
    spellSlotSpentThisTurn,
    level1SlotsRemaining,
    damageRiderSourceSpellId,
    damageRiderDamageType,
    damageRiderDice,
    damageRiderDieSize,
    temporaryHitPointsSourceSpellId,
    temporaryHitPointsDice,
    temporaryHitPointsDieSize,
    temporaryHitPointsFlat,
    frightenedImmunitySourceSpellId,
    frightenedImmunityCondition,
    turnStartTemporaryHitPointsSourceSpellId,
    turnStartTemporaryHitPointsAmount,
    ensnaringStrikeRestrainedBeforeEscape,
    targetRestrained,
    casterConcentrating,
    ensnaringStrikeSaveSourceSpellId,
    ensnaringStrikeSaveAbility,
    turnStartDamageSourceSpellId,
    turnStartDamageDamageType,
    turnStartDamageDice,
    turnStartDamageDieSize,
    escapeCheckAbility,
    escapeCheckSkill,
    "none",
    "none",
    0,
    0,
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    false,
    "none",
    "none",
    0,
    0,
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    false,
    lastResult,
  )

  action recordLongstriderSpeedProjection(
    targetHp: int,
    longstriderTargetSpeedFeet: int,
    longstriderSpeedEffectSourceSpellId: str,
    longstriderSpeedEffectTarget: str,
    longstriderSpeedDeltaFeet: int,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    lastResult: str,
  ): bool = recordProjection(
    0,
    targetHp,
    longstriderTargetSpeedFeet,
    longstriderSpeedEffectSourceSpellId,
    longstriderSpeedEffectTarget,
    longstriderSpeedDeltaFeet,
    0,
    false,
    spellSlotSpentThisTurn,
    level1SlotsRemaining,
    "none",
    "none",
    0,
    0,
    "none",
    0,
    0,
    0,
    "none",
    "none",
    "none",
    0,
    false,
    false,
    false,
    "none",
    "none",
    "none",
    "none",
    0,
    0,
    "none",
    "none",
    "none",
    "none",
    0,
    0,
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    false,
    "none",
    "none",
    0,
    0,
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    false,
    lastResult,
  )

  action init = recordWithoutMarkedDamageProjection(
    0, 12, 0, false, false, 2, "none", "none", 0, 0,
    "none", 0, 0, 0,
    "none", "none", "none", 0,
    false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
    "init",
  )

  action doDivineFavorWeaponDamageRider = all {
    qLastResult == "init",
    recordWithoutMarkedDamageProjection(
      1, 5, 0, false, true, 1, "divine_favor", "radiant", 1, 4,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      "divineFavor",
    ),
  }

  action doDivineSmiteAfterHitDamage = all {
    qLastResult == "init",
    recordWithoutMarkedDamageProjection(
      0, 1, 0, false, true, 1, "divine_smite", "radiant", 2, 8,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      "divineSmite",
    ),
  }

  action doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape = all {
    qLastResult == "init",
    recordWithoutMarkedDamageProjection(
      0, 5, 0, false, false, 1, "none", "none", 0, 0,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      true, false, false,
      "ensnaring_strike", "str",
      "ensnaring_strike", "piercing", 1, 6,
      "str", "athletics",
      "ensnaringStrike",
    ),
  }

  action doFalseLifeTemporaryHitPoints = all {
    qLastResult == "init",
    recordWithoutMarkedDamageProjection(
      0, 12, 11, false, true, 1, "none", "none", 0, 0,
      "false_life", 2, 4, 4,
      "none", "none", "none", 0,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      "falseLife",
    ),
  }

  action doHeroismFrightenedImmunityTurnStartTemporaryHitPoints = all {
    qLastResult == "init",
    recordWithoutMarkedDamageProjection(
      0, 12, 3, false, false, 1, "none", "none", 0, 0,
      "none", 0, 0, 0,
      "heroism", "frightened", "heroism", 3,
      false, false, true, "none", "none", "none", "none", 0, 0, "none", "none",
      "heroism",
    ),
  }

  action doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer = all {
    qLastResult == "init",
    recordProjection(
      0, 0, 30, "none", "none", 0, 0, false, false, 1, "none", "none", 0, 0,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      false, false, true, "none", "none", "none", "none", 0, 0, "none", "none",
      "hunters_mark", "force", 1, 6,
      "hunters_mark", "transferTarget", "hunters_mark",
      "available", "awaitingTargetDrop", "sameTurn", true,
      "none", "none", 0, 0,
      "none", "none", "none",
      "none", "none", "none", false,
      "huntersMark",
    ),
  }

  action doHexMarkedDamageRiderAndLaterTurnTransfer = all {
    qLastResult == "init",
    recordProjection(
      0, 0, 30, "none", "none", 0, 0, false, false, 1, "none", "none", 0, 0,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      false, false, true, "none", "none", "none", "none", 0, 0, "none", "none",
      "none", "none", 0, 0,
      "none", "none", "none",
      "none", "none", "none", false,
      "hex", "necrotic", 1, 6,
      "hex", "transferTarget", "wis",
      "availableAfterTurn", "awaitingTargetDrop", "laterTurn", false,
      "hex",
    ),
  }

  action doLongstriderSpeedIncrease = all {
    qLastResult == "init",
    recordLongstriderSpeedProjection(
      12,
      40,
      "longstrider",
      "target",
      10,
      true,
      1,
      "longstrider",
    ),
  }

  action step = any {
    doDivineFavorWeaponDamageRider,
    doDivineSmiteAfterHitDamage,
    doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape,
    doFalseLifeTemporaryHitPoints,
    doHeroismFrightenedImmunityTurnStartTemporaryHitPoints,
    doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer,
    doHexMarkedDamageRiderAndLaterTurnTransfer,
    doLongstriderSpeedIncrease,
  }
}
