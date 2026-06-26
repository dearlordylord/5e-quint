// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Rules-Glossary.md#Stat Block defines monster
//   Attack Notation, including what happens on a hit.
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack allows attacks
//   to cause special effects in addition to damage.
// - UBIQUITOUS_LANGUAGE.md: Stat Block, Condition, Size, Hit Points.
module battleRuntimeStatBlockSizeGatedConditionRiderRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
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
  var qRoute: List[ReducerRouteEvent]

  pure def qHoles: Set[Hole] = qProtocol.holes

  pure val targetInitialHp: int = 20
  pure val targetHpAfterBiteDamage: int = 17

  pure def initialRoute: List[ReducerRouteEvent] = List(
    routeStartBattle(BattleActionEconomyOwner),
    routeDiscoverBattleActs(
      StatBlockActionRouteSubject,
      Set(TargetChoiceHoleKind),
      BattleStatBlockActionOwner,
    ),
  )

  action recordProjection(
    targetHp: int,
    targetProne: bool,
    targetSizeGate: TargetSizeGate,
    holes: Set[Hole],
    result: WitnessResult,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qTargetHp' = targetHp,
    qTargetProne' = targetProne,
    qTargetSizeGate' = targetSizeGate,
    qProtocol' = { holes: holes, result: result },
    qRoute' = route,
  }

  action initMediumOrSmallerTarget = recordProjection(
    targetInitialHp,
    false,
    MediumOrSmallerTarget,
    Set(TargetChoice),
    WInit,
    initialRoute,
  )

  action initLargerTarget = recordProjection(
    targetInitialHp,
    false,
    LargerTarget,
    Set(TargetChoice),
    WInit,
    initialRoute,
  )

  action initMediumOrSmallerProneImmuneTarget = recordProjection(
    targetInitialHp,
    false,
    MediumOrSmallerProneImmuneTarget,
    Set(TargetChoice),
    WInit,
    initialRoute,
  )

  action doFillTargetChoice = all {
    qHoles == Set(TargetChoice),
    recordProjection(
      qTargetHp,
      qTargetProne,
      qTargetSizeGate,
      Set(AttackRoll),
      WNeedsHoles,
      qRoute.append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          TargetChoiceFillKind,
          Set(AttackRollHoleKind),
          BattleTargetSelectionOwner,
        )
      ),
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
      qRoute.append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          AttackRollFillKind,
          Set(RolledDiceHoleKind),
          BattleConditionLifecycleOwner,
        )
      ),
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
      qRoute.append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          RolledDiceFillKind,
          Set(),
          BattleHitPointOwner,
        )
      ),
    ),
  }

  action step = any {
    doFillTargetChoice,
    doFillHitAttackRoll,
    doResolveDamage,
  }
}
