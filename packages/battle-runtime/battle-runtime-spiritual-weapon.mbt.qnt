// -*- mode: Bluespec; -*-

module battleRuntimeSpiritualWeaponMbt {
  import battleRuntime.* from "./battle-runtime"
  import battleRuntimeModel.* from "./battle-runtime-model"

  var qTargetHp: int
  var qBonusActionAvailable: bool
  var qCasterConcentrating: bool
  var qForcePositionId: int
  var qHoles: Set[Hole]
  var qLastResult: str
  var qLastInvalidReason: str

  action init = all {
    qTargetHp' = 13,
    qBonusActionAvailable' = true,
    qCasterConcentrating' = false,
    qForcePositionId' = 0,
    qHoles' = Set(TargetChoice, SpiritualWeaponForcePosition),
    qLastResult' = "init",
    qLastInvalidReason' = "",
  }

  action doFillCastTargetAndForce = all {
    qBonusActionAvailable,
    qHoles == Set(TargetChoice, SpiritualWeaponForcePosition),
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = qBonusActionAvailable,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = qForcePositionId,
    qHoles' = Set(AttackRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillCastAttackHit = all {
    qBonusActionAvailable,
    qTargetHp == 13,
    qHoles == Set(AttackRoll),
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = false,
    qCasterConcentrating' = true,
    qForcePositionId' = 1,
    qHoles' = Set(SpellDamageRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillCastDamageLow = all {
    qHoles == Set(SpellDamageRoll),
    qForcePositionId == 1,
    qTargetHp == 13,
    qTargetHp' = 8,
    qBonusActionAvailable' = false,
    qCasterConcentrating' = true,
    qForcePositionId' = qForcePositionId,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doAdvanceToLaterCasterTurn = all {
    qHoles == Set(),
    not(qBonusActionAvailable),
    qCasterConcentrating,
    qForcePositionId == 1,
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = true,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = qForcePositionId,
    qHoles' = qHoles,
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillRepeatTargetAndForce = all {
    qBonusActionAvailable,
    qCasterConcentrating,
    qForcePositionId == 1,
    qHoles == Set(),
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = qBonusActionAvailable,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = qForcePositionId,
    qHoles' = Set(AttackRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillRepeatAttackHit = all {
    qBonusActionAvailable,
    qCasterConcentrating,
    qTargetHp == 8,
    qForcePositionId == 1,
    qHoles == Set(AttackRoll),
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = qBonusActionAvailable,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = qForcePositionId,
    qHoles' = Set(SpellDamageRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillRepeatDamageLow = all {
    qHoles == Set(SpellDamageRoll),
    qForcePositionId == 1,
    qTargetHp == 8,
    qTargetHp' = 3,
    qBonusActionAvailable' = false,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = 2,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action step = any {
    doFillCastTargetAndForce,
    doFillCastAttackHit,
    doFillCastDamageLow,
    doAdvanceToLaterCasterTurn,
    doFillRepeatTargetAndForce,
    doFillRepeatAttackHit,
    doFillRepeatDamageLow,
  }
}
