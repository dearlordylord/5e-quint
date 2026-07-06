// -*- mode: Bluespec; -*-

module battleRuntimeHealingStabilizationSelectedIdentityMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type HealingStabilizationSelectedIdentityScenarioOutcome = | Init | Resolved

  type HealingStabilizationSelectedIdentityWitnessState = {
    qTargetHp: int,
    qTargetTemporaryHp: int,
    qTargetStable: bool,
    qTargetUnconscious: bool,
    qTargetDead: bool,
    qTargetDeathSuccesses: int,
    qTargetDeathFailures: int,
    qActionAvailable: bool,
    qScenarioOutcome: HealingStabilizationSelectedIdentityScenarioOutcome,
    qRoute: List[ReducerRouteEvent],
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: HealingStabilizationSelectedIdentityWitnessState

  pure def qTargetHp: int = qState.qTargetHp
  pure def qTargetTemporaryHp: int = qState.qTargetTemporaryHp
  pure def qTargetStable: bool = qState.qTargetStable
  pure def qTargetUnconscious: bool = qState.qTargetUnconscious
  pure def qTargetDead: bool = qState.qTargetDead
  pure def qTargetDeathSuccesses: int = qState.qTargetDeathSuccesses
  pure def qTargetDeathFailures: int = qState.qTargetDeathFailures
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def scenarioOutcome: HealingStabilizationSelectedIdentityScenarioOutcome = qState.qScenarioOutcome
  pure def qRoute: List[ReducerRouteEvent] = qState.qRoute

  pure def healingStabilizationSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: HealingStabilizationSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(
    targetHp: int,
    targetTemporaryHp: int,
    targetStable: bool,
    targetUnconscious: bool,
    targetDead: bool,
    targetDeathSuccesses: int,
    targetDeathFailures: int,
    actionAvailable: bool,
    lastResult: HealingStabilizationSelectedIdentityScenarioOutcome,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qState' = {
      qTargetHp: targetHp,
      qTargetTemporaryHp: targetTemporaryHp,
      qTargetStable: targetStable,
      qTargetUnconscious: targetUnconscious,
      qTargetDead: targetDead,
      qTargetDeathSuccesses: targetDeathSuccesses,
      qTargetDeathFailures: targetDeathFailures,
      qActionAvailable: actionAvailable,
      qScenarioOutcome: lastResult,
      qRoute: route,
      protocol: healingStabilizationSelectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(
    0,
    3,
    false,
    true,
    false,
    2,
    1,
    true,
    Init,
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doResolveSpareTheDyingStable = all {
    scenarioOutcome == Init,
    recordProjection(
      0,
      qTargetTemporaryHp,
      true,
      true,
      false,
      0,
      0,
      false,
      Resolved,
      qRoute
        .append(
          routeDiscoverBattleActs(
            ZeroHitPointStabilizationRouteSubject,
            Set(TargetChoiceHoleKind),
            BattleActionEconomyOwner,
          )
        )
        .append(
          routeResolveBattleSubject(
            ZeroHitPointStabilizationRouteSubject,
            TargetChoiceFillKind,
            Set(),
            BattleHitPointAndZeroHpLifecycleOwner,
          )
        ),
    ),
  }

  action step = any {
    doResolveSpareTheDyingStable,
  }
}
