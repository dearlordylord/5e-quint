// -*- mode: Bluespec; -*-

module battleRuntimeMbt {
  import battleRuntime.* from "./battle-runtime"

  var qSkeletonHp: int
  var qSkeletonDead: bool
  var qActionAvailable: bool
  var qHoles: Set[Hole]
  var qLastResult: str
  var qLastInvalidReason: str

  pure val skeletonInitialHp: int = 13
  pure val fighterAttackModifier: int = 3

  pure def skeletonHpAfterBludgeoningWeaponDamage(
    hp: int,
    damageRoll: int,
  ): int = {
    val adjustedDamage = damageAfterAdjustments(
      damageRoll + fighterAttackModifier,
      Bludgeoning,
      Set(),
      Set(Bludgeoning),
      Set(Poison),
    )
    if (hp - adjustedDamage < 0) 0 else hp - adjustedDamage
  }

  action init = all {
    qSkeletonHp' = skeletonInitialHp,
    qSkeletonDead' = false,
    qActionAvailable' = true,
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
    qHoles' = Set(DamageRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillDamageLow = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    qSkeletonHp' = skeletonHpAfterBludgeoningWeaponDamage(qSkeletonHp, 2),
    qSkeletonDead' = skeletonHpAfterBludgeoningWeaponDamage(qSkeletonHp, 2) == 0,
    qActionAvailable' = false,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillDamageHigh = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    qSkeletonHp' = skeletonHpAfterBludgeoningWeaponDamage(qSkeletonHp, 4),
    qSkeletonDead' = skeletonHpAfterBludgeoningWeaponDamage(qSkeletonHp, 4) == 0,
    qActionAvailable' = false,
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
    qHoles' = qHoles,
    qLastResult' = "invalid",
    qLastInvalidReason' = "staleSubject",
  }

  action step = any {
    doDiscoverAttack,
    doFillTarget,
    doRejectWrongTarget,
    doFillAttackRollMiss,
    doFillAttackRollHit,
    doFillDamageLow,
    doFillDamageHigh,
    doRejectStaleAfterResolved,
  }
}
