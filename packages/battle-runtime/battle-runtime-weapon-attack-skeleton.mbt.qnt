// -*- mode: Bluespec; -*-

module battleRuntimeWeaponAttackSkeletonMbt {
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
  var qHoles: Set[Hole]
  var qLastResult: str
  var qLastInvalidReason: str

  pure val skeletonInitialHp: int = 13
  pure val rogueAttackModifier: int = 3

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
    qHoles' = Set(TargetChoice),
    qLastResult' = "init",
    qLastInvalidReason' = "",
  }

  action doDiscoverAttack = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = Set(TargetChoice),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillTarget = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = Set(AttackRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doRejectWrongTarget = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = qHoles,
    qLastResult' = "invalid",
    qLastInvalidReason' = "invalidFill",
  }

  action doFillAttackRollMiss = all {
    qActionAvailable,
    qHoles == Set(AttackRoll),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillAttackRollHit = all {
    qActionAvailable,
    qHoles == Set(AttackRoll),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = Set(DamageRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillDamageLow = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    qSkeletonHp' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 2),
    qSkeletonDead' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 2) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillDamageHigh = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    qSkeletonHp' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4),
    qSkeletonDead' = skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
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
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
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
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doRejectStaleAfterResolved = all {
    not(qActionAvailable),
    qHoles == Set(),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = qHoles,
    qLastResult' = "invalid",
    qLastInvalidReason' = "staleSubject",
  }

  action doStartSkeletonTurn = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = true,
    qMultiattackDispatchesAvailable' = 0,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
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
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
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
    qHoles' = qHoles,
    qLastResult' = "invalid",
    qLastInvalidReason' = "staleSubject",
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
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
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
