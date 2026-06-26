// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Longstrider: a target's
//   Speed increases by 10 feet for the duration.
// - .references/srd-5.2.1/Rules-Glossary.md#Speed: Speed is a creature-owned
//   movement capacity affected by temporary effects.
// - UBIQUITOUS_LANGUAGE.md: Speed, Spell Invocation, and Spell Effect.
module battleRuntimeScalarBuffRouteMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type Hole =
    | TargetChoice

  type ScalarBuffWitnessState = {
    casterSpeed: int,
    targetSpeed: int,
    actionAvailable: bool,
    protocol: WitnessProtocol[Hole],
    qRoute: List[ReducerRouteEvent],
  }

  var qState: ScalarBuffWitnessState

  pure def qRoute: List[ReducerRouteEvent] = qState.qRoute

  action init = all {
    qState' = {
      casterSpeed: 30,
      targetSpeed: 30,
      actionAvailable: true,
      protocol: witnessInitWithHoles(Set(TargetChoice)),
      qRoute: List(
        routeStartBattle(BattleActionEconomyOwner),
        routeDiscoverBattleActs(
          ScalarBuffEffectRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        ),
      ),
    },
  }

  action doFillLongstriderTarget = all {
    qState.actionAvailable,
    qState.protocol.holes == Set(TargetChoice),
    qState' = {
      casterSpeed: 30,
      targetSpeed: 40,
      actionAvailable: false,
      protocol: witnessResolved(TargetChoice),
      qRoute: qRoute.append(
        routeResolveBattleSubject(
          ScalarBuffEffectRouteSubject,
          TargetChoiceFillKind,
          Set(),
          BattleActiveEffectOwner,
        )
      ),
    },
  }

  action doRejectStaleAfterResolved = all {
    not(qState.actionAvailable),
    qState.protocol.holes == Set(),
    qState' = qState
      .with("protocol", witnessInvalid(TargetChoice, WStaleSubject))
      .with(
        "qRoute",
        qRoute.append(
          routeResolveBattleSubject(
            ScalarBuffEffectRouteSubject,
            TargetChoiceFillKind,
            Set(),
            BattleHoleFrontierOwner,
          )
        )
      )
  }

  action step = any {
    doFillLongstriderTarget,
    doRejectStaleAfterResolved,
  }
}
