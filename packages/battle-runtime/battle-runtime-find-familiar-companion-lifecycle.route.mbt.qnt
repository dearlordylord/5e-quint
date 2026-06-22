// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Find Familiar defines
//   familiar form admission, one-familiar replacement, telepathic connection,
//   Bonus Action shared senses, Touch spell delivery through the familiar's
//   Reaction, and independent combat turns.
// - .references/srd-5.2.1/Classes/Warlock.md#Pact of the Chain lets the owner
//   forgo one Attack-action attack so the familiar makes one attack with its
//   Reaction.
// - UBIQUITOUS_LANGUAGE.md: Companion, Companion Control, Table Decision,
//   Spell Invocation, Bonus Action, Reaction, Attack Roll, and Hit Points.
module battleRuntimeFindFamiliarCompanionLifecycleRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type FindFamiliarCompanionLifecycleRouteSurface =
    | FreshCompanionRouteSurface
    | FamiliarCreationRouteSurface
    | FamiliarReplacementRouteSurface
    | FamiliarSharedSensesRouteSurface
    | FamiliarTouchDeliveryRouteSurface
    | PactFamiliarAttackRouteSurface

  var qSurface: FindFamiliarCompanionLifecycleRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def routeCompanionLifecycle(): List[ReducerRouteEvent] =
    List(
      startRoute,
      routeDiscoverBattleActs(
        CompanionLifecycleRouteSubject,
        Set(),
        BattleCompanionOwner,
      ),
      routeResolveBattleSubjectWithoutFill(
        CompanionLifecycleRouteSubject,
        Set(),
        BattleCompanionOwner,
      ),
    )

  action recordSurface(
    surface: FindFamiliarCompanionLifecycleRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshCompanionRouteSurface, List(startRoute))

  action doRouteFamiliarCreation = all {
    qSurface == FreshCompanionRouteSurface,
    recordSurface(FamiliarCreationRouteSurface, routeCompanionLifecycle),
  }

  action doRouteFamiliarReplacement = all {
    qSurface == FreshCompanionRouteSurface,
    recordSurface(FamiliarReplacementRouteSurface, routeCompanionLifecycle),
  }

  action doRouteSharedSenses = all {
    qSurface == FreshCompanionRouteSurface,
    recordSurface(
      FamiliarSharedSensesRouteSurface,
      List(
        startRoute,
        routeDiscoverBattleActs(
          CompanionSharedSensesRouteSubject,
          Set(),
          BattleCompanionOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          CompanionSharedSensesRouteSubject,
          Set(),
          BattleActionEconomyOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          CompanionSharedSensesRouteSubject,
          Set(),
          BattleActiveEffectOwner,
        ),
      ),
    ),
  }

  action doRouteTouchDelivery = all {
    qSurface == FreshCompanionRouteSurface,
    recordSurface(
      FamiliarTouchDeliveryRouteSurface,
      List(
        startRoute,
        routeDiscoverBattleActs(
          CompanionTouchDeliveryRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        ),
        routeResolveBattleSubject(
          CompanionTouchDeliveryRouteSubject,
          TargetChoiceFillKind,
          Set(RolledDiceHoleKind),
          BattleCompanionOwner,
        ),
        routeResolveBattleSubject(
          CompanionTouchDeliveryRouteSubject,
          RolledDiceFillKind,
          Set(),
          BattleSpellSlotAndActionEconomyOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          CompanionTouchDeliveryRouteSubject,
          Set(),
          BattleActionEconomyOwner,
        ),
      ),
    ),
  }

  action doRoutePactFamiliarAttack = all {
    qSurface == FreshCompanionRouteSurface,
    recordSurface(
      PactFamiliarAttackRouteSurface,
      List(
        startRoute,
        routeDiscoverBattleActs(
          CompanionReactionAttackRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleCompanionOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          CompanionReactionAttackRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleStatBlockActionOwner,
        ),
        routeResolveBattleSubject(
          CompanionReactionAttackRouteSubject,
          TargetChoiceFillKind,
          Set(AttackRollHoleKind),
          BattleTargetSelectionOwner,
        ),
        routeResolveBattleSubject(
          CompanionReactionAttackRouteSubject,
          AttackRollFillKind,
          Set(RolledDiceHoleKind),
          BattleAttackRollOwner,
        ),
        routeResolveBattleSubject(
          CompanionReactionAttackRouteSubject,
          RolledDiceFillKind,
          Set(),
          BattleHitPointOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          CompanionReactionAttackRouteSubject,
          Set(),
          BattleActionEconomyOwner,
        ),
      ),
    ),
  }

  action step = any {
    doRouteFamiliarCreation,
    doRouteFamiliarReplacement,
    doRouteSharedSenses,
    doRouteTouchDelivery,
    doRoutePactFamiliarAttack,
  }
}
