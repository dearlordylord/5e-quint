// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Classes/Druid.md#Level 2: Wild Shape defines
//   Bonus Action form assumption, use spending, Temporary Hit Points, Beast
//   stat projection, spellcasting restriction, reuse replacement, Bonus Action
//   dismissal, and ending on Incapacitated or death.
// - .references/srd-5.2.1/Rules-Glossary.md#Shape-Shifting says the effect
//   description owns form rules and reversion on death.
// - .references/srd-5.2.1/Rules-Glossary.md#Speed defines Speed and special
//   speeds as creature movement capacities.
// - UBIQUITOUS_LANGUAGE.md: Speed, Movement, Temporary Hit Points, Creature,
//   Stat Block, Character Sheet, and Action Lifecycle.
module battleRuntimeDruidWildShapeFormLifecycleRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type DruidWildShapeFormLifecycleRouteStage =
    | Init
    | FormAssumed
    | NextTurnReady
    | FormReused
    | FormDismissed
    | FormEndedByIncapacitated
    | FormEndedByDeath

  var qStage: DruidWildShapeFormLifecycleRouteStage
  var qRoute: List[ReducerRouteEvent]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val equipmentDispositionHoles: Set[BattleHoleFamilyKind] =
    Set(WildShapeEquipmentDispositionHoleKind)

  pure def discoverActiveForm(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      ActiveFormLifecycleRouteSubject,
      holes,
      owner,
    )

  pure def resolveActiveFormWithEquipmentDisposition(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      ActiveFormLifecycleRouteSubject,
      WildShapeEquipmentDispositionFillKind,
      noHoles,
      owner,
    )

  pure def resolveActiveFormWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      ActiveFormLifecycleRouteSubject,
      noHoles,
      owner,
    )

  pure def appendAssumeOrReuseFormRoute(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(discoverActiveForm(equipmentDispositionHoles, BattleActionEconomyOwner))
      .append(resolveActiveFormWithEquipmentDisposition(BattleActionEconomyOwner))
      .append(resolveActiveFormWithoutFill(BattleFeatureResourceOwner))
      .append(resolveActiveFormWithoutFill(BattleTemporaryHitPointOwner))
      .append(resolveActiveFormWithoutFill(BattleActiveEffectOwner))
      .append(resolveActiveFormWithoutFill(BattleCreatureStateOwner))
      .append(resolveActiveFormWithoutFill(BattleMovementResourceOwner))

  pure def appendDismissalRoute(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(discoverActiveForm(noHoles, BattleActionEconomyOwner))
      .append(resolveActiveFormWithoutFill(BattleActionEconomyOwner))
      .append(resolveActiveFormWithoutFill(BattleActiveEffectOwner))
      .append(resolveActiveFormWithoutFill(BattleCreatureStateOwner))
      .append(resolveActiveFormWithoutFill(BattleMovementResourceOwner))

  pure def appendIncapacitatedReversionRoute(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(discoverActiveForm(noHoles, BattleConditionLifecycleOwner))
      .append(resolveActiveFormWithoutFill(BattleConditionLifecycleOwner))
      .append(resolveActiveFormWithoutFill(BattleActiveEffectOwner))
      .append(resolveActiveFormWithoutFill(BattleCreatureStateOwner))
      .append(resolveActiveFormWithoutFill(BattleMovementResourceOwner))

  pure def appendDeathReversionRoute(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(discoverActiveForm(noHoles, BattleHitPointAndZeroHpLifecycleOwner))
      .append(resolveActiveFormWithoutFill(BattleHitPointAndZeroHpLifecycleOwner))
      .append(resolveActiveFormWithoutFill(BattleActiveEffectOwner))
      .append(resolveActiveFormWithoutFill(BattleCreatureStateOwner))
      .append(resolveActiveFormWithoutFill(BattleMovementResourceOwner))

  action init = all {
    qStage' = Init,
    qRoute' = List(routeStartBattle(BattleActionEconomyOwner)),
  }

  action doAssumeForm = all {
    qStage == Init,
    qStage' = FormAssumed,
    qRoute' = appendAssumeOrReuseFormRoute(qRoute),
  }

  action doBeginNextTurn = all {
    qStage == FormAssumed or qStage == FormReused,
    qStage' = NextTurnReady,
    qRoute' = qRoute
      .append(discoverActiveForm(noHoles, BattleTurnBoundaryOwner))
      .append(resolveActiveFormWithoutFill(BattleTurnBoundaryOwner))
      .append(resolveActiveFormWithoutFill(BattleActionEconomyOwner)),
  }

  action doReuseForm = all {
    qStage == NextTurnReady,
    qStage' = FormReused,
    qRoute' = appendAssumeOrReuseFormRoute(qRoute),
  }

  action doDismissForm = all {
    qStage == NextTurnReady,
    qStage' = FormDismissed,
    qRoute' = appendDismissalRoute(qRoute),
  }

  action doIncapacitatedReversion = all {
    qStage == FormAssumed or qStage == FormReused,
    qStage' = FormEndedByIncapacitated,
    qRoute' = appendIncapacitatedReversionRoute(qRoute),
  }

  action doDeathReversion = all {
    qStage == FormAssumed or qStage == FormReused,
    qStage' = FormEndedByDeath,
    qRoute' = appendDeathReversionRoute(qRoute),
  }

  action doStutter = all {
    qStage.in(Set(FormEndedByIncapacitated, FormEndedByDeath)),
    qStage' = qStage,
    qRoute' = qRoute,
  }

  action step = any {
    doAssumeForm,
    doBeginNextTurn,
    doReuseForm,
    doDismissForm,
    doIncapacitatedReversion,
    doDeathReversion,
    doStutter,
  }
}
