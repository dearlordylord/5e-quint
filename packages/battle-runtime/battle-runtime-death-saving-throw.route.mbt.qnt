// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Rules-Glossary.md#Death Saving Throw: a player
//   character makes a Death Saving Throw when starting a turn with 0 Hit Points.
// - .references/srd-5.2.1/Playing-the-Game.md#Death Saving Throws defines
//   success/failure counters, natural 1, natural 20, Stable, and death.
// - UBIQUITOUS_LANGUAGE.md: Hit Points and Death.
module battleRuntimeDeathSavingThrowRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | DeathSavingThrow

  type DeathSavingThrowRouteState = {
    currentTurnRole: str,
    targetHp: int,
    targetUnconscious: bool,
    targetStable: bool,
    targetDead: bool,
    targetDeathSuccesses: int,
    targetDeathFailures: int,
    protocol: WitnessProtocol[Hole],
    qRoute: List[ReducerRouteEvent],
  }

  var qState: DeathSavingThrowRouteState

  pure val actorTurnRole: str = "actor"
  pure val targetTurnRole: str = "target"

  pure def qRoute: List[ReducerRouteEvent] = qState.qRoute

  action recordProjection(
    currentTurnRole: str,
    targetHp: int,
    targetUnconscious: bool,
    targetStable: bool,
    targetDead: bool,
    targetDeathSuccesses: int,
    targetDeathFailures: int,
    protocol: WitnessProtocol[Hole],
    route: List[ReducerRouteEvent],
  ): bool = all {
    qState' = {
      currentTurnRole: currentTurnRole,
      targetHp: targetHp,
      targetUnconscious: targetUnconscious,
      targetStable: targetStable,
      targetDead: targetDead,
      targetDeathSuccesses: targetDeathSuccesses,
      targetDeathFailures: targetDeathFailures,
      protocol: protocol,
      qRoute: route,
    },
  }

  action init = recordProjection(
    actorTurnRole,
    0,
    true,
    false,
    false,
    2,
    1,
    witnessInit(DeathSavingThrow),
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doDiscoverEndTurnDeathSavingThrow = all {
    qState.currentTurnRole == actorTurnRole,
    qState.protocol.holes == Set(),
    recordProjection(
      qState.currentTurnRole,
      qState.targetHp,
      qState.targetUnconscious,
      qState.targetStable,
      qState.targetDead,
      qState.targetDeathSuccesses,
      qState.targetDeathFailures,
      witnessNeedsHoles(Set(DeathSavingThrow)),
      qRoute.append(
        routeDiscoverBattleActs(
          DeathSavingThrowRouteSubject,
          Set(DeathSavingThrowHoleKind),
          BattleHitPointAndZeroHpLifecycleOwner,
        )
      ),
    ),
  }

  action doFillDeathSavingThrow = {
    nondet roll = Set(1, 5, 10, 20).oneOf()
    all {
      qState.currentTurnRole == actorTurnRole,
      qState.protocol.holes == Set(DeathSavingThrow),
      if (roll == 1)
        recordProjection(
          targetTurnRole,
          0,
          true,
          false,
          true,
          qState.targetDeathSuccesses,
          3,
          witnessResolved(DeathSavingThrow),
          qRoute.append(
            routeResolveBattleSubject(
              DeathSavingThrowRouteSubject,
              DeathSavingThrowFillKind,
              Set(),
              BattleHitPointAndZeroHpLifecycleOwner,
            )
          ),
        )
      else if (roll == 5)
        recordProjection(
          targetTurnRole,
          0,
          true,
          false,
          false,
          qState.targetDeathSuccesses,
          2,
          witnessResolved(DeathSavingThrow),
          qRoute.append(
            routeResolveBattleSubject(
              DeathSavingThrowRouteSubject,
              DeathSavingThrowFillKind,
              Set(),
              BattleHitPointAndZeroHpLifecycleOwner,
            )
          ),
        )
      else if (roll == 10)
        recordProjection(
          targetTurnRole,
          0,
          true,
          true,
          false,
          0,
          0,
          witnessResolved(DeathSavingThrow),
          qRoute.append(
            routeResolveBattleSubject(
              DeathSavingThrowRouteSubject,
              DeathSavingThrowFillKind,
              Set(),
              BattleHitPointAndZeroHpLifecycleOwner,
            )
          ),
        )
      else if (roll == 20)
        recordProjection(
          targetTurnRole,
          1,
          false,
          false,
          false,
          0,
          0,
          witnessResolved(DeathSavingThrow),
          qRoute.append(
            routeResolveBattleSubject(
              DeathSavingThrowRouteSubject,
              DeathSavingThrowFillKind,
              Set(),
              BattleHitPointAndZeroHpLifecycleOwner,
            )
          ),
        )
      else
        recordProjection(
          qState.currentTurnRole,
          qState.targetHp,
          qState.targetUnconscious,
          qState.targetStable,
          qState.targetDead,
          qState.targetDeathSuccesses,
          qState.targetDeathFailures,
          witnessInvalid(DeathSavingThrow, WInvalidFill),
          qRoute.append(
            routeResolveBattleSubject(
              DeathSavingThrowRouteSubject,
              DeathSavingThrowFillKind,
              Set(DeathSavingThrowHoleKind),
              BattleHitPointAndZeroHpLifecycleOwner,
            )
          ),
        ),
    }
  }

  action doRejectWrongActorEndTurnAfterResolved = all {
    qState.currentTurnRole == targetTurnRole,
    qState.protocol.holes == Set(),
    recordProjection(
      qState.currentTurnRole,
      qState.targetHp,
      qState.targetUnconscious,
      qState.targetStable,
      qState.targetDead,
      qState.targetDeathSuccesses,
      qState.targetDeathFailures,
      witnessInvalid(DeathSavingThrow, WWrongActor),
      qRoute.append(
        routeResolveBattleSubject(
          DeathSavingThrowRouteSubject,
          DeathSavingThrowFillKind,
          Set(),
          BattleHitPointAndZeroHpLifecycleOwner,
        )
      ),
    ),
  }

  action step = any {
    doDiscoverEndTurnDeathSavingThrow,
    doFillDeathSavingThrow,
    doRejectWrongActorEndTurnAfterResolved,
  }
}
