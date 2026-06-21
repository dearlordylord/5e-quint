// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

module battleRuntimeMagicMissileRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeMagicMissileFacts.* from "./battle-runtime-magic-missile-facts"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole =
    | SpellTargetAllocation
    | SpellDamageRoll

  type MagicMissileRouteState = {
    qSkeletonHp: int,
    qSkeletonDead: bool,
    qActionAvailable: bool,
    qMultiattackDispatchesAvailable: int,
    qSneakAttackUsedThisTurn: bool,
    protocol: WitnessProtocol[Hole],
    qRoute: List[ReducerRouteEvent],
  }

  var qState: MagicMissileRouteState

  pure def qSkeletonHp: int = qState.qSkeletonHp
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qHoles: Set[Hole] = qState.protocol.holes
  pure def qRoute: List[ReducerRouteEvent] = qState.qRoute

  pure def magicMissileProtocol(
    holes: Set[Hole],
    result: WitnessResult,
  ): WitnessProtocol[Hole] = {
    holes: holes,
    result: result,
  }

  action recordMagicMissileRouteState(
    skeletonHp: int,
    skeletonDead: bool,
    actionAvailable: bool,
    multiattackDispatchesAvailable: int,
    sneakAttackUsedThisTurn: bool,
    holes: Set[Hole],
    result: WitnessResult,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qState' = {
      qSkeletonHp: skeletonHp,
      qSkeletonDead: skeletonDead,
      qActionAvailable: actionAvailable,
      qMultiattackDispatchesAvailable: multiattackDispatchesAvailable,
      qSneakAttackUsedThisTurn: sneakAttackUsedThisTurn,
      protocol: magicMissileProtocol(holes, result),
      qRoute: route,
    },
  }

  action init = recordMagicMissileRouteState(
    skeletonInitialHp,
    false,
    true,
    0,
    false,
    Set(SpellTargetAllocation),
    WInit,
    List(
      routeStartBattle(BattleActionEconomyOwner),
      routeDiscoverBattleActs(
        SlotSpellRouteSubject,
        Set(SpellTargetAllocationHoleKind),
        BattleSpellSlotAndActionEconomyOwner,
      ),
    ),
  )

  action doFillMagicMissileAllocation = all {
    qActionAvailable,
    qHoles == Set(SpellTargetAllocation),
    recordMagicMissileRouteState(
      qSkeletonHp,
      qState.qSkeletonDead,
      qActionAvailable,
      qState.qMultiattackDispatchesAvailable,
      qState.qSneakAttackUsedThisTurn,
      Set(SpellDamageRoll),
      WNeedsHoles,
      qRoute.append(
        routeResolveBattleSubject(
          SlotSpellRouteSubject,
          SpellTargetAllocationFillKind,
          Set(RolledDiceHoleKind),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillMagicMissileDamage = {
    nondet dartRollTotal = Set(3, 12).oneOf()
    all {
      qActionAvailable,
      qHoles == Set(SpellDamageRoll),
      recordMagicMissileRouteState(
        skeletonHpAfterMagicMissileDamage(qSkeletonHp, dartRollTotal),
        skeletonHpAfterMagicMissileDamage(qSkeletonHp, dartRollTotal) == 0,
        false,
        qState.qMultiattackDispatchesAvailable,
        qState.qSneakAttackUsedThisTurn,
        Set(),
        WResolved,
        qRoute.append(
          routeResolveBattleSubject(
            SlotSpellRouteSubject,
            RolledDiceFillKind,
            Set(),
            BattleHitPointOwner,
          )
        ),
      ),
    }
  }

  action step = any {
    doFillMagicMissileAllocation,
    doFillMagicMissileDamage,
  }
}
