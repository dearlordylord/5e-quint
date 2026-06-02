// -*- mode: Bluespec; -*-

module battleRuntimeMagicMissileMbt {
  // Self-contained literal projection witness for the Magic Missile selected
  // identity replay. The fixed target has no Force resistance or immunity, so
  // the SRD dart total plus three darts is the effective damage.
  type Hole =
    | SpellTargetAllocation
    | SpellDamageRoll

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
    val damage = dartRollTotal + 3
    if (hp - damage < 0) 0 else hp - damage
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
