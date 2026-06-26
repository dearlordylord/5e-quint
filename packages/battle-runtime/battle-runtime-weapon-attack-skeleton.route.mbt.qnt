// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack orders target
//   choice, attack roll, and hit damage.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls applies weapon
//   damage to the target's Hit Points.
// - .references/srd-5.2.1/Rules-Glossary.md#Stat Block defines monster
//   Actions and attack notation for stat-block attacks.
// - UBIQUITOUS_LANGUAGE.md: Attack Roll, Hit Points, Multiattack, Stat Block.
module battleRuntimeWeaponAttackSkeletonRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole =
    | TargetChoice
    | AttackRoll
    | DamageRoll

  var qSkeletonHp: int
  var qSkeletonDead: bool
  var qActionAvailable: bool
  var qMultiattackDispatchesAvailable: int
  var qSneakAttackUsedThisTurn: bool
  var qProtocol: WitnessProtocol[Hole]
  var qRoute: List[ReducerRouteEvent]

  pure def qHoles: Set[Hole] = qProtocol.holes

  pure val skeletonInitialHp: int = 13
  pure val rogueAttackModifier: int = 3

  pure def weaponAttackSkeletonRouteHoles(
    holes: Set[Hole],
  ): Set[BattleHoleFamilyKind] =
    (if (holes.contains(TargetChoice)) Set(TargetChoiceHoleKind) else Set())
      .union(if (holes.contains(AttackRoll)) Set(AttackRollHoleKind) else Set())
      .union(if (holes.contains(DamageRoll)) Set(RolledDiceHoleKind) else Set())

  pure def weaponAttackSkeletonProtocolForProjection(
    holes: Set[Hole],
    lastResult: str,
    invalidReason: str,
  ): WitnessProtocol[Hole] =
    if (lastResult == "init") witnessInitWithHoles(holes)
    else if (lastResult == "invalid")
      witnessInvalidWithHoles(
        holes,
        if (invalidReason == "staleSubject") WStaleSubject else WInvalidFill,
      )
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(TargetChoice)

  pure def skeletonHpAfterPiercingWeaponDamage(
    hp: int,
    damageRoll: int,
  ): int = {
    val damage = damageRoll + rogueAttackModifier
    if (hp - damage < 0) 0 else hp - damage
  }

  action recordProjection(
    skeletonHp: int,
    skeletonDead: bool,
    actionAvailable: bool,
    multiattackDispatchesAvailable: int,
    sneakAttackUsedThisTurn: bool,
    holes: Set[Hole],
    lastResult: str,
    invalidReason: str,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSkeletonHp' = skeletonHp,
    qSkeletonDead' = skeletonDead,
    qActionAvailable' = actionAvailable,
    qMultiattackDispatchesAvailable' = multiattackDispatchesAvailable,
    qSneakAttackUsedThisTurn' = sneakAttackUsedThisTurn,
    qProtocol' = weaponAttackSkeletonProtocolForProjection(
      holes,
      lastResult,
      invalidReason,
    ),
    qRoute' = route,
  }

  action init = recordProjection(
    skeletonInitialHp,
    false,
    true,
    0,
    false,
    Set(TargetChoice),
    "init",
    "",
    List(
      routeStartBattle(BattleActionEconomyOwner),
      routeDiscoverBattleActs(
        WeaponAttackRouteSubject,
        Set(TargetChoiceHoleKind),
        BattleActionEconomyOwner,
      ),
    ),
  )

  action doDiscoverAttack = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    recordProjection(
      qSkeletonHp,
      qSkeletonDead,
      qActionAvailable,
      qMultiattackDispatchesAvailable,
      qSneakAttackUsedThisTurn,
      Set(TargetChoice),
      "needsHoles",
      "",
      qRoute.append(
        routeDiscoverBattleActs(
          WeaponAttackRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleActionEconomyOwner,
        )
      ),
    ),
  }

  action doFillTarget = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    recordProjection(
      qSkeletonHp,
      qSkeletonDead,
      qActionAvailable,
      qMultiattackDispatchesAvailable,
      qSneakAttackUsedThisTurn,
      Set(AttackRoll),
      "needsHoles",
      "",
      qRoute.append(
        routeResolveBattleSubject(
          WeaponAttackRouteSubject,
          TargetChoiceFillKind,
          Set(AttackRollHoleKind),
          BattleTargetSelectionOwner,
        )
      ),
    ),
  }

  action doRejectWrongTarget = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    recordProjection(
      qSkeletonHp,
      qSkeletonDead,
      qActionAvailable,
      qMultiattackDispatchesAvailable,
      qSneakAttackUsedThisTurn,
      qHoles,
      "invalid",
      "invalidFill",
      qRoute.append(
        routeResolveBattleSubject(
          WeaponAttackRouteSubject,
          TargetChoiceFillKind,
          weaponAttackSkeletonRouteHoles(qHoles),
          BattleTargetSelectionOwner,
        )
      ),
    ),
  }

  action doFillAttackRollMiss = all {
    qActionAvailable,
    qHoles == Set(AttackRoll),
    recordProjection(
      qSkeletonHp,
      qSkeletonDead,
      false,
      qMultiattackDispatchesAvailable,
      qSneakAttackUsedThisTurn,
      Set(),
      "resolved",
      "",
      qRoute.append(
        routeResolveBattleSubject(
          WeaponAttackRouteSubject,
          AttackRollFillKind,
          Set(),
          BattleAttackRollOwner,
        )
      ),
    ),
  }

  action doFillAttackRollHit = all {
    qActionAvailable,
    qHoles == Set(AttackRoll),
    recordProjection(
      qSkeletonHp,
      qSkeletonDead,
      qActionAvailable,
      qMultiattackDispatchesAvailable,
      qSneakAttackUsedThisTurn,
      Set(DamageRoll),
      "needsHoles",
      "",
      qRoute.append(
        routeResolveBattleSubject(
          WeaponAttackRouteSubject,
          AttackRollFillKind,
          Set(RolledDiceHoleKind),
          BattleAttackRollOwner,
        )
      ),
    ),
  }

  action doFillDamageLow = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    recordProjection(
      skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 2),
      skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 2) == 0,
      false,
      qMultiattackDispatchesAvailable,
      qSneakAttackUsedThisTurn,
      Set(),
      "resolved",
      "",
      qRoute.append(
        routeResolveBattleSubject(
          WeaponAttackRouteSubject,
          RolledDiceFillKind,
          Set(),
          BattleHitPointOwner,
        )
      ),
    ),
  }

  action doFillDamageHigh = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    recordProjection(
      skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4),
      skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4) == 0,
      false,
      qMultiattackDispatchesAvailable,
      qSneakAttackUsedThisTurn,
      Set(),
      "resolved",
      "",
      qRoute.append(
        routeResolveBattleSubject(
          WeaponAttackRouteSubject,
          RolledDiceFillKind,
          Set(),
          BattleHitPointOwner,
        )
      ),
    ),
  }

  action doFillDamageLowSneakAttack = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    not(qSneakAttackUsedThisTurn),
    recordProjection(
      skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4),
      skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 4) == 0,
      false,
      qMultiattackDispatchesAvailable,
      true,
      Set(),
      "resolved",
      "",
      qRoute.append(
        routeResolveBattleSubject(
          WeaponAttackRouteSubject,
          RolledDiceFillKind,
          Set(),
          BattleHitPointOwner,
        )
      ),
    ),
  }

  action doFillDamageHighSneakAttack = all {
    qActionAvailable,
    qHoles == Set(DamageRoll),
    not(qSneakAttackUsedThisTurn),
    recordProjection(
      skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 8),
      skeletonHpAfterPiercingWeaponDamage(qSkeletonHp, 8) == 0,
      false,
      qMultiattackDispatchesAvailable,
      true,
      Set(),
      "resolved",
      "",
      qRoute.append(
        routeResolveBattleSubject(
          WeaponAttackRouteSubject,
          RolledDiceFillKind,
          Set(),
          BattleHitPointOwner,
        )
      ),
    ),
  }

  action doRejectStaleAfterResolved = all {
    not(qActionAvailable),
    qHoles == Set(),
    recordProjection(
      qSkeletonHp,
      qSkeletonDead,
      qActionAvailable,
      qMultiattackDispatchesAvailable,
      qSneakAttackUsedThisTurn,
      qHoles,
      "invalid",
      "staleSubject",
      qRoute.append(
        routeResolveBattleSubjectWithoutFill(
          WeaponAttackRouteSubject,
          Set(),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doStartSkeletonTurn = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    recordProjection(
      qSkeletonHp,
      qSkeletonDead,
      true,
      0,
      qSneakAttackUsedThisTurn,
      Set(),
      "resolved",
      "",
      qRoute.append(
        routeResolveBattleSubjectWithoutFill(
          BattleActionRouteSubject,
          Set(),
          BattleActionEconomyOwner,
        )
      ),
    ),
  }

  action doResolveSkeletonMultiattack = all {
    qActionAvailable,
    qHoles == Set(),
    qMultiattackDispatchesAvailable == 0,
    recordProjection(
      qSkeletonHp,
      qSkeletonDead,
      false,
      1,
      qSneakAttackUsedThisTurn,
      Set(),
      "resolved",
      "",
      qRoute.append(
        routeResolveBattleSubjectWithoutFill(
          StatBlockActionRouteSubject,
          Set(),
          BattleStatBlockActionOwner,
        )
      ),
    ),
  }

  action doRejectRecursiveSkeletonMultiattack = all {
    not(qActionAvailable),
    qHoles == Set(),
    qMultiattackDispatchesAvailable > 0,
    recordProjection(
      qSkeletonHp,
      qSkeletonDead,
      qActionAvailable,
      qMultiattackDispatchesAvailable,
      qSneakAttackUsedThisTurn,
      qHoles,
      "invalid",
      "staleSubject",
      qRoute.append(
        routeResolveBattleSubjectWithoutFill(
          StatBlockActionRouteSubject,
          Set(),
          BattleStatBlockActionOwner,
        )
      ),
    ),
  }

  pure def skeletonMultiattackDispatchRoute(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(
        routeDiscoverBattleActs(
          StatBlockActionRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleStatBlockActionOwner,
        )
      )
      .append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          TargetChoiceFillKind,
          Set(AttackRollHoleKind),
          BattleTargetSelectionOwner,
        )
      )
      .append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          AttackRollFillKind,
          Set(),
          BattleAttackRollOwner,
        )
      )

  action doSpendSkeletonMultiattackDispatch = all {
    not(qActionAvailable),
    qHoles == Set(),
    qMultiattackDispatchesAvailable > 0,
    recordProjection(
      qSkeletonHp,
      qSkeletonDead,
      qActionAvailable,
      qMultiattackDispatchesAvailable - 1,
      qSneakAttackUsedThisTurn,
      Set(),
      "resolved",
      "",
      skeletonMultiattackDispatchRoute(qRoute),
    ),
  }

  action step = any {
    doDiscoverAttack,
    doFillTarget,
    doRejectWrongTarget,
    doFillAttackRollMiss,
    doFillAttackRollHit,
    doFillDamageLow,
    doFillDamageHigh,
    doFillDamageLowSneakAttack,
    doFillDamageHighSneakAttack,
    doRejectStaleAfterResolved,
    doStartSkeletonTurn,
    doResolveSkeletonMultiattack,
    doRejectRecursiveSkeletonMultiattack,
    doSpendSkeletonMultiattackDispatch,
  }
}
