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

  pure def qHoles: Set[Hole] = qProtocol.holes

  pure val skeletonInitialHp: int = 13
  pure val rogueAttackModifier: int = 3

  pure def weaponAttackSkeletonProtocolForProjection(
    holes: Set[Hole],
    lastResult: str,
    invalidReason: str,
  ): WitnessProtocol[Hole] =
    if (lastResult == "init") witnessInitWithHoles(holes)
    else if (lastResult == "invalid")
      witnessInvalidWithHoles(
        holes,
        if (invalidReason == "staleSubject") WStaleSubject else WInvalidFill,
      )
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(TargetChoice)

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
      "init",
      "",
    ),
  }

  action doDiscoverAttack = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(TargetChoice), "needsHoles", ""),
  }

  action doFillTarget = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(AttackRoll), "needsHoles", ""),
  }

  action doRejectWrongTarget = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(qHoles, "invalid", "invalidFill"),
  }

  action doFillAttackRollMiss = all {
    qActionAvailable,
    qHoles == Set(AttackRoll),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), "resolved", ""),
  }

  action doFillAttackRollHit = all {
    qActionAvailable,
    qHoles == Set(AttackRoll),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(DamageRoll), "needsHoles", ""),
  }

  action doFillDamageLow = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    qSkeletonHp' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 2),
    qSkeletonDead' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 2) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), "resolved", ""),
  }

  action doFillDamageHigh = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    qSkeletonHp' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4),
    qSkeletonDead' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), "resolved", ""),
  }

  action doFillDamageLowSneakAttack = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    not(qSneakAttackUsedThisTurn),
    qSkeletonHp' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4),
    qSkeletonDead' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = true,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), "resolved", ""),
  }

  action doFillDamageHighSneakAttack = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    not(qSneakAttackUsedThisTurn),
    qSkeletonHp' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 8),
    qSkeletonDead' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 8) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = true,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), "resolved", ""),
  }

  action doRejectStaleAfterResolved = all {
    not(qActionAvailable),
    qHoles == Set(),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(qHoles, "invalid", "staleSubject"),
  }

  action doStartSkeletonTurn = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = true,
    qMultiattackDispatchesAvailable' = 0,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), "resolved", ""),
  }

  action doResolveSkeletonMultiattack = all {
    qActionAvailable,
    qHoles == Set(),
    qMultiattackDispatchesAvailable == 0,
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = 1,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), "resolved", ""),
  }

  action doRejectRecursiveSkeletonMultiattack = all {
    not(qActionAvailable),
    qHoles == Set(),
    qMultiattackDispatchesAvailable > 0,
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(qHoles, "invalid", "staleSubject"),
  }

  action doSpendSkeletonMultiattackDispatch = all {
    not(qActionAvailable),
    qHoles == Set(),
    qMultiattackDispatchesAvailable > 0,
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable - 1,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(Set(), "resolved", ""),
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
