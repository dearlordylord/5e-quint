// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Eldritch Blast
//   targets one creature or object, creates two beams at level 5, allows the
//   same or different targets, and requires a separate attack roll for each
//   beam.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Targets and
//   #Attack Rolls define spell target choice and spell attack modifiers.
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack and
//   #Damage Rolls define target, attack roll, hit, and damage order.
// - .references/srd-5.2.1/Rules-Glossary.md#Breaking Objects defines object
//   Armor Class and Hit Point facts as table boundary facts for object targets.
// - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Spell Attack, Table Decision,
//   Attack Roll, Damage, Resolve, Apply, and Advance.
module battleRuntimeEldritchBlastRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type IndependentSpellAttackSequenceOutcome =
    | AwaitingTargetChoices
    | AwaitingFirstAttack
    | AwaitingFirstDamage
    | AwaitingSecondAttack
    | AwaitingSecondDamage
    | SequenceComplete
    | StaleReplayRejected

  type IndependentSpellAttackSequenceRouteState = {
    qScenarioOutcome: IndependentSpellAttackSequenceOutcome,
    qRoute: List[ReducerRouteEvent],
  }

  var qState: IndependentSpellAttackSequenceRouteState

  pure def qRoute: List[ReducerRouteEvent] = qState.qRoute
  pure def qScenarioOutcome: IndependentSpellAttackSequenceOutcome =
    qState.qScenarioOutcome

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val attackRollHoles: Set[BattleHoleFamilyKind] =
    Set(AttackRollHoleKind)
  pure val rolledDiceHoles: Set[BattleHoleFamilyKind] =
    Set(RolledDiceHoleKind)

  pure def initialIndependentSpellAttackSequenceRoute:
    List[ReducerRouteEvent] =
    List(
      routeStartBattle(BattleActionEconomyOwner),
      routeDiscoverBattleActs(
        SpellAttackProcedureRouteSubject,
        targetChoiceHoles,
        BattleActionEconomyOwner,
      ),
      routeDiscoverBattleActs(
        SpellAttackProcedureRouteSubject,
        noHoles,
        BattleObjectTargetBoundaryOwner,
      ),
    )

  pure def appendTargetProcedureRoute(
    route: List[ReducerRouteEvent],
    holes: Set[BattleHoleFamilyKind],
  ): List[ReducerRouteEvent] =
    route
      .append(
        routeResolveBattleSubject(
          SpellAttackProcedureRouteSubject,
          TargetChoiceFillKind,
          holes,
          BattleTargetSelectionOwner,
        )
      )
      .append(
        routeResolveBattleSubject(
          SpellAttackProcedureRouteSubject,
          TargetChoiceFillKind,
          holes,
          BattleSpellAttackProcedureOwner,
        )
      )

  pure def appendAttackProcedureRoute(
    route: List[ReducerRouteEvent],
    holes: Set[BattleHoleFamilyKind],
  ): List[ReducerRouteEvent] =
    route
      .append(
        routeResolveBattleSubject(
          SpellAttackProcedureRouteSubject,
          AttackRollFillKind,
          holes,
          BattleAttackRollOwner,
        )
      )
      .append(
        routeResolveBattleSubject(
          SpellAttackProcedureRouteSubject,
          AttackRollFillKind,
          holes,
          BattleSpellAttackProcedureOwner,
        )
      )

  pure def appendDamageProcedureRoute(
    route: List[ReducerRouteEvent],
    holes: Set[BattleHoleFamilyKind],
  ): List[ReducerRouteEvent] =
    route
      .append(
        routeResolveBattleSubject(
          SpellAttackProcedureRouteSubject,
          RolledDiceFillKind,
          holes,
          BattleHitPointOwner,
        )
      )
      .append(
        routeResolveBattleSubject(
          SpellAttackProcedureRouteSubject,
          RolledDiceFillKind,
          holes,
          BattleSpellAttackProcedureOwner,
        )
      )

  action recordIndependentSpellAttackSequenceRoute(
    scenarioOutcome: IndependentSpellAttackSequenceOutcome,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qState' = {
      qScenarioOutcome: scenarioOutcome,
      qRoute: route,
    },
  }

  action init = recordIndependentSpellAttackSequenceRoute(
    AwaitingTargetChoices,
    initialIndependentSpellAttackSequenceRoute,
  )

  action doFillTwoCreatureTargets = all {
    qScenarioOutcome == AwaitingTargetChoices,
    recordIndependentSpellAttackSequenceRoute(
      AwaitingFirstAttack,
      appendTargetProcedureRoute(qRoute, attackRollHoles),
    ),
  }

  action doFillFirstAttackMiss = all {
    qScenarioOutcome == AwaitingFirstAttack,
    recordIndependentSpellAttackSequenceRoute(
      AwaitingSecondAttack,
      appendAttackProcedureRoute(qRoute, attackRollHoles),
    ),
  }

  action doFillFirstAttackHit = all {
    qScenarioOutcome == AwaitingFirstAttack,
    recordIndependentSpellAttackSequenceRoute(
      AwaitingFirstDamage,
      appendAttackProcedureRoute(qRoute, rolledDiceHoles),
    ),
  }

  action doFillFirstDamageLow = all {
    qScenarioOutcome == AwaitingFirstDamage,
    recordIndependentSpellAttackSequenceRoute(
      AwaitingSecondAttack,
      appendDamageProcedureRoute(qRoute, attackRollHoles),
    ),
  }

  action doFillSecondAttackMiss = all {
    qScenarioOutcome == AwaitingSecondAttack,
    recordIndependentSpellAttackSequenceRoute(
      SequenceComplete,
      appendAttackProcedureRoute(qRoute, noHoles),
    ),
  }

  action doFillSecondAttackHit = all {
    qScenarioOutcome == AwaitingSecondAttack,
    recordIndependentSpellAttackSequenceRoute(
      AwaitingSecondDamage,
      appendAttackProcedureRoute(qRoute, rolledDiceHoles),
    ),
  }

  action doFillSecondDamageLow = all {
    qScenarioOutcome == AwaitingSecondDamage,
    recordIndependentSpellAttackSequenceRoute(
      SequenceComplete,
      appendDamageProcedureRoute(qRoute, noHoles),
    ),
  }

  action doRejectStaleAfterResolved = all {
    qScenarioOutcome == SequenceComplete,
    recordIndependentSpellAttackSequenceRoute(
      StaleReplayRejected,
      qRoute.append(
        routeResolveBattleSubjectWithoutFill(
          SpellAttackProcedureRouteSubject,
          noHoles,
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action step = any {
    doFillTwoCreatureTargets,
    doFillFirstAttackMiss,
    doFillFirstAttackHit,
    doFillFirstDamageLow,
    doFillSecondAttackMiss,
    doFillSecondAttackHit,
    doFillSecondDamageLow,
    doRejectStaleAfterResolved,
  }
}
