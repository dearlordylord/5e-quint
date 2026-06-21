// -*- mode: Bluespec; -*-

module battleRuntimeMagicMissileMbt {
  import battleRuntimeMagicMissileFacts.* from "./battle-runtime-magic-missile-facts"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Self-contained literal projection witness for the Magic Missile selected
  // identity replay. The fixed target has no Force resistance or immunity, so
  // the SRD dart total plus three darts is the effective damage.
  type Hole =
    | SpellTargetAllocation
    | SpellDamageRoll

  type MagicMissileWitnessState = {
    qSkeletonHp: int,
    qSkeletonDead: bool,
    qActionAvailable: bool,
    qMultiattackDispatchesAvailable: int,
    qSneakAttackUsedThisTurn: bool,
    protocol: WitnessProtocol[Hole],
  }

  var qState: MagicMissileWitnessState

  pure def qSkeletonHp: int = qState.qSkeletonHp
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def openHoles: Set[Hole] = qState.protocol.holes

  pure def magicMissileProtocol(
    holes: Set[Hole],
    result: WitnessResult,
  ): WitnessProtocol[Hole] = {
    holes: holes,
    result: result,
  }

  action recordMagicMissileState(
    skeletonHp: int,
    skeletonDead: bool,
    actionAvailable: bool,
    multiattackDispatchesAvailable: int,
    sneakAttackUsedThisTurn: bool,
    holes: Set[Hole],
    result: WitnessResult,
  ): bool = all {
    qState' = {
      qSkeletonHp: skeletonHp,
      qSkeletonDead: skeletonDead,
      qActionAvailable: actionAvailable,
      qMultiattackDispatchesAvailable: multiattackDispatchesAvailable,
      qSneakAttackUsedThisTurn: sneakAttackUsedThisTurn,
      protocol: magicMissileProtocol(holes, result),
    },
  }

  action init = recordMagicMissileState(
    skeletonInitialHp,
    false,
    true,
    0,
    false,
    Set(SpellTargetAllocation),
    WInit,
  )

  action doFillMagicMissileAllocation = all {
    qActionAvailable,
    openHoles == Set(SpellTargetAllocation),
    recordMagicMissileState(
      qSkeletonHp,
      qState.qSkeletonDead,
      qActionAvailable,
      qState.qMultiattackDispatchesAvailable,
      qState.qSneakAttackUsedThisTurn,
      Set(SpellDamageRoll),
      WNeedsHoles,
    ),
  }

  action doFillMagicMissileDamage = {
    // Samples the existing low/high dart-roll totals: three 1s and three 4s.
    nondet dartRollTotal = Set(3, 12).oneOf()
    all {
      qActionAvailable,
      openHoles == Set(SpellDamageRoll),
      recordMagicMissileState(
        skeletonHpAfterMagicMissileDamage(qSkeletonHp, dartRollTotal),
        skeletonHpAfterMagicMissileDamage(qSkeletonHp, dartRollTotal) == 0,
        false,
        qState.qMultiattackDispatchesAvailable,
        qState.qSneakAttackUsedThisTurn,
        Set(),
        WResolved,
      ),
    }
  }

  action step = any {
    doFillMagicMissileAllocation,
    doFillMagicMissileDamage,
  }
}
