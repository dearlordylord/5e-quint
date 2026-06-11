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

  pure def qHoles: Set[Hole] = qProtocol.holes

  pure def spiritualWeaponProtocolForProjection(
    holes: Set[Hole],
    lastResult: str,
  ): WitnessProtocol[Hole] =
    if (lastResult == "init") witnessInitWithHoles(holes)
    else if (lastResult == "invalid") witnessInvalidWithHoles(holes, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(TargetChoice)

  action init = all {
    qTargetHp' = 13,
    qBonusActionAvailable' = true,
    qCasterConcentrating' = false,
    qForcePositionId' = 0,
    qProtocol' = spiritualWeaponProtocolForProjection(
      Set(TargetChoice, SpiritualWeaponForcePosition),
      "init",
    ),
  }

  action doFillCastTargetAndForce = all {
    qBonusActionAvailable,
    qHoles == Set(TargetChoice, SpiritualWeaponForcePosition),
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = qBonusActionAvailable,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = qForcePositionId,
    qProtocol' = spiritualWeaponProtocolForProjection(Set(AttackRoll), "needsHoles"),
  }

  action doFillCastAttackHit = all {
    qBonusActionAvailable,
    qTargetHp == 13,
    qHoles == Set(AttackRoll),
    qTargetHp' = qTargetHp,
    qBonusActionAvailable' = false,
    qCasterConcentrating' = true,
    qForcePositionId' = 1,
    qProtocol' = spiritualWeaponProtocolForProjection(Set(SpellDamageRoll), "needsHoles"),
  }

  action doFillCastDamageLow = all {
    qHoles == Set(SpellDamageRoll),
    qForcePositionId == 1,
    qTargetHp == 13,
    qTargetHp' = 8,
    qBonusActionAvailable' = false,
    qCasterConcentrating' = true,
    qForcePositionId' = qForcePositionId,
    qProtocol' = spiritualWeaponProtocolForProjection(Set(), "resolved"),
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
    qProtocol' = spiritualWeaponProtocolForProjection(qHoles, "resolved"),
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
    qProtocol' = spiritualWeaponProtocolForProjection(Set(AttackRoll), "needsHoles"),
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
    qProtocol' = spiritualWeaponProtocolForProjection(Set(SpellDamageRoll), "needsHoles"),
  }

  action doFillRepeatDamageLow = all {
    qHoles == Set(SpellDamageRoll),
    qForcePositionId == 1,
    qTargetHp == 8,
    qTargetHp' = 3,
    qBonusActionAvailable' = false,
    qCasterConcentrating' = qCasterConcentrating,
    qForcePositionId' = 2,
    qProtocol' = spiritualWeaponProtocolForProjection(Set(), "resolved"),
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
