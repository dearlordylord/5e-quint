// -*- mode: Bluespec; -*-

module battleRuntimeLevel1BuffMarkSmiteSelectedIdentityMbt {
  var qDivineFavorActiveRiderCount: int
  var qTargetHp: int
  var qSpellSlotSpentThisTurn: bool
  var qLevel1SlotsRemaining: int
  var qDivineFavorDamageRiderProjected: bool
  var qDamageRiderDamageType: str
  var qDamageRiderDice: int
  var qDamageRiderDieSize: int
  var qLastResult: str

  action recordProjection(
    divineFavorActiveRiderCount: int,
    targetHp: int,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    divineFavorDamageRiderProjected: bool,
    damageRiderDamageType: str,
    damageRiderDice: int,
    damageRiderDieSize: int,
    lastResult: str,
  ): bool = all {
    qDivineFavorActiveRiderCount' = divineFavorActiveRiderCount,
    qTargetHp' = targetHp,
    qSpellSlotSpentThisTurn' = spellSlotSpentThisTurn,
    qLevel1SlotsRemaining' = level1SlotsRemaining,
    qDivineFavorDamageRiderProjected' = divineFavorDamageRiderProjected,
    qDamageRiderDamageType' = damageRiderDamageType,
    qDamageRiderDice' = damageRiderDice,
    qDamageRiderDieSize' = damageRiderDieSize,
    qLastResult' = lastResult,
  }

  action init = recordProjection(0, 12, false, 2, false, "none", 0, 0, "init")

  action doDivineFavorWeaponDamageRider = all {
    qLastResult == "init",
    recordProjection(1, 5, true, 1, true, "radiant", 1, 4, "divineFavor"),
  }

  action step = any {
    doDivineFavorWeaponDamageRider,
  }
}
