// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack allows attacks
//   to cause special effects in addition to or instead of damage.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Saving Throws defines
//   spell save outcomes as effect facts.
// - .references/srd-5.2.1/Rules-Glossary.md#Condition, #Immunity,
//   #Poisoned [Condition], #Restrained [Condition], #Saving Throw, and
//   #Saving Throw Effect Notation define condition application, condition
//   immunity rejection, Poisoned, Restrained, and repeat-save boundaries.
// - UBIQUITOUS_LANGUAGE.md: Rider, Condition, Poisoned, Saving Throw, Spell
//   Effect, and Action Lifecycle.
module battleRuntimeConditionRidersRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeConditionRiderRouteFacts.* from "./battle-runtime-condition-rider-route-facts"

  type ConditionRiderRouteSurface =
    | FreshRouteSurface
    | AttackHitPoisonAppliedRouteSurface
    | AttackHitPoisonRejectedRouteSurface
    | AttackHitPoisonExpiredRouteSurface
    | FailedSaveConditionAppliedRouteSurface
    | FailedSaveRepeatSaveFrontierRouteSurface
    | FailedSaveRepeatSaveSuccessCleanupRouteSurface

  var qSurface: ConditionRiderRouteSurface
  var qRoute: List[ReducerRouteEvent]
  var qFacts: List[ConditionRiderRouteFact]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val attackRollHoles: Set[BattleHoleFamilyKind] = Set(AttackRollHoleKind)
  pure val rolledDiceHoles: Set[BattleHoleFamilyKind] = Set(RolledDiceHoleKind)
  pure val savingThrowOutcomeHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind)

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverRoute(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(subject, holes, owner)

  pure def resolveRoute(
    subject: ReducerRouteSubjectFamily,
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(subject, fill, holes, owner)

  pure def resolveRouteWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      ConditionRiderRouteSubject,
      noHoles,
      owner,
    )

  pure def attackHitHostOutcomeRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(SpellAttackRouteSubject, targetChoiceHoles, BattleActionEconomyOwner),
      resolveRoute(
        SpellAttackRouteSubject,
        TargetChoiceFillKind,
        attackRollHoles,
        BattleTargetSelectionOwner,
      ),
      resolveRoute(
        SpellAttackRouteSubject,
        AttackRollFillKind,
        rolledDiceHoles,
        BattleAttackRollOwner,
      ),
      resolveRoute(
        SpellAttackRouteSubject,
        RolledDiceFillKind,
        noHoles,
        BattleHitPointOwner,
      ),
    )

  pure def failedSaveHostOutcomeRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(
        SaveGatedSpellRouteSubject,
        targetChoiceHoles,
        BattleSpellSlotAndActionEconomyOwner,
      ),
      resolveRoute(
        SaveGatedSpellRouteSubject,
        TargetChoiceFillKind,
        savingThrowOutcomeHoles,
        BattleTargetSelectionOwner,
      ),
      resolveRoute(
        SaveGatedSpellRouteSubject,
        SavingThrowOutcomeFillKind,
        noHoles,
        BattleSavingThrowOutcomeOwner,
      ),
    )

  pure def attackHitPoisonAppliedFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostAttackHitDamageOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: PoisonedCondition }),
      RouteConditionRiderAdmission({ admission: ConditionApplied }),
      RouteConditionRiderBoundary({ boundary: UntilDurationExpires }),
    )

  pure def attackHitPoisonRejectedFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostAttackHitDamageOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: PoisonedCondition }),
      RouteConditionRiderAdmission({ admission: ConditionRejectedByImmunity }),
    )

  pure def failedSaveConditionAppliedFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostFailedSavingThrowOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: RestrainedCondition }),
      RouteConditionRiderAdmission({ admission: ConditionApplied }),
      RouteConditionRiderBoundary({
        boundary: AffectedTargetEndTurnRepeatSave,
      }),
    )

  pure def durationCleanupFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderExpired,
      RouteConditionRiderCleanedUpBy({ owner: BattleTurnBoundaryCleanupOwner }),
      RouteConditionRiderCleanedUpBy({
        owner: BattleConditionLifecycleCleanupOwner,
      }),
      RouteConditionRiderCleanedUpBy({ owner: BattleActiveEffectCleanupOwner }),
    )

  pure def repeatSaveSuccessCleanupFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderRepeatSaveSucceeded,
      RouteConditionRiderCleanedUpBy({
        owner: BattleConditionLifecycleCleanupOwner,
      }),
      RouteConditionRiderCleanedUpBy({ owner: BattleActiveEffectCleanupOwner }),
    )

  action recordSurface(
    surface: ConditionRiderRouteSurface,
    route: List[ReducerRouteEvent],
    facts: List[ConditionRiderRouteFact],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
    qFacts' = facts,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute), List())

  action doAdmitAttackHitPoisonConditionRider = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      AttackHitPoisonAppliedRouteSurface,
      qRoute
        .concat(attackHitHostOutcomeRoute)
        .append(resolveRouteWithoutFill(BattleConditionLifecycleOwner))
        .append(resolveRouteWithoutFill(BattleActiveEffectOwner)),
      attackHitPoisonAppliedFacts,
    ),
  }

  action doRejectAttackHitPoisonConditionRiderByImmunity = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      AttackHitPoisonRejectedRouteSurface,
      qRoute
        .concat(attackHitHostOutcomeRoute)
        .append(resolveRouteWithoutFill(BattleConditionLifecycleOwner)),
      attackHitPoisonRejectedFacts,
    ),
  }

  action doExpireAttackHitPoisonConditionRider = all {
    qSurface == AttackHitPoisonAppliedRouteSurface,
    recordSurface(
      AttackHitPoisonExpiredRouteSurface,
      qRoute
        .append(resolveRouteWithoutFill(BattleTurnBoundaryOwner))
        .append(resolveRouteWithoutFill(BattleConditionLifecycleOwner))
        .append(resolveRouteWithoutFill(BattleActiveEffectOwner)),
      qFacts.concat(durationCleanupFacts),
    ),
  }

  action doAdmitFailedSaveRepeatSaveConditionRider = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      FailedSaveConditionAppliedRouteSurface,
      qRoute
        .concat(failedSaveHostOutcomeRoute)
        .append(resolveRouteWithoutFill(BattleConditionLifecycleOwner))
        .append(resolveRouteWithoutFill(BattleActiveEffectOwner)),
      failedSaveConditionAppliedFacts,
    ),
  }

  action doOpenFailedSaveConditionRepeatSaveFrontier = all {
    qSurface == FailedSaveConditionAppliedRouteSurface,
    recordSurface(
      FailedSaveRepeatSaveFrontierRouteSurface,
      qRoute.append(
        discoverRoute(
          ConditionRiderRouteSubject,
          savingThrowOutcomeHoles,
          BattleTurnBoundaryOwner,
        )
      ),
      qFacts.append(RouteConditionRiderRepeatSaveFrontierOpened),
    ),
  }

  action doResolveFailedSaveConditionRepeatSaveSuccessCleanup = all {
    qSurface == FailedSaveRepeatSaveFrontierRouteSurface,
    recordSurface(
      FailedSaveRepeatSaveSuccessCleanupRouteSurface,
      qRoute
        .append(
          resolveRoute(
            ConditionRiderRouteSubject,
            SavingThrowOutcomeFillKind,
            noHoles,
            BattleConditionLifecycleOwner,
          )
        )
        .append(resolveRouteWithoutFill(BattleActiveEffectOwner)),
      qFacts.concat(repeatSaveSuccessCleanupFacts),
    ),
  }

  action doStutterAfterTerminalSurface = all {
    qSurface.in(Set(
      AttackHitPoisonRejectedRouteSurface,
      AttackHitPoisonExpiredRouteSurface,
      FailedSaveRepeatSaveSuccessCleanupRouteSurface,
    )),
    recordSurface(qSurface, qRoute, qFacts),
  }

  action step = any {
    doAdmitAttackHitPoisonConditionRider,
    doRejectAttackHitPoisonConditionRiderByImmunity,
    doExpireAttackHitPoisonConditionRider,
    doAdmitFailedSaveRepeatSaveConditionRider,
    doOpenFailedSaveConditionRepeatSaveFrontier,
    doResolveFailedSaveConditionRepeatSaveSuccessCleanup,
    doStutterAfterTerminalSurface,
  }
}
