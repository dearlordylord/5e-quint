// -*- mode: Bluespec; -*-

module battleRuntimeSpiritualWeaponMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole =
    | TargetChoice
    | SpiritualWeaponForcePosition
    | AttackRoll
    | SpellDamageRoll

  var qTargetHp: int
  var qBonusActionAvailable: bool
  var qCasterConcentrating: bool
  var qForcePositionId: int
  var qProtocol: WitnessProtocol[Hole]

  pure def openHoles: Set[Hole] = qProtocol.holes

  pure def spiritualWeaponProtocolForProjection(
    holes: Set[Hole],
    result: WitnessResult,
  ): WitnessProtocol[Hole] =
    witnessProtocolFromResult(holes, TargetChoice, result)

  action init = all {
    qTargetHp' = 13,
    qBonusActionAvailable' = true,
    qCasterConcentrating' = false,
    qForcePositionId' = 0,
    qProtocol' = spiritualWeaponProtocolForProjection(
      Set(TargetChoice, SpiritualWeaponForcePosition),
      WInit,
    ),
  }

  action doFillCastTargetAndForce = all {
    qBonusActionAvailable,
    openHoles == Set(TargetChoice, SpiritualWeaponForcePosition),
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = qBonusActionAvailable,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = qForcePositionId,
    qProtocol' = spiritualWeaponProtocolForProjection(Set(AttackRoll), WNeedsHoles),
  }

  action doFillCastAttackHit = all {
    qBonusActionAvailable,
    qTargetHp == 13,
    openHoles == Set(AttackRoll),
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = false,
    qCasterConcentrating' = true,
    qForcePositionId' = 1,
    qProtocol' = spiritualWeaponProtocolForProjection(Set(SpellDamageRoll), WNeedsHoles),
  }

  action doFillCastDamageLow = all {
    openHoles == Set(SpellDamageRoll),
    qForcePositionId == 1,
    qTargetHp == 13,
    qTargetHp' = 8,
    qBonusActionAvailable' = false,
    qCasterConcentrating' = true,
    qForcePositionId' = qForcePositionId,
    qProtocol' = spiritualWeaponProtocolForProjection(Set(), WResolved),
  }

  action doAdvanceToLaterCasterTurn = all {
    openHoles == Set(),
    not(qBonusActionAvailable),
    qCasterConcentrating,
    qForcePositionId == 1,
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = true,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = qForcePositionId,
    qProtocol' = spiritualWeaponProtocolForProjection(openHoles, WResolved),
  }

  action doFillRepeatTargetAndForce = all {
    qBonusActionAvailable,
    qCasterConcentrating,
    qForcePositionId == 1,
    openHoles == Set(),
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = qBonusActionAvailable,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = qForcePositionId,
    qProtocol' = spiritualWeaponProtocolForProjection(Set(AttackRoll), WNeedsHoles),
  }

  action doFillRepeatAttackHit = all {
    qBonusActionAvailable,
    qCasterConcentrating,
    qTargetHp == 8,
    qForcePositionId == 1,
    openHoles == Set(AttackRoll),
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = qBonusActionAvailable,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = qForcePositionId,
    qProtocol' = spiritualWeaponProtocolForProjection(Set(SpellDamageRoll), WNeedsHoles),
  }

  action doFillRepeatDamageLow = all {
    openHoles == Set(SpellDamageRoll),
    qForcePositionId == 1,
    qTargetHp == 8,
    qTargetHp' = 3,
    qBonusActionAvailable' = false,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = 2,
    qProtocol' = spiritualWeaponProtocolForProjection(Set(), WResolved),
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
