// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Chromatic Orb defines
//   damage-type choice, ranged Spell Attack, duplicate-d8 leap admission,
//   higher-slot leap cap, and one target per casting.
// - .references/srd-5.2.1/Rules-Glossary.md#Attack Roll, #Damage Roll,
//   #Damage Types, and #Spell Attack define the generic roll and damage
//   vocabulary used by this route.
// - UBIQUITOUS_LANGUAGE.md: Attack Roll, Damage, Damage Type, Resolve, Apply,
//   and Advance.
module battleRuntimeChainedAttackSequenceRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type ChainedAttackProcedureOutcome =
    | Init
    | AwaitingDamageType
    | AwaitingInitialTarget
    | AwaitingStep0Attack
    | AwaitingStep0Damage
    | Step0NoLeapComplete
    | AwaitingFirstLeapTarget
    | AwaitingStep1Attack
    | AwaitingStep1Damage
    | Slot1LeapLimitComplete
    | AwaitingSecondLeapTarget

  type ChainedAttackProcedureRouteState = {
    qSlotLevel: int,
    qScenarioOutcome: ChainedAttackProcedureOutcome,
    qRoute: List[ReducerRouteEvent],
  }

  var qState: ChainedAttackProcedureRouteState

  pure def qRoute: List[ReducerRouteEvent] = qState.qRoute
  pure def qSlotLevel: int = qState.qSlotLevel
  pure def qScenarioOutcome: ChainedAttackProcedureOutcome =
    qState.qScenarioOutcome

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val damageTypeChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(DamageTypeChoiceHoleKind)
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val attackRollHoles: Set[BattleHoleFamilyKind] =
    Set(AttackRollHoleKind)
  pure val rolledDiceHoles: Set[BattleHoleFamilyKind] =
    Set(RolledDiceHoleKind)

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

  action recordChainedAttackProcedureRoute(
    slotLevel: int,
    scenarioOutcome: ChainedAttackProcedureOutcome,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qState' = {
      qSlotLevel: slotLevel,
      qScenarioOutcome: scenarioOutcome,
      qRoute: route,
    },
  }

  action init = recordChainedAttackProcedureRoute(
    0,
    Init,
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doStartCast = {
    nondet slotLevel = 1.to(2).oneOf()
    all {
      qScenarioOutcome == Init,
      recordChainedAttackProcedureRoute(
        slotLevel,
        AwaitingDamageType,
        qRoute.append(
          routeDiscoverBattleActs(
            SpellAttackProcedureRouteSubject,
            damageTypeChoiceHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        ),
      ),
    }
  }

  action doChooseDamageType = all {
    qScenarioOutcome == AwaitingDamageType,
    recordChainedAttackProcedureRoute(
      qSlotLevel,
      AwaitingInitialTarget,
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackProcedureRouteSubject,
          DamageTypeChoiceFillKind,
          targetChoiceHoles,
          BattleSpellAttackProcedureOwner,
        )
      ),
    ),
  }

  action doChooseInitialTarget = all {
    qScenarioOutcome == AwaitingInitialTarget,
    recordChainedAttackProcedureRoute(
      qSlotLevel,
      AwaitingStep0Attack,
      appendTargetProcedureRoute(qRoute, attackRollHoles),
    ),
  }

  action doResolveStep0AttackHit = all {
    qScenarioOutcome == AwaitingStep0Attack,
    recordChainedAttackProcedureRoute(
      qSlotLevel,
      AwaitingStep0Damage,
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackProcedureRouteSubject,
          AttackRollFillKind,
          rolledDiceHoles,
          BattleAttackRollOwner,
        )
      ),
    ),
  }

  action doResolveStep0DamageNoDuplicate = all {
    qScenarioOutcome == AwaitingStep0Damage,
    recordChainedAttackProcedureRoute(
      qSlotLevel,
      Step0NoLeapComplete,
      appendDamageProcedureRoute(qRoute, noHoles),
    ),
  }

  action doResolveStep0DamageDuplicate = all {
    qScenarioOutcome == AwaitingStep0Damage,
    recordChainedAttackProcedureRoute(
      qSlotLevel,
      AwaitingFirstLeapTarget,
      appendDamageProcedureRoute(qRoute, targetChoiceHoles),
    ),
  }

  action doChooseFirstLeapTarget = all {
    qScenarioOutcome == AwaitingFirstLeapTarget,
    recordChainedAttackProcedureRoute(
      qSlotLevel,
      AwaitingStep1Attack,
      appendTargetProcedureRoute(qRoute, attackRollHoles),
    ),
  }

  action doResolveStep1AttackHit = all {
    qScenarioOutcome == AwaitingStep1Attack,
    recordChainedAttackProcedureRoute(
      qSlotLevel,
      AwaitingStep1Damage,
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackProcedureRouteSubject,
          AttackRollFillKind,
          rolledDiceHoles,
          BattleAttackRollOwner,
        )
      ),
    ),
  }

  action doResolveStep1DuplicateDamageSlot1Limit = all {
    qScenarioOutcome == AwaitingStep1Damage,
    qSlotLevel == 1,
    recordChainedAttackProcedureRoute(
      qSlotLevel,
      Slot1LeapLimitComplete,
      appendDamageProcedureRoute(qRoute, noHoles),
    ),
  }

  action doResolveStep1DuplicateDamageSlot2AllowsLeap = all {
    qScenarioOutcome == AwaitingStep1Damage,
    qSlotLevel == 2,
    recordChainedAttackProcedureRoute(
      qSlotLevel,
      AwaitingSecondLeapTarget,
      appendDamageProcedureRoute(qRoute, targetChoiceHoles),
    ),
  }

  action step = any {
    doStartCast,
    doChooseDamageType,
    doChooseInitialTarget,
    doResolveStep0AttackHit,
    doResolveStep0DamageNoDuplicate,
    doResolveStep0DamageDuplicate,
    doChooseFirstLeapTarget,
    doResolveStep1AttackHit,
    doResolveStep1DuplicateDamageSlot1Limit,
    doResolveStep1DuplicateDamageSlot2AllowsLeap,
  }
}
