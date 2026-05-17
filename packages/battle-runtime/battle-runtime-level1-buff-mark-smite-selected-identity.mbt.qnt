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
    qLastResult' = lastResult,
  }

  action init = recordProjection(0, 12, false, 2, "none", "none", 0, 0, "init")

  action doDivineFavorWeaponDamageRider = all {
    qLastResult == "init",
    recordProjection(1, 5, true, 1, "divine_favor", "radiant", 1, 4, "divineFavor"),
  }

  action doDivineSmiteAfterHitDamage = all {
    qLastResult == "init",
    recordProjection(0, 1, true, 1, "divine_smite", "radiant", 2, 8, "divineSmite"),
  }

  action step = any {
    doDivineFavorWeaponDamageRider,
    doDivineSmiteAfterHitDamage,
  }
}
