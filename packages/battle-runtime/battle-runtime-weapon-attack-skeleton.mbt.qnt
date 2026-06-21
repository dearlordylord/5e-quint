// -*- mode: Bluespec; -*-

module battleRuntimeWeaponAttackSkeletonMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Self-contained literal projection witness for the promoted bounded battle
  // replay. This driver asserts the fixed Skeleton weapon-damage outcomes
  // directly instead of importing the damage reducer and model barrel.
  type Hole =
    | TargetChoice
    | AttackRoll
    | DamageRoll

  var qSkeletonHp: int
  var qSkeletonDead: bool
  var qActionAvailable: bool
  var qMultiattackDispatchesAvailable: int
  var qSneakAttackUsedThisTurn: bool
  var qProtocol: WitnessProtocol[Hole]

  pure def openHoles: Set[Hole] = qProtocol.holes

  pure val skeletonInitialHp: int = 13
  pure val rogueAttackModifier: int = 3

  pure def weaponAttackSkeletonProtocolForProjection(
    holes: Set[Hole],
    result: WitnessResult,
  ): WitnessProtocol[Hole] =
    witnessProtocolFromResult(holes, TargetChoice, result)

  pure def skeletonHpAfterPiercingWeaponDamage(
    hp: int,
    damageRoll: int,
  ): int = {
    val damage = damageRoll + rogueAttackModifier
    if (hp - damage < 0) 0 else hp - damage
  }

  action init = all {
    qSkeletonHp' = skeletonInitialHp,
    qSkeletonDead' = false,
    qActionAvailable' = true,
    qMultiattackDispatchesAvailable' = 0,
    qSneakAttackUsedThisTurn' = false,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(
      Set(TargetChoice),
      WInit,
    ),
  }

  action doDiscoverAttack = all {
    qActionAvailable,
    openHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(TargetChoice), WNeedsHoles),
  }

  action doFillTarget = all {
    qActionAvailable,
    openHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(AttackRoll), WNeedsHoles),
  }

  action doRejectWrongTarget = all {
    qActionAvailable,
    openHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(openHoles, WInvalid(WInvalidFill)),
  }

  action doFillAttackRollMiss = all {
    qActionAvailable,
    openHoles == Set(AttackRoll),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), WResolved),
  }

  action doFillAttackRollHit = all {
    qActionAvailable,
    openHoles == Set(AttackRoll),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(DamageRoll), WNeedsHoles),
  }

  action doFillDamageLow = all {
    qActionAvailable,
    openHoles == Set(DamageRoll),
    qSkeletonHp' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 2),
    qSkeletonDead' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 2) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), WResolved),
  }

  action doFillDamageHigh = all {
    qActionAvailable,
    openHoles == Set(DamageRoll),
    qSkeletonHp' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4),
    qSkeletonDead' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), WResolved),
  }

  action doFillDamageLowSneakAttack = all {
    qActionAvailable,
    openHoles == Set(DamageRoll),
    not(qSneakAttackUsedThisTurn),
    qSkeletonHp' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4),
    qSkeletonDead' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = true,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), WResolved),
  }

  action doFillDamageHighSneakAttack = all {
    qActionAvailable,
    openHoles == Set(DamageRoll),
    not(qSneakAttackUsedThisTurn),
    qSkeletonHp' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 8),
    qSkeletonDead' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 8) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = true,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), WResolved),
  }

  action doRejectStaleAfterResolved = all {
    not(qActionAvailable),
    openHoles == Set(),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(openHoles, WInvalid(WStaleSubject)),
  }

  action doStartSkeletonTurn = all {
    qActionAvailable,
    openHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = true,
    qMultiattackDispatchesAvailable' = 0,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), WResolved),
  }

  action doResolveSkeletonMultiattack = all {
    qActionAvailable,
    openHoles == Set(),
    qMultiattackDispatchesAvailable == 0,
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = 1,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), WResolved),
  }

  action doRejectRecursiveSkeletonMultiattack = all {
    not(qActionAvailable),
    openHoles == Set(),
    qMultiattackDispatchesAvailable > 0,
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(openHoles, WInvalid(WStaleSubject)),
  }

  action doSpendSkeletonMultiattackDispatch = all {
    not(qActionAvailable),
    openHoles == Set(),
    qMultiattackDispatchesAvailable > 0,
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable - 1,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), WResolved),
  }

  action step = any {
    doDiscoverAttack,
    doFillTarget,
    doRejectWrongTarget,
    doFillAttackRollMiss,
    doFillAttackRollHit,
    doFillDamageLow,
    doFillDamageHigh,
    doFillDamageLowSneakAttack,
    doFillDamageHighSneakAttack,
    doRejectStaleAfterResolved,
    doStartSkeletonTurn,
    doResolveSkeletonMultiattack,
    doRejectRecursiveSkeletonMultiattack,
    doSpendSkeletonMultiattackDispatch,
  }
}
