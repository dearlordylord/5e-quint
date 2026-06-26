// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Rules-Glossary.md#Stat Block defines Attack
//   Notation and Damage Notation for monster stat-block attacks.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls applies each
//   specified damage instance to the target's Hit Points.
// - UBIQUITOUS_LANGUAGE.md: Stat Block, Damage Type, Hit Points.
module battleRuntimeStatBlockMultiDamageRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type DamageMode = | RolledDamageMode | StaticDamageMode
  type Hole = | TargetChoice | AttackRoll | DamageRoll

  var qTargetHp: int
  var qDamageMode: DamageMode
  var qProtocol: WitnessProtocol[Hole]
  var qRoute: List[ReducerRouteEvent]

  pure def qHoles: Set[Hole] = qProtocol.holes

  pure val targetInitialHp: int = 12
  pure val targetHpAfterRolledPiercingOnly: int = 10
  pure val targetHpAfterStaticPiercingOnly: int = 9

  action recordProjection(
    targetHp: int,
    damageMode: DamageMode,
    holes: Set[Hole],
    result: WitnessResult,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qTargetHp' = targetHp,
    qDamageMode' = damageMode,
    qProtocol' = { holes: holes, result: result },
    qRoute' = route,
  }

  pure def initialRoute: List[ReducerRouteEvent] = List(
    routeStartBattle(BattleActionEconomyOwner),
    routeDiscoverBattleActs(
      StatBlockActionRouteSubject,
      Set(TargetChoiceHoleKind),
      BattleStatBlockActionOwner,
    ),
  )

  action initRolled = recordProjection(
    targetInitialHp,
    RolledDamageMode,
    Set(TargetChoice),
    WInit,
    initialRoute,
  )

  action initStatic = recordProjection(
    targetInitialHp,
    StaticDamageMode,
    Set(TargetChoice),
    WInit,
    initialRoute,
  )

  action doFillTargetChoice = all {
    qHoles == Set(TargetChoice),
    recordProjection(
      qTargetHp,
      qDamageMode,
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
    if (qDamageMode == RolledDamageMode)
      recordProjection(
        qTargetHp,
        RolledDamageMode,
        Set(DamageRoll),
        WNeedsHoles,
        qRoute.append(
          routeResolveBattleSubject(
            StatBlockActionRouteSubject,
            AttackRollFillKind,
            Set(RolledDiceHoleKind),
            BattleAttackRollOwner,
          )
        ),
      )
    else
      recordProjection(
        targetHpAfterStaticPiercingOnly,
        StaticDamageMode,
        Set(),
        WResolved,
        qRoute.append(
          routeResolveBattleSubject(
            StatBlockActionRouteSubject,
            AttackRollFillKind,
            Set(),
            BattleHitPointOwner,
          )
        ),
      ),
  }

  action doResolveRolledDamage = all {
    qDamageMode == RolledDamageMode,
    qHoles == Set(DamageRoll),
    recordProjection(
      targetHpAfterRolledPiercingOnly,
      RolledDamageMode,
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
    doResolveRolledDamage,
  }
}
