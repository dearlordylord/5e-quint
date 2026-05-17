// -*- mode: Bluespec; -*-

module battleRuntimeLevel1BuffMarkSmiteSelectedIdentityMbt {
  var qDivineFavorActiveRiderCount: int
  var qTargetHp: int
  var qSpellSlotSpentThisTurn: bool
  var qLevel1SlotsRemaining: int
  var qDamageRiderSourceSpellId: str
  var qDamageRiderDamageType: str
  var qDamageRiderDice: int
  var qDamageRiderDieSize: int
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
  var qLastResult: str

  action recordProjection(
    divineFavorActiveRiderCount: int,
    targetHp: int,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    damageRiderSourceSpellId: str,
    damageRiderDamageType: str,
    damageRiderDice: int,
    damageRiderDieSize: int,
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
  ): bool = all {
    qDivineFavorActiveRiderCount' = divineFavorActiveRiderCount,
    qTargetHp' = targetHp,
    qSpellSlotSpentThisTurn' = spellSlotSpentThisTurn,
    qLevel1SlotsRemaining' = level1SlotsRemaining,
    qDamageRiderSourceSpellId' = damageRiderSourceSpellId,
    qDamageRiderDamageType' = damageRiderDamageType,
    qDamageRiderDice' = damageRiderDice,
    qDamageRiderDieSize' = damageRiderDieSize,
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
    qLastResult' = lastResult,
  }

  action init = recordProjection(
    0, 12, false, 2, "none", "none", 0, 0,
    false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
    "init",
  )

  action doDivineFavorWeaponDamageRider = all {
    qLastResult == "init",
    recordProjection(
      1, 5, true, 1, "divine_favor", "radiant", 1, 4,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      "divineFavor",
    ),
  }

  action doDivineSmiteAfterHitDamage = all {
    qLastResult == "init",
    recordProjection(
      0, 1, true, 1, "divine_smite", "radiant", 2, 8,
      false, false, false, "none", "none", "none", "none", 0, 0, "none", "none",
      "divineSmite",
    ),
  }

  action doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape = all {
    qLastResult == "init",
    recordProjection(
      0, 5, false, 1, "none", "none", 0, 0,
      true, false, false,
      "ensnaring_strike", "str",
      "ensnaring_strike", "piercing", 1, 6,
      "str", "athletics",
      "ensnaringStrike",
    ),
  }

  action step = any {
    doDivineFavorWeaponDamageRider,
    doDivineSmiteAfterHitDamage,
    doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape,
  }
}
