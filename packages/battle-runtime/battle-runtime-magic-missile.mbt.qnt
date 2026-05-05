// -*- mode: Bluespec; -*-

module battleRuntimeMagicMissileMbt {
  import battleRuntime.* from "./battle-runtime"

  var qSkeletonHp: int
  var qSkeletonDead: bool
  var qActionAvailable: bool
  var qMultiattackDispatchesAvailable: int
  var qSneakAttackUsedThisTurn: bool
  var qHoles: Set[Hole]
  var qLastResult: str
  var qLastInvalidReason: str

  pure val skeletonInitialHp: int = 13

  pure def skeletonHpAfterMagicMissileDamage(
    hp: int,
    dartRollTotal: int,
  ): int = {
    val adjustedDamage = damageAfterAdjustments(
      dartRollTotal + 3,
      Force,
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
    qMultiattackDispatchesAvailable' = 0,
    qSneakAttackUsedThisTurn' = false,
    qHoles' = Set(SpellTargetAllocation),
    qLastResult' = "init",
    qLastInvalidReason' = "",
  }

  action doFillMagicMissileAllocation = all {
    qActionAvailable,
    qHoles == Set(SpellTargetAllocation),
    qSkeletonHp' = qSkeletonHp,
    qSkeletonDead' = qSkeletonDead,
    qActionAvailable' = qActionAvailable,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = Set(SpellDamageRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillMagicMissileDamageLow = all {
    qActionAvailable,
    qHoles == Set(SpellDamageRoll),
    qSkeletonHp' = skeletonHpAfterMagicMissileDamage(qSkeletonHp, 3),
    qSkeletonDead' = skeletonHpAfterMagicMissileDamage(qSkeletonHp, 3) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillMagicMissileDamageHigh = all {
    qActionAvailable,
    qHoles == Set(SpellDamageRoll),
    qSkeletonHp' = skeletonHpAfterMagicMissileDamage(qSkeletonHp, 12),
    qSkeletonDead' = skeletonHpAfterMagicMissileDamage(qSkeletonHp, 12) == 0,
    qActionAvailable' = false,
    qMultiattackDispatchesAvailable' = qMultiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action step = any {
    doFillMagicMissileAllocation,
    doFillMagicMissileDamageLow,
    doFillMagicMissileDamageHigh,
  }
}
