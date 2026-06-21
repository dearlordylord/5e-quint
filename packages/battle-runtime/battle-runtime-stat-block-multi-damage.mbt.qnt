// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_CONTROL

module battleRuntimeStatBlockMultiDamageMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type DamageMode = | RolledDamageMode | StaticDamageMode
  type Hole = | TargetChoice | AttackRoll | DamageRoll

  var qTargetHp: int
  var qDamageMode: DamageMode
  var qProtocol: WitnessProtocol[Hole]

  pure def openHoles: Set[Hole] = qProtocol.holes

  pure val targetInitialHp: int = 12
  pure val targetHpAfterRolledPiercingOnly: int = 10
  pure val targetHpAfterStaticPiercingOnly: int = 9

  action recordProjection(
    targetHp: int,
    damageMode: DamageMode,
    holes: Set[Hole],
    result: WitnessResult,
  ): bool = all {
    qTargetHp' = targetHp,
    qDamageMode' = damageMode,
    qProtocol' = { holes: holes, result: result },
  }

  action initRolled = recordProjection(
    targetInitialHp,
    RolledDamageMode,
    Set(TargetChoice),
    WInit,
  )

  action initStatic = recordProjection(
    targetInitialHp,
    StaticDamageMode,
    Set(TargetChoice),
    WInit,
  )

  action doFillTargetChoice = all {
    openHoles == Set(TargetChoice),
    recordProjection(
      qTargetHp,
      qDamageMode,
      Set(AttackRoll),
      WNeedsHoles,
    ),
  }

  action doFillHitAttackRoll = all {
    openHoles == Set(AttackRoll),
    if (qDamageMode == RolledDamageMode)
      recordProjection(
        qTargetHp,
        RolledDamageMode,
        Set(DamageRoll),
        WNeedsHoles,
      )
    else
      recordProjection(
        targetHpAfterStaticPiercingOnly,
        StaticDamageMode,
        Set(),
        WResolved,
      ),
  }

  action doResolveRolledDamage = all {
    qDamageMode == RolledDamageMode,
    openHoles == Set(DamageRoll),
    recordProjection(
      targetHpAfterRolledPiercingOnly,
      RolledDamageMode,
      Set(),
      WResolved,
    ),
  }

  action step = any {
    doFillTargetChoice,
    doFillHitAttackRoll,
    doResolveRolledDamage,
  }
}
