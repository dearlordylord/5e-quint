// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack allows attacks
//   to cause special effects in addition to or instead of damage.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Saving Throws defines
//   spell save outcomes as effect facts.
// - .references/srd-5.2.1/Spells/Descriptions-Q-R.md#Ray of Sickness defines
//   attack-hit Poisoned until the source's next turn ends.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Color Spray defines
//   failed-save Blinded until the source's next turn ends.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Blindness/Deafness
//   defines failed-save Blinded or Deafened with end-turn repeat-save cleanup.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Entangle defines
//   failed-save Restrained until spell end plus action Athletics escape cleanup.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Hideous Laughter
//   defines failed-save Prone and Incapacitated until spell end, a restriction
//   against the target ending Prone itself, and repeat-save success cleanup.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Hold Person defines
//   failed-save Paralyzed until spell end with end-turn repeat-save success
//   cleanup; Rules Glossary #Paralyzed [Condition] defines the implied
//   Incapacitated condition consequence.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Sleep defines failed-save
//   Incapacitated until target next turn, then repeat-save failure transition
//   to Unconscious until spell end.
// - .references/srd-5.2.1/Rules-Glossary.md#Condition, #Immunity, #Poisoned
//   [Condition], #Restrained [Condition], #Unconscious [Condition], and
//   #Saving Throw Effect Notation define condition application, condition
//   immunity rejection, and condition consequences.
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
    | FailedSaveBlindedNextTurnAppliedRouteSurface
    | FailedSaveBlindedNextTurnExpiredRouteSurface
    | FailedSaveBlindedRepeatSaveAppliedRouteSurface
    | FailedSaveDeafenedRepeatSaveAppliedRouteSurface
    | FailedSaveRepeatSaveFrontierRouteSurface
    | FailedSaveRepeatSaveSuccessCleanupRouteSurface
    | FailedSaveRestrainedAppliedRouteSurface
    | FailedSaveRestrainedEscapeFrontierRouteSurface
    | FailedSaveRestrainedEscapeCleanupRouteSurface
    | FailedSaveSleepIncapacitatedAppliedRouteSurface
    | FailedSaveSleepRepeatSaveFrontierRouteSurface
    | FailedSaveSleepRepeatSaveFailureUnconsciousRouteSurface
    | FailedSaveParalyzedRepeatSaveAppliedRouteSurface
    | FailedSaveIncapacitatedProneSelfEndBlockedAppliedRouteSurface
    | FailedSaveConditionRejectedRouteSurface

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
  pure val abilityCheckHoles: Set[BattleHoleFamilyKind] =
    Set(AbilityCheckHoleKind)

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
      discoverRoute(
        SpellAttackRouteSubject,
        targetChoiceHoles,
        BattleActionEconomyOwner,
      ),
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

  pure def conditionAdmissionRoute: List[ReducerRouteEvent] =
    List(
      resolveRouteWithoutFill(BattleConditionLifecycleOwner),
      resolveRouteWithoutFill(BattleActiveEffectOwner),
    )

  pure def conditionRejectionRoute: List[ReducerRouteEvent] =
    List(resolveRouteWithoutFill(BattleConditionLifecycleOwner))

  pure def attackHitPoisonAppliedFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostAttackHitDamageOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: PoisonedCondition }),
      RouteConditionRiderAdmission({ admission: ConditionApplied }),
      RouteConditionRiderBoundary({ boundary: UntilSourceNextTurnEnds }),
    )

  pure def attackHitPoisonRejectedFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostAttackHitDamageOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: PoisonedCondition }),
      RouteConditionRiderAdmission({ admission: ConditionRejectedByImmunity }),
    )

  pure def failedSaveRejectedFacts(
    condition: ConditionRiderConditionKindFact,
  ): List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostFailedSavingThrowOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: condition }),
      RouteConditionRiderAdmission({ admission: ConditionRejectedByImmunity }),
    )

  pure def failedSaveBlindedNextTurnFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostFailedSavingThrowOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: BlindedCondition }),
      RouteConditionRiderAdmission({ admission: ConditionApplied }),
      RouteConditionRiderBoundary({ boundary: UntilSourceNextTurnEnds }),
    )

  pure def failedSaveBlindedRepeatSaveFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostFailedSavingThrowOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: BlindedCondition }),
      RouteConditionRiderAdmission({ admission: ConditionApplied }),
      RouteConditionRiderBoundary({
        boundary: AffectedTargetEndTurnRepeatSave,
      }),
    )

  pure def failedSaveDeafenedRepeatSaveFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostFailedSavingThrowOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: DeafenedCondition }),
      RouteConditionRiderAdmission({ admission: ConditionApplied }),
      RouteConditionRiderBoundary({
        boundary: AffectedTargetEndTurnRepeatSave,
      }),
    )

  pure def failedSaveRestrainedFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostFailedSavingThrowOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: RestrainedCondition }),
      RouteConditionRiderAdmission({ admission: ConditionApplied }),
      RouteConditionRiderBoundary({ boundary: UntilSpellEnds }),
      RouteConditionRiderEscape({ escape: AthleticsActionEscapeCheck }),
    )

  pure def failedSaveSleepIncapacitatedFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostFailedSavingThrowOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: IncapacitatedCondition }),
      RouteConditionRiderAdmission({ admission: ConditionApplied }),
      RouteConditionRiderBoundary({
        boundary: UntilAffectedTargetNextTurnEnds,
      }),
    )

  pure def failedSaveParalyzedRepeatSaveFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostFailedSavingThrowOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: ParalyzedCondition }),
      RouteConditionRiderImpliedCondition({
        condition: IncapacitatedCondition,
      }),
      RouteConditionRiderAdmission({ admission: ConditionApplied }),
      RouteConditionRiderBoundary({ boundary: UntilSpellEnds }),
      RouteConditionRiderBoundary({
        boundary: AffectedTargetEndTurnRepeatSave,
      }),
    )

  pure def failedSaveIncapacitatedProneSelfEndBlockedFacts:
    List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderHostOutcome({ outcome: HostFailedSavingThrowOutcome }),
      RouteConditionRiderCarrier({ carrier: AffectedTargetConditionCarrier }),
      RouteConditionRiderConditionKind({ condition: IncapacitatedCondition }),
      RouteConditionRiderConditionKind({ condition: ProneCondition }),
      RouteConditionRiderSelfEndBlocked({ condition: ProneCondition }),
      RouteConditionRiderAdmission({ admission: ConditionApplied }),
      RouteConditionRiderBoundary({ boundary: UntilSpellEnds }),
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

  pure def restrainedEscapeCleanupFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderEscapeCheckSucceeded,
      RouteConditionRiderCleanedUpBy({
        owner: BattleConditionLifecycleCleanupOwner,
      }),
      RouteConditionRiderCleanedUpBy({ owner: BattleActiveEffectCleanupOwner }),
    )

  pure def sleepRepeatSaveFailureFacts: List[ConditionRiderRouteFact] =
    List(
      RouteConditionRiderRepeatSaveFailed,
      RouteConditionRiderTransition({ condition: UnconsciousCondition }),
      RouteConditionRiderBoundary({ boundary: UntilSpellEnds }),
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
      qRoute.concat(attackHitHostOutcomeRoute).concat(conditionAdmissionRoute),
      attackHitPoisonAppliedFacts,
    ),
  }

  action doRejectAttackHitPoisonConditionRiderByImmunity = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      AttackHitPoisonRejectedRouteSurface,
      qRoute.concat(attackHitHostOutcomeRoute).concat(conditionRejectionRoute),
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

  action doAdmitFailedSaveBlindedNextTurnConditionRider = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      FailedSaveBlindedNextTurnAppliedRouteSurface,
      qRoute.concat(failedSaveHostOutcomeRoute).concat(conditionAdmissionRoute),
      failedSaveBlindedNextTurnFacts,
    ),
  }

  action doExpireFailedSaveBlindedNextTurnConditionRider = all {
    qSurface == FailedSaveBlindedNextTurnAppliedRouteSurface,
    recordSurface(
      FailedSaveBlindedNextTurnExpiredRouteSurface,
      qRoute
        .append(resolveRouteWithoutFill(BattleTurnBoundaryOwner))
        .append(resolveRouteWithoutFill(BattleConditionLifecycleOwner))
        .append(resolveRouteWithoutFill(BattleActiveEffectOwner)),
      qFacts.concat(durationCleanupFacts),
    ),
  }

  action doRejectFailedSaveBlindedConditionRiderByImmunity = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      FailedSaveConditionRejectedRouteSurface,
      qRoute.concat(failedSaveHostOutcomeRoute).concat(conditionRejectionRoute),
      failedSaveRejectedFacts(BlindedCondition),
    ),
  }

  action doAdmitFailedSaveBlindedRepeatSaveConditionRider = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      FailedSaveBlindedRepeatSaveAppliedRouteSurface,
      qRoute.concat(failedSaveHostOutcomeRoute).concat(conditionAdmissionRoute),
      failedSaveBlindedRepeatSaveFacts,
    ),
  }

  action doAdmitFailedSaveDeafenedRepeatSaveConditionRider = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      FailedSaveDeafenedRepeatSaveAppliedRouteSurface,
      qRoute.concat(failedSaveHostOutcomeRoute).concat(conditionAdmissionRoute),
      failedSaveDeafenedRepeatSaveFacts,
    ),
  }

  action doOpenFailedSaveConditionRepeatSaveFrontier = all {
    qSurface.in(Set(
      FailedSaveBlindedRepeatSaveAppliedRouteSurface,
      FailedSaveDeafenedRepeatSaveAppliedRouteSurface,
      FailedSaveParalyzedRepeatSaveAppliedRouteSurface,
      FailedSaveIncapacitatedProneSelfEndBlockedAppliedRouteSurface,
    )),
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

  action doAdmitFailedSaveRestrainedUntilSpellEndEscapeConditionRider = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      FailedSaveRestrainedAppliedRouteSurface,
      qRoute.concat(failedSaveHostOutcomeRoute).concat(conditionAdmissionRoute),
      failedSaveRestrainedFacts,
    ),
  }

  action doOpenRestrainedAthleticsEscapeFrontier = all {
    qSurface == FailedSaveRestrainedAppliedRouteSurface,
    recordSurface(
      FailedSaveRestrainedEscapeFrontierRouteSurface,
      qRoute.append(
        discoverRoute(
          ConditionRiderRouteSubject,
          abilityCheckHoles,
          BattleAbilityCheckOwner,
        )
      ),
      qFacts.append(RouteConditionRiderEscapeCheckFrontierOpened),
    ),
  }

  action doResolveRestrainedAthleticsEscapeSuccessCleanup = all {
    qSurface == FailedSaveRestrainedEscapeFrontierRouteSurface,
    recordSurface(
      FailedSaveRestrainedEscapeCleanupRouteSurface,
      qRoute
        .append(
          resolveRoute(
            ConditionRiderRouteSubject,
            AbilityCheckFillKind,
            noHoles,
            BattleAbilityCheckOwner,
          )
        )
        .append(resolveRouteWithoutFill(BattleConditionLifecycleOwner))
        .append(resolveRouteWithoutFill(BattleActiveEffectOwner)),
      qFacts.concat(restrainedEscapeCleanupFacts),
    ),
  }

  action doAdmitFailedSaveSleepIncapacitatedConditionRider = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      FailedSaveSleepIncapacitatedAppliedRouteSurface,
      qRoute.concat(failedSaveHostOutcomeRoute).concat(conditionAdmissionRoute),
      failedSaveSleepIncapacitatedFacts,
    ),
  }

  action doOpenSleepRepeatSaveFrontier = all {
    qSurface == FailedSaveSleepIncapacitatedAppliedRouteSurface,
    recordSurface(
      FailedSaveSleepRepeatSaveFrontierRouteSurface,
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

  action doResolveSleepRepeatSaveFailureTransitionToUnconscious = all {
    qSurface == FailedSaveSleepRepeatSaveFrontierRouteSurface,
    recordSurface(
      FailedSaveSleepRepeatSaveFailureUnconsciousRouteSurface,
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
      qFacts.concat(sleepRepeatSaveFailureFacts),
    ),
  }

  action doAdmitFailedSaveParalyzedUntilSpellEndRepeatSaveConditionRider = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      FailedSaveParalyzedRepeatSaveAppliedRouteSurface,
      qRoute.concat(failedSaveHostOutcomeRoute).concat(conditionAdmissionRoute),
      failedSaveParalyzedRepeatSaveFacts,
    ),
  }

  action doAdmitFailedSaveIncapacitatedProneSelfEndBlockedConditionRider = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      FailedSaveIncapacitatedProneSelfEndBlockedAppliedRouteSurface,
      qRoute.concat(failedSaveHostOutcomeRoute).concat(conditionAdmissionRoute),
      failedSaveIncapacitatedProneSelfEndBlockedFacts,
    ),
  }

  action doStutterAfterTerminalSurface = all {
    qSurface.in(Set(
      AttackHitPoisonRejectedRouteSurface,
      AttackHitPoisonExpiredRouteSurface,
      FailedSaveBlindedNextTurnExpiredRouteSurface,
      FailedSaveRepeatSaveSuccessCleanupRouteSurface,
      FailedSaveRestrainedEscapeCleanupRouteSurface,
      FailedSaveSleepRepeatSaveFailureUnconsciousRouteSurface,
      FailedSaveConditionRejectedRouteSurface,
    )),
    recordSurface(qSurface, qRoute, qFacts),
  }

  action step = any {
    doAdmitAttackHitPoisonConditionRider,
    doRejectAttackHitPoisonConditionRiderByImmunity,
    doExpireAttackHitPoisonConditionRider,
    doAdmitFailedSaveBlindedNextTurnConditionRider,
    doExpireFailedSaveBlindedNextTurnConditionRider,
    doRejectFailedSaveBlindedConditionRiderByImmunity,
    doAdmitFailedSaveBlindedRepeatSaveConditionRider,
    doAdmitFailedSaveDeafenedRepeatSaveConditionRider,
    doOpenFailedSaveConditionRepeatSaveFrontier,
    doResolveFailedSaveConditionRepeatSaveSuccessCleanup,
    doAdmitFailedSaveRestrainedUntilSpellEndEscapeConditionRider,
    doOpenRestrainedAthleticsEscapeFrontier,
    doResolveRestrainedAthleticsEscapeSuccessCleanup,
    doAdmitFailedSaveSleepIncapacitatedConditionRider,
    doOpenSleepRepeatSaveFrontier,
    doResolveSleepRepeatSaveFailureTransitionToUnconscious,
    doAdmitFailedSaveParalyzedUntilSpellEndRepeatSaveConditionRider,
    doAdmitFailedSaveIncapacitatedProneSelfEndBlockedConditionRider,
    doStutterAfterTerminalSurface,
  }
}
