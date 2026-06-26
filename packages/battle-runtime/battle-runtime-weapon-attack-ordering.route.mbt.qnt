// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack orders target
//   choice before resolving an attack roll and hit damage.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls says weapon,
//   spell, and damaging monster abilities specify damage and roll damage dice.
// - UBIQUITOUS_LANGUAGE.md: Attack Roll, Damage Roll, and Hit Points.
module battleRuntimeWeaponAttackOrderingRouteMbt {
  import battleRuntimeWeaponAttackOrdering.* from "./battle-runtime-weapon-attack-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qStage: WeaponAttackFrontierStage
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qLastOrderingError: str
  var qRoute: List[ReducerRouteEvent]

  pure def qHoles: Set[BattleHoleFamilyKind] = qProtocol.holes

  pure val witnessHoleType: BattleHoleFamilyKind = TargetChoiceHoleKind

  pure def witnessProtocolForProjection(
    holes: Set[BattleHoleFamilyKind],
    lastResult: str,
  ): WitnessProtocol[BattleHoleFamilyKind] =
    if (lastResult == "init") witnessInit(witnessHoleType)
    else if (lastResult == "invalid") witnessInvalidWithHoles(holes, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(witnessHoleType)

  pure def orderingErrorLabel(error: WeaponAttackFillOrderingError): str =
    match error {
      | WeaponAttackTargetChoiceRequired => "targetChoiceRequired"
      | WeaponAttackAttackRollRequired => "attackRollRequired"
    }

  pure def rejectedOrderingLabel(result: WeaponAttackFillOrderResult): str =
    match result {
      | WeaponAttackFillAccepted(_) => ""
      | WeaponAttackFillRejected(error) => orderingErrorLabel(error)
      | WeaponAttackFillNotOrderingError(_) => ""
    }

  action recordProjection(
    stage: WeaponAttackFrontierStage,
    lastResult: str,
    lastOrderingError: str,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qStage' = stage,
    qProtocol' = witnessProtocolForProjection(
      weaponAttackHoleFrontier(stage),
      lastResult,
    ),
    qLastOrderingError' = lastOrderingError,
    qRoute' = route,
  }

  action init = recordProjection(
    WeaponAttackActSelectionStage,
    "init",
    "",
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doDiscoverAttack = all {
    qStage == WeaponAttackActSelectionStage,
    recordProjection(
      WeaponAttackTargetChoiceStage,
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

  action doRejectAttackRollBeforeTargetChoice = all {
    qStage == WeaponAttackTargetChoiceStage,
    qStage' = qStage,
    qProtocol' = witnessProtocolForProjection(qHoles, "invalid"),
    qLastOrderingError' =
      rejectedOrderingLabel(
        weaponAttackFillOrderResult(qStage, AttackRollFillKind, false)
      ),
    qRoute' = qRoute.append(
      routeResolveBattleSubject(
        WeaponAttackRouteSubject,
        AttackRollFillKind,
        qHoles,
        BattleHoleFrontierOwner,
      )
    ),
  }

  action doFillTargetChoice = all {
    qStage == WeaponAttackTargetChoiceStage,
    recordProjection(
      WeaponAttackAttackRollStage,
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

  action doRejectDamageBeforeAttackRoll = all {
    qStage == WeaponAttackAttackRollStage,
    qStage' = qStage,
    qProtocol' = witnessProtocolForProjection(qHoles, "invalid"),
    qLastOrderingError' =
      rejectedOrderingLabel(
        weaponAttackFillOrderResult(qStage, RolledDiceFillKind, false)
      ),
    qRoute' = qRoute.append(
      routeResolveBattleSubject(
        WeaponAttackRouteSubject,
        RolledDiceFillKind,
        qHoles,
        BattleHoleFrontierOwner,
      )
    ),
  }

  action doFillAttackRollMiss = all {
    qStage == WeaponAttackAttackRollStage,
    recordProjection(
      WeaponAttackResolvedStage,
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
    qStage == WeaponAttackAttackRollStage,
    recordProjection(
      WeaponAttackDamageDiceStage,
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

  action doFillDamageDice = all {
    qStage == WeaponAttackDamageDiceStage,
    recordProjection(
      WeaponAttackResolvedStage,
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

  action step = any {
    doDiscoverAttack,
    doRejectAttackRollBeforeTargetChoice,
    doFillTargetChoice,
    doRejectDamageBeforeAttackRoll,
    doFillAttackRollMiss,
    doFillAttackRollHit,
    doFillDamageDice,
  }
}
