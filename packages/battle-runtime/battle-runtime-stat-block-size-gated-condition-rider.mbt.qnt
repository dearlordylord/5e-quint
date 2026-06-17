// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_CONTROL

module battleRuntimeStatBlockSizeGatedConditionRiderMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type TargetSizeGate =
    | MediumOrSmallerTarget
    | LargerTarget
    | MediumOrSmallerProneImmuneTarget
  type Hole = | TargetChoice | AttackRoll | DamageRoll

  var qTargetHp: int
  var qTargetProne: bool
  var qTargetSizeGate: TargetSizeGate
  var qProtocol: WitnessProtocol[Hole]

  pure def qHoles: Set[Hole] = qProtocol.holes

  pure val targetInitialHp: int = 20
  pure val targetHpAfterBiteDamage: int = 17

  action recordProjection(
    targetHp: int,
    targetProne: bool,
    targetSizeGate: TargetSizeGate,
    holes: Set[Hole],
    result: WitnessResult,
  ): bool = all {
    qTargetHp' = targetHp,
    qTargetProne' = targetProne,
    qTargetSizeGate' = targetSizeGate,
    qProtocol' = { holes: holes, result: result },
  }

  action initMediumOrSmallerTarget = recordProjection(
    targetInitialHp,
    false,
    MediumOrSmallerTarget,
    Set(TargetChoice),
    WInit,
  )

  action initLargerTarget = recordProjection(
    targetInitialHp,
    false,
    LargerTarget,
    Set(TargetChoice),
    WInit,
  )

  action initMediumOrSmallerProneImmuneTarget = recordProjection(
    targetInitialHp,
    false,
    MediumOrSmallerProneImmuneTarget,
    Set(TargetChoice),
    WInit,
  )

  action doFillTargetChoice = all {
    qHoles == Set(TargetChoice),
    recordProjection(
      qTargetHp,
      qTargetProne,
      qTargetSizeGate,
      Set(AttackRoll),
      WNeedsHoles,
    ),
  }

  action doFillHitAttackRoll = all {
    qHoles == Set(AttackRoll),
    val conditionApplies = qTargetSizeGate == MediumOrSmallerTarget
    recordProjection(
      qTargetHp,
      conditionApplies or qTargetProne,
      qTargetSizeGate,
      Set(DamageRoll),
      WNeedsHoles,
    ),
  }

  action doResolveDamage = all {
    qHoles == Set(DamageRoll),
    recordProjection(
      targetHpAfterBiteDamage,
      qTargetProne,
      qTargetSizeGate,
      Set(),
      WResolved,
    ),
  }

  action step = any {
    doFillTargetChoice,
    doFillHitAttackRoll,
    doResolveDamage,
  }
}
