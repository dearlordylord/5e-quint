// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Targets, #Attack
//   Rolls, and #Saving Throws define spell targets plus per-target attack-roll
//   and Saving Throw outcomes.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage against Multiple Targets
//   defines a single damage roll shared by simultaneous multi-target Saving
//   Throw damage.
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack allows attacks
//   to cause special effects in addition to or instead of damage.
// - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Attack Roll, Saving Throw,
//   Damage, Target, and Action Lifecycle.
module battleRuntimeMixedTargetOutcomesRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeMixedTargetOutcomeRouteFacts.* from "./battle-runtime-mixed-target-outcome-route-facts"

  type MixedTargetOutcomeRouteSurface =
    | FreshRouteSurface
    | AreaSavingThrowMixedOutcomeRouteSurface
    | AttackHitBurstSavingThrowRouteSurface
    | AttackMissBurstSavingThrowRouteSurface
    | ObjectAttackProjectionRouteSurface
    | AttackHitConditionProjectionRouteSurface
    | SaveFailureNextAttackProjectionRouteSurface
    | ChainedAttackMixedTargetRouteSurface

  var qSurface: MixedTargetOutcomeRouteSurface
  var qRoute: List[ReducerRouteEvent]
  var qFacts: List[MixedTargetOutcomeRouteFact]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val attackRollHoles: Set[BattleHoleFamilyKind] = Set(AttackRollHoleKind)
  pure val savingThrowOutcomeHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind)
  pure val rolledDiceHoles: Set[BattleHoleFamilyKind] = Set(RolledDiceHoleKind)

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverInvocationRoute(
    holes: Set[BattleHoleFamilyKind],
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      MixedTargetOutcomeSpellRouteSubject,
      holes,
      BattleSpellInvocationOwner,
    )

  pure def resolveInvocationRoute(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      MixedTargetOutcomeSpellRouteSubject,
      fill,
      holes,
      BattleSpellInvocationOwner,
    )

  pure def resolveInvocationProjectionRoute: ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      MixedTargetOutcomeSpellRouteSubject,
      noHoles,
      BattleSpellInvocationOwner,
    )

  pure def areaSavingThrowMixedOutcomeRoute: List[ReducerRouteEvent] =
    List(
      discoverInvocationRoute(savingThrowOutcomeHoles),
      resolveInvocationRoute(SavingThrowOutcomeFillKind, rolledDiceHoles),
      resolveInvocationRoute(RolledDiceFillKind, noHoles),
    )

  pure def attackHitThenBurstRoute: List[ReducerRouteEvent] =
    List(
      discoverInvocationRoute(targetChoiceHoles),
      resolveInvocationRoute(TargetChoiceFillKind, attackRollHoles),
      resolveInvocationRoute(AttackRollFillKind, savingThrowOutcomeHoles),
      resolveInvocationRoute(SavingThrowOutcomeFillKind, rolledDiceHoles),
      resolveInvocationRoute(RolledDiceFillKind, noHoles),
    )

  pure def attackMissThenBurstRoute: List[ReducerRouteEvent] =
    List(
      discoverInvocationRoute(targetChoiceHoles),
      resolveInvocationRoute(TargetChoiceFillKind, attackRollHoles),
      resolveInvocationRoute(AttackRollFillKind, savingThrowOutcomeHoles),
      resolveInvocationRoute(SavingThrowOutcomeFillKind, rolledDiceHoles),
      resolveInvocationRoute(RolledDiceFillKind, noHoles),
    )

  pure def objectAttackProjectionRoute: List[ReducerRouteEvent] =
    List(
      discoverInvocationRoute(targetChoiceHoles),
      resolveInvocationRoute(TargetChoiceFillKind, attackRollHoles),
      resolveInvocationRoute(AttackRollFillKind, rolledDiceHoles),
      resolveInvocationRoute(RolledDiceFillKind, noHoles),
      resolveInvocationProjectionRoute,
    )

  pure def attackHitConditionProjectionRoute: List[ReducerRouteEvent] =
    List(
      discoverInvocationRoute(targetChoiceHoles),
      resolveInvocationRoute(TargetChoiceFillKind, attackRollHoles),
      resolveInvocationRoute(AttackRollFillKind, rolledDiceHoles),
      resolveInvocationRoute(RolledDiceFillKind, noHoles),
      resolveInvocationProjectionRoute,
    )

  pure def saveFailureNextAttackProjectionRoute: List[ReducerRouteEvent] =
    List(
      discoverInvocationRoute(targetChoiceHoles),
      resolveInvocationRoute(TargetChoiceFillKind, savingThrowOutcomeHoles),
      resolveInvocationRoute(SavingThrowOutcomeFillKind, rolledDiceHoles),
      resolveInvocationRoute(RolledDiceFillKind, noHoles),
      resolveInvocationProjectionRoute,
    )

  pure def chainedAttackMixedTargetRoute: List[ReducerRouteEvent] =
    List(
      discoverInvocationRoute(targetChoiceHoles),
      resolveInvocationRoute(TargetChoiceFillKind, attackRollHoles),
      resolveInvocationRoute(AttackRollFillKind, rolledDiceHoles),
      resolveInvocationRoute(RolledDiceFillKind, targetChoiceHoles),
      resolveInvocationRoute(TargetChoiceFillKind, attackRollHoles),
      resolveInvocationRoute(AttackRollFillKind, rolledDiceHoles),
      resolveInvocationRoute(RolledDiceFillKind, noHoles),
    )

  pure def slotSpendFact: List[MixedTargetOutcomeRouteFact] =
    List(
      RouteMixedTargetOutcomeSharedSpend({
        spend: SharedSpellSlotSpend,
      }),
    )

  pure def cantripSpendFact: List[MixedTargetOutcomeRouteFact] =
    List(
      RouteMixedTargetOutcomeSharedSpend({
        spend: SharedCantripActionSpend,
      }),
    )

  pure def sharedSavingThrowDamageRollFact: List[MixedTargetOutcomeRouteFact] =
    List(
      RouteMixedTargetOutcomeSharedDamageRoll({
        roll: SharedSavingThrowDamageRoll,
      }),
    )

  pure def areaSavingThrowMixedOutcomeFacts: List[MixedTargetOutcomeRouteFact] =
    slotSpendFact.concat(sharedSavingThrowDamageRollFact).concat(List(
      RouteMixedTargetOutcomeTarget({ target: PrimaryTarget }),
      RouteMixedTargetOutcomeTarget({ target: SecondaryTarget }),
      RouteMixedTargetOutcomeResolution({
        target: PrimaryTarget,
        outcome: SavingThrowFailedOutcome,
      }),
      RouteMixedTargetOutcomeResolution({
        target: SecondaryTarget,
        outcome: SavingThrowSucceededOutcome,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: PrimaryTarget,
        damage: FullSavingThrowDamageProjection,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: SecondaryTarget,
        damage: HalfSavingThrowDamageProjection,
      }),
    ))

  pure def attackHitBurstSavingThrowFacts: List[MixedTargetOutcomeRouteFact] =
    slotSpendFact.concat(sharedSavingThrowDamageRollFact).concat(List(
      RouteMixedTargetOutcomeTarget({ target: PrimaryTarget }),
      RouteMixedTargetOutcomeTarget({ target: SecondaryTarget }),
      RouteMixedTargetOutcomeResolution({
        target: PrimaryTarget,
        outcome: AttackHitOutcome,
      }),
      RouteMixedTargetOutcomeResolution({
        target: PrimaryTarget,
        outcome: SavingThrowFailedOutcome,
      }),
      RouteMixedTargetOutcomeResolution({
        target: SecondaryTarget,
        outcome: SavingThrowSucceededOutcome,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: PrimaryTarget,
        damage: AttackDamageProjection,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: PrimaryTarget,
        damage: FullSavingThrowDamageProjection,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: SecondaryTarget,
        damage: HalfSavingThrowDamageProjection,
      }),
      RouteMixedTargetOutcomeSecondaryProjection({
        target: PrimaryTarget,
        projection: BurstSavingThrowProjection,
      }),
      RouteMixedTargetOutcomeSecondaryProjection({
        target: SecondaryTarget,
        projection: BurstSavingThrowProjection,
      }),
    ))

  pure def attackMissBurstSavingThrowFacts: List[MixedTargetOutcomeRouteFact] =
    slotSpendFact.concat(sharedSavingThrowDamageRollFact).concat(List(
      RouteMixedTargetOutcomeTarget({ target: PrimaryTarget }),
      RouteMixedTargetOutcomeTarget({ target: SecondaryTarget }),
      RouteMixedTargetOutcomeResolution({
        target: PrimaryTarget,
        outcome: AttackMissOutcome,
      }),
      RouteMixedTargetOutcomeResolution({
        target: PrimaryTarget,
        outcome: SavingThrowFailedOutcome,
      }),
      RouteMixedTargetOutcomeResolution({
        target: SecondaryTarget,
        outcome: SavingThrowSucceededOutcome,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: PrimaryTarget,
        damage: NoDamageProjection,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: PrimaryTarget,
        damage: FullSavingThrowDamageProjection,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: SecondaryTarget,
        damage: HalfSavingThrowDamageProjection,
      }),
      RouteMixedTargetOutcomeSecondaryProjection({
        target: PrimaryTarget,
        projection: BurstSavingThrowProjection,
      }),
      RouteMixedTargetOutcomeSecondaryProjection({
        target: SecondaryTarget,
        projection: BurstSavingThrowProjection,
      }),
    ))

  pure def objectAttackProjectionFacts: List[MixedTargetOutcomeRouteFact] =
    cantripSpendFact.concat(List(
      RouteMixedTargetOutcomeTarget({ target: ObjectTarget }),
      RouteMixedTargetOutcomeResolution({
        target: ObjectTarget,
        outcome: AttackHitOutcome,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: ObjectTarget,
        damage: AttackDamageProjection,
      }),
      RouteMixedTargetOutcomeSecondaryProjection({
        target: ObjectTarget,
        projection: ObjectBoundaryProjection,
      }),
      RouteMixedTargetOutcomeSecondaryProjection({
        target: ObjectTarget,
        projection: LightProjection,
      }),
    ))

  pure def attackHitConditionProjectionFacts: List[MixedTargetOutcomeRouteFact] =
    slotSpendFact.concat(List(
      RouteMixedTargetOutcomeTarget({ target: PrimaryTarget }),
      RouteMixedTargetOutcomeResolution({
        target: PrimaryTarget,
        outcome: AttackHitOutcome,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: PrimaryTarget,
        damage: AttackDamageProjection,
      }),
      RouteMixedTargetOutcomeSecondaryProjection({
        target: PrimaryTarget,
        projection: ConditionProjection,
      }),
    ))

  pure def saveFailureNextAttackProjectionFacts: List[MixedTargetOutcomeRouteFact] =
    cantripSpendFact.concat(List(
      RouteMixedTargetOutcomeTarget({ target: PrimaryTarget }),
      RouteMixedTargetOutcomeResolution({
        target: PrimaryTarget,
        outcome: SavingThrowFailedOutcome,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: PrimaryTarget,
        damage: FullSavingThrowDamageProjection,
      }),
      RouteMixedTargetOutcomeSecondaryProjection({
        target: PrimaryTarget,
        projection: NextAttackRollModeProjection,
      }),
    ))

  pure def chainedAttackMixedTargetFacts: List[MixedTargetOutcomeRouteFact] =
    slotSpendFact.concat(List(
      RouteMixedTargetOutcomeTarget({ target: PrimaryTarget }),
      RouteMixedTargetOutcomeTarget({ target: SecondaryTarget }),
      RouteMixedTargetOutcomeResolution({
        target: PrimaryTarget,
        outcome: AttackHitOutcome,
      }),
      RouteMixedTargetOutcomeResolution({
        target: SecondaryTarget,
        outcome: AttackHitOutcome,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: PrimaryTarget,
        damage: AttackDamageProjection,
      }),
      RouteMixedTargetOutcomeDamageProjection({
        target: SecondaryTarget,
        damage: AttackDamageProjection,
      }),
      RouteMixedTargetOutcomeSecondaryProjection({
        target: SecondaryTarget,
        projection: ChainedAttackTargetProjection,
      }),
    ))

  action recordSurface(
    surface: MixedTargetOutcomeRouteSurface,
    route: List[ReducerRouteEvent],
    facts: List[MixedTargetOutcomeRouteFact],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
    qFacts' = facts,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute), List())

  action doRouteAreaSavingThrowMixedOutcomes = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      AreaSavingThrowMixedOutcomeRouteSurface,
      qRoute.concat(areaSavingThrowMixedOutcomeRoute),
      areaSavingThrowMixedOutcomeFacts,
    ),
  }

  action doRouteAttackHitBurstSavingThrowMixedOutcomes = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      AttackHitBurstSavingThrowRouteSurface,
      qRoute.concat(attackHitThenBurstRoute),
      attackHitBurstSavingThrowFacts,
    ),
  }

  action doRouteAttackMissBurstSavingThrowMixedOutcomes = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      AttackMissBurstSavingThrowRouteSurface,
      qRoute.concat(attackMissThenBurstRoute),
      attackMissBurstSavingThrowFacts,
    ),
  }

  action doRouteObjectAttackSecondaryProjection = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      ObjectAttackProjectionRouteSurface,
      qRoute.concat(objectAttackProjectionRoute),
      objectAttackProjectionFacts,
    ),
  }

  action doRouteAttackHitConditionProjection = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      AttackHitConditionProjectionRouteSurface,
      qRoute.concat(attackHitConditionProjectionRoute),
      attackHitConditionProjectionFacts,
    ),
  }

  action doRouteSaveFailureNextAttackProjection = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      SaveFailureNextAttackProjectionRouteSurface,
      qRoute.concat(saveFailureNextAttackProjectionRoute),
      saveFailureNextAttackProjectionFacts,
    ),
  }

  action doRouteChainedAttackMixedTargetOutcomes = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      ChainedAttackMixedTargetRouteSurface,
      qRoute.concat(chainedAttackMixedTargetRoute),
      chainedAttackMixedTargetFacts,
    ),
  }

  action doStutterAfterTerminalSurface = all {
    qSurface != FreshRouteSurface,
    recordSurface(qSurface, qRoute, qFacts),
  }

  action step = any {
    doRouteAreaSavingThrowMixedOutcomes,
    doRouteAttackHitBurstSavingThrowMixedOutcomes,
    doRouteAttackMissBurstSavingThrowMixedOutcomes,
    doRouteObjectAttackSecondaryProjection,
    doRouteAttackHitConditionProjection,
    doRouteSaveFailureNextAttackProjection,
    doRouteChainedAttackMixedTargetOutcomes,
    doStutterAfterTerminalSurface,
  }
}
