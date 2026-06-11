// -*- mode: Bluespec; -*-

module battleRuntimeLevel1BuffMarkSmiteSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level1BuffMarkSmiteSelectedIdentityScenarioOutcome = | Init | DivineFavor | DivineSmite | EnsnaringStrike | FalseLife | Heroism | HuntersMark | Hex | Longstrider | SearingSmite | Shillelagh | TrueStrike

  type Level1BuffMarkSmiteSelectedIdentityWitnessState = {
    qDivineFavorActiveRiderCount: int,
    qTargetHp: int,
    qLongstriderTargetSpeedFeet: int,
    qLongstriderSpeedEffectSourceSpellId: str,
    qLongstriderSpeedEffectTarget: str,
    qLongstriderSpeedDeltaFeet: int,
    qCasterTempHp: int,
    qCasterFrightened: bool,
    qSpellSlotSpentThisTurn: bool,
    qLevel1SlotsRemaining: int,
    qDamageRiderSourceSpellId: str,
    qDamageRiderDamageType: str,
    qDamageRiderDice: int,
    qDamageRiderDieSize: int,
    qTemporaryHitPointsSourceSpellId: str,
    qTemporaryHitPointsDice: int,
    qTemporaryHitPointsDieSize: int,
    qTemporaryHitPointsFlat: int,
    qFrightenedImmunitySourceSpellId: str,
    qFrightenedImmunityCondition: str,
    qTurnStartTemporaryHitPointsSourceSpellId: str,
    qTurnStartTemporaryHitPointsAmount: int,
    qEnsnaringStrikeRestrainedBeforeEscape: bool,
    qTargetRestrained: bool,
    qCasterConcentrating: bool,
    qEnsnaringStrikeSaveSourceSpellId: str,
    qEnsnaringStrikeSaveAbility: str,
    qTurnStartDamageSourceSpellId: str,
    qTurnStartDamageDamageType: str,
    qTurnStartDamageDice: int,
    qTurnStartDamageDieSize: int,
    qEscapeCheckAbility: str,
    qEscapeCheckSkill: str,
    qHuntersMarkDamageHoleSourceSpellId: str,
    qHuntersMarkDamageHoleDamageType: str,
    qHuntersMarkDamageHoleDice: int,
    qHuntersMarkDamageHoleDieSize: int,
    qHuntersMarkActiveMarkSourceSpellId: str,
    qHuntersMarkActiveMarkTarget: str,
    qHuntersMarkConcentrationSourceSpellId: str,
    qHuntersMarkTransferKindOnDropTurn: str,
    qHuntersMarkActiveMarkTransferKind: str,
    qHuntersMarkActiveMarkRetargetTiming: str,
    qHuntersMarkTransferVisibleOnDropTurn: bool,
    qHexDamageHoleSourceSpellId: str,
    qHexDamageHoleDamageType: str,
    qHexDamageHoleDice: int,
    qHexDamageHoleDieSize: int,
    qHexActiveMarkSourceSpellId: str,
    qHexActiveMarkTarget: str,
    qHexAbilityCheckAbility: str,
    qHexTransferKindOnDropTurn: str,
    qHexActiveMarkTransferKind: str,
    qHexActiveMarkRetargetTiming: str,
    qHexTransferVisibleOnDropTurn: bool,
    qSearingSmiteImmediateDamageSourceSpellId: str,
    qSearingSmiteImmediateDamageDamageType: str,
    qSearingSmiteImmediateDamageDice: int,
    qSearingSmiteImmediateDamageDieSize: int,
    qSearingSmiteActiveBeforeSuccessfulSave: bool,
    qSearingSmiteTurnStartDamageSourceSpellId: str,
    qSearingSmiteTurnStartDamageDamageType: str,
    qSearingSmiteTurnStartDamageDice: int,
    qSearingSmiteTurnStartDamageDieSize: int,
    qSearingSmiteTurnStartSaveSourceSpellId: str,
    qSearingSmiteTurnStartSaveAbility: str,
    qSearingSmiteTurnStartSaveSuccessEnds: str,
    qSearingSmiteActiveAfterSuccessfulSave: bool,
    qShillelaghOverrideSourceSpellId: str,
    qShillelaghOverrideWeaponUnitId: str,
    qShillelaghSpellcastingAbilityModifier: int,
    qShillelaghOverrideAttackBonus: int,
    qShillelaghOverrideDamageDice: int,
    qShillelaghOverrideDamageDieSize: int,
    qShillelaghForceAttackName: str,
    qShillelaghForceAttackBonus: int,
    qShillelaghForceDamageType: str,
    qShillelaghForceDamageDice: int,
    qShillelaghForceDamageDieSize: int,
    qShillelaghForceDamageModifier: int,
    qTrueStrikeSourceSpellId: str,
    qTrueStrikeComponentWeaponItemId: str,
    qTrueStrikeWeaponUnitId: str,
    qTrueStrikeAttackName: str,
    qTrueStrikeAttackBonus: int,
    qTrueStrikeDamageType: str,
    qTrueStrikeDamageDice: int,
    qTrueStrikeDamageDieSize: int,
    qTrueStrikeDamageModifier: int,
    qScenarioOutcome: Level1BuffMarkSmiteSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: Level1BuffMarkSmiteSelectedIdentityWitnessState

  pure def qDivineFavorActiveRiderCount: int = qState.qDivineFavorActiveRiderCount
  pure def qTargetHp: int = qState.qTargetHp
  pure def qLongstriderTargetSpeedFeet: int = qState.qLongstriderTargetSpeedFeet
  pure def qLongstriderSpeedEffectSourceSpellId: str = qState.qLongstriderSpeedEffectSourceSpellId
  pure def qLongstriderSpeedEffectTarget: str = qState.qLongstriderSpeedEffectTarget
  pure def qLongstriderSpeedDeltaFeet: int = qState.qLongstriderSpeedDeltaFeet
  pure def qCasterTempHp: int = qState.qCasterTempHp
  pure def qCasterFrightened: bool = qState.qCasterFrightened
  pure def qSpellSlotSpentThisTurn: bool = qState.qSpellSlotSpentThisTurn
  pure def qLevel1SlotsRemaining: int = qState.qLevel1SlotsRemaining
  pure def qDamageRiderSourceSpellId: str = qState.qDamageRiderSourceSpellId
  pure def qDamageRiderDamageType: str = qState.qDamageRiderDamageType
  pure def qDamageRiderDice: int = qState.qDamageRiderDice
  pure def qDamageRiderDieSize: int = qState.qDamageRiderDieSize
  pure def qTemporaryHitPointsSourceSpellId: str = qState.qTemporaryHitPointsSourceSpellId
  pure def qTemporaryHitPointsDice: int = qState.qTemporaryHitPointsDice
  pure def qTemporaryHitPointsDieSize: int = qState.qTemporaryHitPointsDieSize
  pure def qTemporaryHitPointsFlat: int = qState.qTemporaryHitPointsFlat
  pure def qFrightenedImmunitySourceSpellId: str = qState.qFrightenedImmunitySourceSpellId
  pure def qFrightenedImmunityCondition: str = qState.qFrightenedImmunityCondition
  pure def qTurnStartTemporaryHitPointsSourceSpellId: str = qState.qTurnStartTemporaryHitPointsSourceSpellId
  pure def qTurnStartTemporaryHitPointsAmount: int = qState.qTurnStartTemporaryHitPointsAmount
  pure def qEnsnaringStrikeRestrainedBeforeEscape: bool = qState.qEnsnaringStrikeRestrainedBeforeEscape
  pure def qTargetRestrained: bool = qState.qTargetRestrained
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qEnsnaringStrikeSaveSourceSpellId: str = qState.qEnsnaringStrikeSaveSourceSpellId
  pure def qEnsnaringStrikeSaveAbility: str = qState.qEnsnaringStrikeSaveAbility
  pure def qTurnStartDamageSourceSpellId: str = qState.qTurnStartDamageSourceSpellId
  pure def qTurnStartDamageDamageType: str = qState.qTurnStartDamageDamageType
  pure def qTurnStartDamageDice: int = qState.qTurnStartDamageDice
  pure def qTurnStartDamageDieSize: int = qState.qTurnStartDamageDieSize
  pure def qEscapeCheckAbility: str = qState.qEscapeCheckAbility
  pure def qEscapeCheckSkill: str = qState.qEscapeCheckSkill
  pure def qHuntersMarkDamageHoleSourceSpellId: str = qState.qHuntersMarkDamageHoleSourceSpellId
  pure def qHuntersMarkDamageHoleDamageType: str = qState.qHuntersMarkDamageHoleDamageType
  pure def qHuntersMarkDamageHoleDice: int = qState.qHuntersMarkDamageHoleDice
  pure def qHuntersMarkDamageHoleDieSize: int = qState.qHuntersMarkDamageHoleDieSize
  pure def qHuntersMarkActiveMarkSourceSpellId: str = qState.qHuntersMarkActiveMarkSourceSpellId
  pure def qHuntersMarkActiveMarkTarget: str = qState.qHuntersMarkActiveMarkTarget
  pure def qHuntersMarkConcentrationSourceSpellId: str = qState.qHuntersMarkConcentrationSourceSpellId
  pure def qHuntersMarkTransferKindOnDropTurn: str = qState.qHuntersMarkTransferKindOnDropTurn
  pure def qHuntersMarkActiveMarkTransferKind: str = qState.qHuntersMarkActiveMarkTransferKind
  pure def qHuntersMarkActiveMarkRetargetTiming: str = qState.qHuntersMarkActiveMarkRetargetTiming
  pure def qHuntersMarkTransferVisibleOnDropTurn: bool = qState.qHuntersMarkTransferVisibleOnDropTurn
  pure def qHexDamageHoleSourceSpellId: str = qState.qHexDamageHoleSourceSpellId
  pure def qHexDamageHoleDamageType: str = qState.qHexDamageHoleDamageType
  pure def qHexDamageHoleDice: int = qState.qHexDamageHoleDice
  pure def qHexDamageHoleDieSize: int = qState.qHexDamageHoleDieSize
  pure def qHexActiveMarkSourceSpellId: str = qState.qHexActiveMarkSourceSpellId
  pure def qHexActiveMarkTarget: str = qState.qHexActiveMarkTarget
  pure def qHexAbilityCheckAbility: str = qState.qHexAbilityCheckAbility
  pure def qHexTransferKindOnDropTurn: str = qState.qHexTransferKindOnDropTurn
  pure def qHexActiveMarkTransferKind: str = qState.qHexActiveMarkTransferKind
  pure def qHexActiveMarkRetargetTiming: str = qState.qHexActiveMarkRetargetTiming
  pure def qHexTransferVisibleOnDropTurn: bool = qState.qHexTransferVisibleOnDropTurn
  pure def qSearingSmiteImmediateDamageSourceSpellId: str = qState.qSearingSmiteImmediateDamageSourceSpellId
  pure def qSearingSmiteImmediateDamageDamageType: str = qState.qSearingSmiteImmediateDamageDamageType
  pure def qSearingSmiteImmediateDamageDice: int = qState.qSearingSmiteImmediateDamageDice
  pure def qSearingSmiteImmediateDamageDieSize: int = qState.qSearingSmiteImmediateDamageDieSize
  pure def qSearingSmiteActiveBeforeSuccessfulSave: bool = qState.qSearingSmiteActiveBeforeSuccessfulSave
  pure def qSearingSmiteTurnStartDamageSourceSpellId: str = qState.qSearingSmiteTurnStartDamageSourceSpellId
  pure def qSearingSmiteTurnStartDamageDamageType: str = qState.qSearingSmiteTurnStartDamageDamageType
  pure def qSearingSmiteTurnStartDamageDice: int = qState.qSearingSmiteTurnStartDamageDice
  pure def qSearingSmiteTurnStartDamageDieSize: int = qState.qSearingSmiteTurnStartDamageDieSize
  pure def qSearingSmiteTurnStartSaveSourceSpellId: str = qState.qSearingSmiteTurnStartSaveSourceSpellId
  pure def qSearingSmiteTurnStartSaveAbility: str = qState.qSearingSmiteTurnStartSaveAbility
  pure def qSearingSmiteTurnStartSaveSuccessEnds: str = qState.qSearingSmiteTurnStartSaveSuccessEnds
  pure def qSearingSmiteActiveAfterSuccessfulSave: bool = qState.qSearingSmiteActiveAfterSuccessfulSave
  pure def qShillelaghOverrideSourceSpellId: str = qState.qShillelaghOverrideSourceSpellId
  pure def qShillelaghOverrideWeaponUnitId: str = qState.qShillelaghOverrideWeaponUnitId
  pure def qShillelaghSpellcastingAbilityModifier: int = qState.qShillelaghSpellcastingAbilityModifier
  pure def qShillelaghOverrideAttackBonus: int = qState.qShillelaghOverrideAttackBonus
  pure def qShillelaghOverrideDamageDice: int = qState.qShillelaghOverrideDamageDice
  pure def qShillelaghOverrideDamageDieSize: int = qState.qShillelaghOverrideDamageDieSize
  pure def qShillelaghForceAttackName: str = qState.qShillelaghForceAttackName
  pure def qShillelaghForceAttackBonus: int = qState.qShillelaghForceAttackBonus
  pure def qShillelaghForceDamageType: str = qState.qShillelaghForceDamageType
  pure def qShillelaghForceDamageDice: int = qState.qShillelaghForceDamageDice
  pure def qShillelaghForceDamageDieSize: int = qState.qShillelaghForceDamageDieSize
  pure def qShillelaghForceDamageModifier: int = qState.qShillelaghForceDamageModifier
  pure def qTrueStrikeSourceSpellId: str = qState.qTrueStrikeSourceSpellId
  pure def qTrueStrikeComponentWeaponItemId: str = qState.qTrueStrikeComponentWeaponItemId
  pure def qTrueStrikeWeaponUnitId: str = qState.qTrueStrikeWeaponUnitId
  pure def qTrueStrikeAttackName: str = qState.qTrueStrikeAttackName
  pure def qTrueStrikeAttackBonus: int = qState.qTrueStrikeAttackBonus
  pure def qTrueStrikeDamageType: str = qState.qTrueStrikeDamageType
  pure def qTrueStrikeDamageDice: int = qState.qTrueStrikeDamageDice
  pure def qTrueStrikeDamageDieSize: int = qState.qTrueStrikeDamageDieSize
  pure def qTrueStrikeDamageModifier: int = qState.qTrueStrikeDamageModifier
  pure def qLastResult: Level1BuffMarkSmiteSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def witnessProtocolForScenario(
    scenarioResult: Level1BuffMarkSmiteSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else witnessResolved(WitnessProtocolHole)

  pure def recordProjectionState(
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
    lastResult: Level1BuffMarkSmiteSelectedIdentityScenarioOutcome,
  ): Level1BuffMarkSmiteSelectedIdentityWitnessState = {
      qDivineFavorActiveRiderCount: divineFavorActiveRiderCount,
      qTargetHp: targetHp,
      qLongstriderTargetSpeedFeet: longstriderTargetSpeedFeet,
      qLongstriderSpeedEffectSourceSpellId: longstriderSpeedEffectSourceSpellId,
      qLongstriderSpeedEffectTarget: longstriderSpeedEffectTarget,
      qLongstriderSpeedDeltaFeet: longstriderSpeedDeltaFeet,
      qCasterTempHp: casterTempHp,
      qCasterFrightened: casterFrightened,
      qSpellSlotSpentThisTurn: spellSlotSpentThisTurn,
      qLevel1SlotsRemaining: level1SlotsRemaining,
      qDamageRiderSourceSpellId: damageRiderSourceSpellId,
      qDamageRiderDamageType: damageRiderDamageType,
      qDamageRiderDice: damageRiderDice,
      qDamageRiderDieSize: damageRiderDieSize,
      qTemporaryHitPointsSourceSpellId: temporaryHitPointsSourceSpellId,
      qTemporaryHitPointsDice: temporaryHitPointsDice,
      qTemporaryHitPointsDieSize: temporaryHitPointsDieSize,
      qTemporaryHitPointsFlat: temporaryHitPointsFlat,
      qFrightenedImmunitySourceSpellId: frightenedImmunitySourceSpellId,
      qFrightenedImmunityCondition: frightenedImmunityCondition,
      qTurnStartTemporaryHitPointsSourceSpellId: turnStartTemporaryHitPointsSourceSpellId,
      qTurnStartTemporaryHitPointsAmount: turnStartTemporaryHitPointsAmount,
      qEnsnaringStrikeRestrainedBeforeEscape: ensnaringStrikeRestrainedBeforeEscape,
      qTargetRestrained: targetRestrained,
      qCasterConcentrating: casterConcentrating,
      qEnsnaringStrikeSaveSourceSpellId: ensnaringStrikeSaveSourceSpellId,
      qEnsnaringStrikeSaveAbility: ensnaringStrikeSaveAbility,
      qTurnStartDamageSourceSpellId: turnStartDamageSourceSpellId,
      qTurnStartDamageDamageType: turnStartDamageDamageType,
      qTurnStartDamageDice: turnStartDamageDice,
      qTurnStartDamageDieSize: turnStartDamageDieSize,
      qEscapeCheckAbility: escapeCheckAbility,
      qEscapeCheckSkill: escapeCheckSkill,
      qHuntersMarkDamageHoleSourceSpellId: huntersMarkDamageHoleSourceSpellId,
      qHuntersMarkDamageHoleDamageType: huntersMarkDamageHoleDamageType,
      qHuntersMarkDamageHoleDice: huntersMarkDamageHoleDice,
      qHuntersMarkDamageHoleDieSize: huntersMarkDamageHoleDieSize,
      qHuntersMarkActiveMarkSourceSpellId: huntersMarkActiveMarkSourceSpellId,
      qHuntersMarkActiveMarkTarget: huntersMarkActiveMarkTarget,
      qHuntersMarkConcentrationSourceSpellId: huntersMarkConcentrationSourceSpellId,
      qHuntersMarkTransferKindOnDropTurn: huntersMarkTransferKindOnDropTurn,
      qHuntersMarkActiveMarkTransferKind: huntersMarkActiveMarkTransferKind,
      qHuntersMarkActiveMarkRetargetTiming: huntersMarkActiveMarkRetargetTiming,
      qHuntersMarkTransferVisibleOnDropTurn: huntersMarkTransferVisibleOnDropTurn,
      qHexDamageHoleSourceSpellId: hexDamageHoleSourceSpellId,
      qHexDamageHoleDamageType: hexDamageHoleDamageType,
      qHexDamageHoleDice: hexDamageHoleDice,
      qHexDamageHoleDieSize: hexDamageHoleDieSize,
      qHexActiveMarkSourceSpellId: hexActiveMarkSourceSpellId,
      qHexActiveMarkTarget: hexActiveMarkTarget,
      qHexAbilityCheckAbility: hexAbilityCheckAbility,
      qHexTransferKindOnDropTurn: hexTransferKindOnDropTurn,
      qHexActiveMarkTransferKind: hexActiveMarkTransferKind,
      qHexActiveMarkRetargetTiming: hexActiveMarkRetargetTiming,
      qHexTransferVisibleOnDropTurn: hexTransferVisibleOnDropTurn,
      qSearingSmiteImmediateDamageSourceSpellId: "none",
      qSearingSmiteImmediateDamageDamageType: "none",
      qSearingSmiteImmediateDamageDice: 0,
      qSearingSmiteImmediateDamageDieSize: 0,
      qSearingSmiteActiveBeforeSuccessfulSave: false,
      qSearingSmiteTurnStartDamageSourceSpellId: "none",
      qSearingSmiteTurnStartDamageDamageType: "none",
      qSearingSmiteTurnStartDamageDice: 0,
      qSearingSmiteTurnStartDamageDieSize: 0,
      qSearingSmiteTurnStartSaveSourceSpellId: "none",
      qSearingSmiteTurnStartSaveAbility: "none",
      qSearingSmiteTurnStartSaveSuccessEnds: "none",
      qSearingSmiteActiveAfterSuccessfulSave: false,
      qShillelaghOverrideSourceSpellId: "none",
      qShillelaghOverrideWeaponUnitId: "none",
      qShillelaghSpellcastingAbilityModifier: 0,
      qShillelaghOverrideAttackBonus: 0,
      qShillelaghOverrideDamageDice: 0,
      qShillelaghOverrideDamageDieSize: 0,
      qShillelaghForceAttackName: "none",
      qShillelaghForceAttackBonus: 0,
      qShillelaghForceDamageType: "none",
      qShillelaghForceDamageDice: 0,
      qShillelaghForceDamageDieSize: 0,
      qShillelaghForceDamageModifier: 0,
      qTrueStrikeSourceSpellId: "none",
      qTrueStrikeComponentWeaponItemId: "none",
      qTrueStrikeWeaponUnitId: "none",
      qTrueStrikeAttackName: "none",
      qTrueStrikeAttackBonus: 0,
      qTrueStrikeDamageType: "none",
      qTrueStrikeDamageDice: 0,
      qTrueStrikeDamageDieSize: 0,
      qTrueStrikeDamageModifier: 0,
      qScenarioOutcome: lastResult,
      protocol: witnessProtocolForScenario(lastResult),
  }

  pure def recordWithoutMarkedDamageProjectionState(
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
    lastResult: Level1BuffMarkSmiteSelectedIdentityScenarioOutcome,
  ): Level1BuffMarkSmiteSelectedIdentityWitnessState = recordProjectionState(
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

  pure def recordLongstriderSpeedProjectionState(
    targetHp: int,
    longstriderTargetSpeedFeet: int,
    longstriderSpeedEffectSourceSpellId: str,
    longstriderSpeedEffectTarget: str,
    longstriderSpeedDeltaFeet: int,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    lastResult: Level1BuffMarkSmiteSelectedIdentityScenarioOutcome,
  ): Level1BuffMarkSmiteSelectedIdentityWitnessState = recordProjectionState(
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

  pure def recordSearingSmiteLifecycleProjectionState(
    state: Level1BuffMarkSmiteSelectedIdentityWitnessState,
    immediateDamageSourceSpellId: str,
    immediateDamageDamageType: str,
    immediateDamageDice: int,
    immediateDamageDieSize: int,
    activeBeforeSuccessfulSave: bool,
    turnStartDamageSourceSpellId: str,
    turnStartDamageDamageType: str,
    turnStartDamageDice: int,
    turnStartDamageDieSize: int,
    turnStartSaveSourceSpellId: str,
    turnStartSaveAbility: str,
    turnStartSaveSuccessEnds: str,
    activeAfterSuccessfulSave: bool,

  ): Level1BuffMarkSmiteSelectedIdentityWitnessState =
    state
      .with("qSearingSmiteImmediateDamageSourceSpellId", immediateDamageSourceSpellId)
      .with("qSearingSmiteImmediateDamageDamageType", immediateDamageDamageType)
      .with("qSearingSmiteImmediateDamageDice", immediateDamageDice)
      .with("qSearingSmiteImmediateDamageDieSize", immediateDamageDieSize)
      .with("qSearingSmiteActiveBeforeSuccessfulSave", activeBeforeSuccessfulSave)
      .with("qSearingSmiteTurnStartDamageSourceSpellId", turnStartDamageSourceSpellId)
      .with("qSearingSmiteTurnStartDamageDamageType", turnStartDamageDamageType)
      .with("qSearingSmiteTurnStartDamageDice", turnStartDamageDice)
      .with("qSearingSmiteTurnStartDamageDieSize", turnStartDamageDieSize)
      .with("qSearingSmiteTurnStartSaveSourceSpellId", turnStartSaveSourceSpellId)
      .with("qSearingSmiteTurnStartSaveAbility", turnStartSaveAbility)
      .with("qSearingSmiteTurnStartSaveSuccessEnds", turnStartSaveSuccessEnds)
      .with("qSearingSmiteActiveAfterSuccessfulSave", activeAfterSuccessfulSave)

  pure def clearSearingSmiteLifecycleProjectionState(
    state: Level1BuffMarkSmiteSelectedIdentityWitnessState,
  ): Level1BuffMarkSmiteSelectedIdentityWitnessState =
    recordSearingSmiteLifecycleProjectionState(
      state,
      "none", "none", 0, 0, false,
      "none", "none", 0, 0,
      "none", "none", "none", false,
    )

  pure def recordShillelaghWeaponAttackOverrideProjectionState(
    state: Level1BuffMarkSmiteSelectedIdentityWitnessState,
    overrideSourceSpellId: str,
    overrideWeaponUnitId: str,
    spellcastingAbilityModifier: int,
    overrideAttackBonus: int,
    overrideDamageDice: int,
    overrideDamageDieSize: int,
    forceAttackName: str,
    forceAttackBonus: int,
    forceDamageType: str,
    forceDamageDice: int,
    forceDamageDieSize: int,
    forceDamageModifier: int,

  ): Level1BuffMarkSmiteSelectedIdentityWitnessState =
    state
      .with("qShillelaghOverrideSourceSpellId", overrideSourceSpellId)
      .with("qShillelaghOverrideWeaponUnitId", overrideWeaponUnitId)
      .with("qShillelaghSpellcastingAbilityModifier", spellcastingAbilityModifier)
      .with("qShillelaghOverrideAttackBonus", overrideAttackBonus)
      .with("qShillelaghOverrideDamageDice", overrideDamageDice)
      .with("qShillelaghOverrideDamageDieSize", overrideDamageDieSize)
      .with("qShillelaghForceAttackName", forceAttackName)
      .with("qShillelaghForceAttackBonus", forceAttackBonus)
      .with("qShillelaghForceDamageType", forceDamageType)
      .with("qShillelaghForceDamageDice", forceDamageDice)
      .with("qShillelaghForceDamageDieSize", forceDamageDieSize)
      .with("qShillelaghForceDamageModifier", forceDamageModifier)

  pure def clearShillelaghWeaponAttackOverrideProjectionState(
    state: Level1BuffMarkSmiteSelectedIdentityWitnessState,
  ): Level1BuffMarkSmiteSelectedIdentityWitnessState =
    recordShillelaghWeaponAttackOverrideProjectionState(
      state,
      "none", "none", 0, 0, 0, 0,
      "none", 0, "none", 0, 0, 0,
    )

  pure def recordTrueStrikeSpellHostedWeaponAttackProjectionState(
    state: Level1BuffMarkSmiteSelectedIdentityWitnessState,
    sourceSpellId: str,
    componentWeaponItemId: str,
    weaponUnitId: str,
    attackName: str,
    attackBonus: int,
    damageType: str,
    damageDice: int,
    damageDieSize: int,
    damageModifier: int,

  ): Level1BuffMarkSmiteSelectedIdentityWitnessState =
    state
      .with("qTrueStrikeSourceSpellId", sourceSpellId)
      .with("qTrueStrikeComponentWeaponItemId", componentWeaponItemId)
      .with("qTrueStrikeWeaponUnitId", weaponUnitId)
      .with("qTrueStrikeAttackName", attackName)
      .with("qTrueStrikeAttackBonus", attackBonus)
      .with("qTrueStrikeDamageType", damageType)
      .with("qTrueStrikeDamageDice", damageDice)
      .with("qTrueStrikeDamageDieSize", damageDieSize)
      .with("qTrueStrikeDamageModifier", damageModifier)

  pure def clearTrueStrikeSpellHostedWeaponAttackProjectionState(
    state: Level1BuffMarkSmiteSelectedIdentityWitnessState,
  ): Level1BuffMarkSmiteSelectedIdentityWitnessState =
    recordTrueStrikeSpellHostedWeaponAttackProjectionState(
      state,
      "none", "none", "none", "none", 0, "none", 0, 0, 0,
    )

  action init = all {
    qState' = recordWithoutMarkedDamageProjectionState(
      0, 12, 0, false, false, 2, "none", "none", 0, 0,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      Init,
    ),
  }

  action doDivineFavorWeaponDamageRider = all {
    qLastResult == Init,
    qState' = recordWithoutMarkedDamageProjectionState(
      1, 5, 0, false, true, 1, "divine_favor", "radiant", 1, 4,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      DivineFavor,
    ),
  }

  action doDivineSmiteAfterHitDamage = all {
    qLastResult == Init,
    qState' = recordWithoutMarkedDamageProjectionState(
      0, 1, 0, false, true, 1, "divine_smite", "radiant", 2, 8,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      DivineSmite,
    ),
  }

  action doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape = all {
    qLastResult == Init,
    qState' = recordWithoutMarkedDamageProjectionState(
      0, 5, 0, false, false, 1, "none", "none", 0, 0,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      true, false, false,
      "ensnaring_strike", "str",
      "ensnaring_strike", "piercing", 1, 6,
      "str", "athletics",
      EnsnaringStrike,
    ),
  }

  action doFalseLifeTemporaryHitPoints = all {
    qLastResult == Init,
    qState' = recordWithoutMarkedDamageProjectionState(
      0, 12, 11, false, true, 1, "none", "none", 0, 0,
      "false_life", 2, 4, 4,
      "none", "none", "none", 0,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      FalseLife,
    ),
  }

  action doHeroismFrightenedImmunityTurnStartTemporaryHitPoints = all {
    qLastResult == Init,
    qState' = recordWithoutMarkedDamageProjectionState(
      0, 12, 3, false, false, 1, "none", "none", 0, 0,
      "none", 0, 0, 0,
      "heroism", "frightened", "heroism", 3,
      false, false, true, "none", "none", "none", "none", 0, 0, "none", "none",
      Heroism,
    ),
  }

  action doHeroismFrightenedImmunityTurnStartTemporaryHitPointsCleanup = all {
    qLastResult == Init,
    qState' = recordWithoutMarkedDamageProjectionState(
      0, 12, 3, true, false, 1, "none", "none", 0, 0,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      Heroism,
    ),
  }

  action doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer = all {
    qLastResult == Init,
    qState' = recordProjectionState(
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
      HuntersMark,
    ),
  }

  action doHexMarkedDamageRiderAndLaterTurnTransfer = all {
    qLastResult == Init,
    qState' = recordProjectionState(
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
      Hex,
    ),
  }

  action doLongstriderSpeedIncrease = all {
    qLastResult == Init,
    qState' = recordLongstriderSpeedProjectionState(
      12,
      40,
      "longstrider",
      "target",
      10,
      true,
      1,
      Longstrider,
    ),
  }

  action doSearingSmiteAfterHitTimedDamageAndSaveCleanup = all {
    qLastResult == Init,
    qState' = recordSearingSmiteLifecycleProjectionState(
      recordWithoutMarkedDamageProjectionState(
      0, 1, 0, false, false, 1, "none", "none", 0, 0,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      SearingSmite,
    ),
      "searing_smite", "fire", 1, 6, true,
      "searing_smite", "fire", 1, 6,
      "searing_smite", "con", "spell", false,
    ),
  }

  action doShillelaghWeaponAttackOverride = all {
    qLastResult == Init,
    qState' = recordShillelaghWeaponAttackOverrideProjectionState(
      recordWithoutMarkedDamageProjectionState(
      0, 5, 0, false, false, 2, "none", "none", 0, 0,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      Shillelagh,
    ),
      "shillelagh", "weapon_quarterstaff", 3, 5, 1, 8,
      "Quarterstaff (force)", 5, "force", 1, 8, 3,
    ),
  }

  action doTrueStrikeSpellHostedWeaponAttack = all {
    qLastResult == Init,
    qState' = recordTrueStrikeSpellHostedWeaponAttackProjectionState(
      recordWithoutMarkedDamageProjectionState(
      0, 5, 0, false, false, 2, "none", "none", 0, 0,
      "none", 0, 0, 0,
      "none", "none", "none", 0,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      TrueStrike,
    ),
      "true_strike", "main:weapon_dagger", "weapon_dagger", "Dagger",
      5, "radiant", 1, 4, 3,
    ),
  }

  action step = any {
    doDivineFavorWeaponDamageRider,
    doDivineSmiteAfterHitDamage,
    doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape,
    doFalseLifeTemporaryHitPoints,
    doHeroismFrightenedImmunityTurnStartTemporaryHitPoints,
    doHeroismFrightenedImmunityTurnStartTemporaryHitPointsCleanup,
    doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer,
    doHexMarkedDamageRiderAndLaterTurnTransfer,
    doLongstriderSpeedIncrease,
    doSearingSmiteAfterHitTimedDamageAndSaveCleanup,
    doShillelaghWeaponAttackOverride,
    doTrueStrikeSpellHostedWeaponAttack,
  }
}
