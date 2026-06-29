// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Hex and #Hunter's Mark
//   define marked-target extra damage on attack-roll hits, Concentration, and
//   target transfer after the marked target drops to 0 Hit Points.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Hex defines a selected
//   ability whose target-scoped Ability Checks have Disadvantage while the
//   spell effect persists.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Heroism defines
//   Frightened immunity and turn-start Temporary Hit Points for a willing
//   target while the spell lasts.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls and #Temporary Hit
//   Points define damage application and the separate non-stacking Temporary
//   Hit Point buffer.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration and #Immunity define
//   active-effect duration and condition-immunity rejection.
// - UBIQUITOUS_LANGUAGE.md: Rider, Attack Damage Rider, Spell Effect,
//   Concentration, Temporary Hit Points, Condition Immunity, and Damage.
module battleRuntimeMarkedDamageImmunityActiveEffectsRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeRouteChoicePayloads.* from "./battle-runtime-route-choice-payloads"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeMarkedDamageImmunityRouteFacts.* from "./battle-runtime-marked-damage-immunity-route-facts"

  type MarkedDamageImmunityRouteSurface =
    | FreshRouteSurface
    | MarkedDamageRiderAdmittedRouteSurface
    | MarkedDamageRiderProjectedRouteSurface
    | MarkedDamageRiderTransferAvailableRouteSurface
    | MarkedDamageRiderSameTurnTransferRouteSurface
    | MarkedDamageRiderLaterTurnTransferRouteSurface
    | TargetedAbilityCheckMarkedDamageRiderAdmittedRouteSurface
    | TargetedAbilityCheckRollModeProjectedRouteSurface
    | TargetedAbilityCheckRollModeCleanedUpRouteSurface
    | ConditionImmunityTemporaryHitPointAdmittedRouteSurface
    | ConditionImmunityProjectedRouteSurface
    | TurnStartTemporaryHitPointsGrantedRouteSurface
    | ConditionImmunityTemporaryHitPointCleanupRouteSurface

  var qSurface: MarkedDamageImmunityRouteSurface
  var qRoute: List[ReducerRouteEvent]
  var qFacts: List[MarkedDamageImmunityRouteFact]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val abilityChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(AbilityChoiceHoleKind)
  pure val targetAndAbilityChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind, AbilityChoiceHoleKind)
  pure val attackRollHoles: Set[BattleHoleFamilyKind] = Set(AttackRollHoleKind)
  pure val rolledDiceHoles: Set[BattleHoleFamilyKind] = Set(RolledDiceHoleKind)

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def markedFact(
    fact: MarkedDamageRiderRouteFact,
  ): MarkedDamageImmunityRouteFact =
    RouteMarkedDamageRiderFact({ fact: fact })

  pure def immunityFact(
    fact: ConditionImmunityTemporaryHitPointRouteFact,
  ): MarkedDamageImmunityRouteFact =
    RouteConditionImmunityTemporaryHitPointFact({ fact: fact })

  pure def discoverMarkedRider(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      MarkedDamageRiderEffectRouteSubject,
      holes,
      owner,
    )

  pure def resolveMarkedRider(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      MarkedDamageRiderEffectRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveMarkedRiderWithFillEvidence(
    fill: ReducerRouteFillEvidence,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithFillEvidence(
      MarkedDamageRiderEffectRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveMarkedRiderWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      MarkedDamageRiderEffectRouteSubject,
      noHoles,
      owner,
    )

  pure def discoverImmunityTemporaryHp(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      ConditionImmunityTemporaryHitPointEffectRouteSubject,
      holes,
      owner,
    )

  pure def resolveImmunityTemporaryHp(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      ConditionImmunityTemporaryHitPointEffectRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveImmunityTemporaryHpWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      ConditionImmunityTemporaryHitPointEffectRouteSubject,
      noHoles,
      owner,
    )

  pure def markedRiderAdmissionRoute: List[ReducerRouteEvent] =
    List(
      discoverMarkedRider(
        targetChoiceHoles,
        BattleSpellSlotAndActionEconomyOwner,
      ),
      resolveMarkedRider(
        TargetChoiceFillKind,
        noHoles,
        BattleTargetSelectionOwner,
      ),
      resolveMarkedRiderWithoutFill(BattleActiveEffectOwner),
      resolveMarkedRiderWithoutFill(BattleConcentrationOwner),
    )

  pure def targetedAbilityCheckMarkedRiderAdmissionRoute: List[ReducerRouteEvent] =
    List(
      discoverMarkedRider(
        targetAndAbilityChoiceHoles,
        BattleSpellSlotAndActionEconomyOwner,
      ),
      resolveMarkedRider(
        TargetChoiceFillKind,
        abilityChoiceHoles,
        BattleTargetSelectionOwner,
      ),
      resolveMarkedRiderWithFillEvidence(
        RouteAbilityChoiceFill({ ability: RouteAbilityWis }),
        noHoles,
        BattleActiveEffectOwner,
      ),
      resolveMarkedRiderWithoutFill(BattleConcentrationOwner),
    )

  pure def targetedAbilityCheckRollModeProjectionRoute: List[ReducerRouteEvent] =
    List(resolveMarkedRiderWithoutFill(BattleAbilityCheckRollModeOwner))

  pure def targetedAbilityCheckRollModeCleanupRoute: List[ReducerRouteEvent] =
    List(
      resolveMarkedRiderWithoutFill(BattleConcentrationOwner),
      resolveMarkedRiderWithoutFill(BattleActiveEffectOwner),
    )

  pure def markedRiderAttackHitProjectionRoute: List[ReducerRouteEvent] =
    List(
      discoverMarkedRider(targetChoiceHoles, BattleActionEconomyOwner),
      resolveMarkedRider(
        TargetChoiceFillKind,
        attackRollHoles,
        BattleTargetSelectionOwner,
      ),
      resolveMarkedRider(
        AttackRollFillKind,
        rolledDiceHoles,
        BattleAttackRollOwner,
      ),
      resolveMarkedRider(
        RolledDiceFillKind,
        noHoles,
        BattleHitPointOwner,
      ),
    )

  pure def markedRiderTransferAvailabilityRoute: List[ReducerRouteEvent] =
    List(
      resolveMarkedRiderWithoutFill(BattleHitPointAndZeroHpLifecycleOwner),
      resolveMarkedRiderWithoutFill(BattleActiveEffectOwner),
    )

  pure def markedRiderTransferRoute: List[ReducerRouteEvent] =
    List(
      discoverMarkedRider(targetChoiceHoles, BattleActionEconomyOwner),
      resolveMarkedRider(
        TargetChoiceFillKind,
        noHoles,
        BattleTargetSelectionOwner,
      ),
      resolveMarkedRiderWithoutFill(BattleActiveEffectOwner),
    )

  pure def immunityTemporaryHpAdmissionRoute: List[ReducerRouteEvent] =
    List(
      discoverImmunityTemporaryHp(
        targetChoiceHoles,
        BattleSpellSlotAndActionEconomyOwner,
      ),
      resolveImmunityTemporaryHp(
        TargetChoiceFillKind,
        noHoles,
        BattleTargetSelectionOwner,
      ),
      resolveImmunityTemporaryHpWithoutFill(BattleActiveEffectOwner),
      resolveImmunityTemporaryHpWithoutFill(BattleConcentrationOwner),
    )

  pure def conditionImmunityProjectionRoute: List[ReducerRouteEvent] =
    List(
      resolveImmunityTemporaryHpWithoutFill(BattleConditionLifecycleOwner),
      resolveImmunityTemporaryHpWithoutFill(BattleActiveEffectOwner),
    )

  pure def turnStartTemporaryHitPointRoute: List[ReducerRouteEvent] =
    List(
      discoverImmunityTemporaryHp(noHoles, BattleTurnBoundaryOwner),
      resolveImmunityTemporaryHpWithoutFill(BattleTemporaryHitPointOwner),
    )

  pure def immunityTemporaryHpCleanupRoute: List[ReducerRouteEvent] =
    List(
      resolveImmunityTemporaryHpWithoutFill(BattleConcentrationOwner),
      resolveImmunityTemporaryHpWithoutFill(BattleActiveEffectOwner),
    )

  pure def markedRiderAdmissionFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      markedFact(RouteMarkedDamageRiderTransfer({
        transfer: TransferAwaitsMarkedTargetDrop,
      })),
    )

  pure def targetedAbilityCheckMarkedRiderAdmissionFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      markedFact(RouteMarkedDamageRiderTargetedAbilityCheckRollMode({
        rollMode: TargetScopedSelectedAbility,
      })),
      markedFact(RouteMarkedDamageRiderOwner({
        owner: MarkedRiderBattleActiveEffectProjectionOwner,
      })),
      markedFact(RouteMarkedDamageRiderOwner({
        owner: MarkedRiderBattleConcentrationOwner,
      })),
    )

  pure def targetedAbilityCheckRollModeProjectionFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      markedFact(RouteMarkedDamageRiderTargetedAbilityCheckRollMode({
        rollMode: MatchingTargetSelectedAbilityCheckDisadvantage,
      })),
      markedFact(RouteMarkedDamageRiderTargetedAbilityCheckRollMode({
        rollMode: NonmatchingAbilityCheckNormal,
      })),
      markedFact(RouteMarkedDamageRiderTargetedAbilityCheckRollMode({
        rollMode: NonmarkedActorAbilityCheckNormal,
      })),
      markedFact(RouteMarkedDamageRiderOwner({
        owner: MarkedRiderBattleAbilityCheckRollModeOwner,
      })),
    )

  pure def targetedAbilityCheckRollModeCleanupFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      markedFact(RouteMarkedDamageRiderTargetedAbilityCheckRollMode({
        rollMode: ConcentrationCleanupRestoresNormalAbilityCheck,
      })),
      markedFact(RouteMarkedDamageRiderOwner({
        owner: MarkedRiderBattleConcentrationOwner,
      })),
      markedFact(RouteMarkedDamageRiderOwner({
        owner: MarkedRiderBattleActiveEffectCleanupOwner,
      })),
    )

  pure def markedRiderDamageProjectionFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      markedFact(RouteMarkedDamageRiderHost({
        host: AttackRollHitMarkedTarget,
      })),
      markedFact(RouteMarkedDamageRiderDamage({
        damage: ExtraDamageOnMarkedTargetHit,
      })),
    )

  pure def markedRiderTransferAvailabilityFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      markedFact(RouteMarkedDamageRiderTransfer({
        transfer: TransferAvailableAfterMarkedTargetDrops,
      })),
    )

  pure def markedRiderSameTurnTransferFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      markedFact(RouteMarkedDamageRiderTransfer({
        transfer: TransferAvailableOnSameTurn,
      })),
      markedFact(RouteMarkedDamageRiderTransfer({
        transfer: TransferConsumesBonusAction,
      })),
      markedFact(RouteMarkedDamageRiderTransfer({
        transfer: TransferResetsAwaitingMarkedTargetDrop,
      })),
    )

  pure def markedRiderLaterTurnTransferFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      markedFact(RouteMarkedDamageRiderTransfer({
        transfer: TransferAvailableOnLaterTurn,
      })),
      markedFact(RouteMarkedDamageRiderTransfer({
        transfer: TransferConsumesBonusAction,
      })),
      markedFact(RouteMarkedDamageRiderTransfer({
        transfer: TransferResetsAwaitingMarkedTargetDrop,
      })),
    )

  pure def immunityTemporaryHpAdmissionFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      immunityFact(RouteConditionImmunityTemporaryHitPointCondition({
        condition: FrightenedConditionImmunity,
      })),
      immunityFact(RouteConditionImmunityTemporaryHitPointEffect({
        effect: ConditionImmunityApplied,
      })),
      immunityFact(RouteConditionImmunityTemporaryHitPointEffect({
        effect: TurnStartTemporaryHitPointGrantScheduled,
      })),
      immunityFact(RouteConditionImmunityTemporaryHitPointOwner({
        owner: BattleActiveEffectProjectionOwner,
      })),
    )

  pure def conditionImmunityProjectionFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      immunityFact(RouteConditionImmunityTemporaryHitPointEffect({
        effect: ConditionApplicationRejectedByImmunity,
      })),
      immunityFact(RouteConditionImmunityTemporaryHitPointOwner({
        owner: BattleConditionLifecycleProjectionOwner,
      })),
    )

  pure def turnStartTemporaryHitPointFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      immunityFact(RouteConditionImmunityTemporaryHitPointEffect({
        effect: TurnStartTemporaryHitPointsGranted,
      })),
      immunityFact(RouteConditionImmunityTemporaryHitPointEffect({
        effect: TemporaryHitPointsUseNonStackingChoice,
      })),
      immunityFact(RouteConditionImmunityTemporaryHitPointOwner({
        owner: BattleTurnBoundaryProjectionOwner,
      })),
      immunityFact(RouteConditionImmunityTemporaryHitPointOwner({
        owner: BattleTemporaryHitPointProjectionOwner,
      })),
    )

  pure def immunityTemporaryHpCleanupFacts: List[MarkedDamageImmunityRouteFact] =
    List(
      immunityFact(RouteConditionImmunityTemporaryHitPointEffect({
        effect: ConcentrationCleanupPreventsLaterTurnStartGrant,
      })),
      immunityFact(RouteConditionImmunityTemporaryHitPointOwner({
        owner: ImmunityBattleConcentrationCleanupOwner,
      })),
      immunityFact(RouteConditionImmunityTemporaryHitPointOwner({
        owner: ImmunityBattleActiveEffectCleanupOwner,
      })),
    )

  action recordSurface(
    surface: MarkedDamageImmunityRouteSurface,
    route: List[ReducerRouteEvent],
    facts: List[MarkedDamageImmunityRouteFact],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
    qFacts' = facts,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute), List())

  action doAdmitMarkedDamageRider = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      MarkedDamageRiderAdmittedRouteSurface,
      qRoute.concat(markedRiderAdmissionRoute),
      markedRiderAdmissionFacts,
    ),
  }

  action doProjectMarkedDamageRiderOnHit = all {
    qSurface == MarkedDamageRiderAdmittedRouteSurface,
    recordSurface(
      MarkedDamageRiderProjectedRouteSurface,
      qRoute.concat(markedRiderAttackHitProjectionRoute),
      qFacts.concat(markedRiderDamageProjectionFacts),
    ),
  }

  action doOpenMarkedDamageRiderTransferAfterTargetDrop = all {
    qSurface.in(Set(
      MarkedDamageRiderAdmittedRouteSurface,
      MarkedDamageRiderProjectedRouteSurface,
    )),
    recordSurface(
      MarkedDamageRiderTransferAvailableRouteSurface,
      qRoute.concat(markedRiderTransferAvailabilityRoute),
      qFacts.concat(markedRiderTransferAvailabilityFacts),
    ),
  }

  action doTransferMarkedDamageRiderSameTurn = all {
    qSurface == MarkedDamageRiderTransferAvailableRouteSurface,
    recordSurface(
      MarkedDamageRiderSameTurnTransferRouteSurface,
      qRoute.concat(markedRiderTransferRoute),
      qFacts.concat(markedRiderSameTurnTransferFacts),
    ),
  }

  action doTransferMarkedDamageRiderLaterTurn = all {
    qSurface == MarkedDamageRiderTransferAvailableRouteSurface,
    recordSurface(
      MarkedDamageRiderLaterTurnTransferRouteSurface,
      qRoute
        .append(resolveMarkedRiderWithoutFill(BattleTurnBoundaryOwner))
        .concat(markedRiderTransferRoute),
      qFacts.concat(markedRiderLaterTurnTransferFacts),
    ),
  }

  action doAdmitTargetedAbilityCheckMarkedDamageRider = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      TargetedAbilityCheckMarkedDamageRiderAdmittedRouteSurface,
      qRoute.concat(targetedAbilityCheckMarkedRiderAdmissionRoute),
      targetedAbilityCheckMarkedRiderAdmissionFacts,
    ),
  }

  action doProjectTargetedAbilityCheckRollMode = all {
    qSurface == TargetedAbilityCheckMarkedDamageRiderAdmittedRouteSurface,
    recordSurface(
      TargetedAbilityCheckRollModeProjectedRouteSurface,
      qRoute.concat(targetedAbilityCheckRollModeProjectionRoute),
      qFacts.concat(targetedAbilityCheckRollModeProjectionFacts),
    ),
  }

  action doCleanupTargetedAbilityCheckRollMode = all {
    qSurface == TargetedAbilityCheckRollModeProjectedRouteSurface,
    recordSurface(
      TargetedAbilityCheckRollModeCleanedUpRouteSurface,
      qRoute.concat(targetedAbilityCheckRollModeCleanupRoute),
      qFacts.concat(targetedAbilityCheckRollModeCleanupFacts),
    ),
  }

  action doAdmitConditionImmunityTemporaryHitPoints = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      ConditionImmunityTemporaryHitPointAdmittedRouteSurface,
      qRoute.concat(immunityTemporaryHpAdmissionRoute),
      immunityTemporaryHpAdmissionFacts,
    ),
  }

  action doProjectConditionImmunity = all {
    qSurface == ConditionImmunityTemporaryHitPointAdmittedRouteSurface,
    recordSurface(
      ConditionImmunityProjectedRouteSurface,
      qRoute.concat(conditionImmunityProjectionRoute),
      qFacts.concat(conditionImmunityProjectionFacts),
    ),
  }

  action doGrantTurnStartTemporaryHitPoints = all {
    qSurface.in(Set(
      ConditionImmunityTemporaryHitPointAdmittedRouteSurface,
      ConditionImmunityProjectedRouteSurface,
    )),
    recordSurface(
      TurnStartTemporaryHitPointsGrantedRouteSurface,
      qRoute.concat(turnStartTemporaryHitPointRoute),
      qFacts.concat(turnStartTemporaryHitPointFacts),
    ),
  }

  action doCleanupConditionImmunityTemporaryHitPoints = all {
    qSurface.in(Set(
      ConditionImmunityTemporaryHitPointAdmittedRouteSurface,
      ConditionImmunityProjectedRouteSurface,
      TurnStartTemporaryHitPointsGrantedRouteSurface,
    )),
    recordSurface(
      ConditionImmunityTemporaryHitPointCleanupRouteSurface,
      qRoute.concat(immunityTemporaryHpCleanupRoute),
      qFacts.concat(immunityTemporaryHpCleanupFacts),
    ),
  }

  action doStutterAfterTerminalSurface = all {
    qSurface.in(Set(
      MarkedDamageRiderSameTurnTransferRouteSurface,
      MarkedDamageRiderLaterTurnTransferRouteSurface,
      TargetedAbilityCheckRollModeCleanedUpRouteSurface,
      ConditionImmunityTemporaryHitPointCleanupRouteSurface,
    )),
    recordSurface(qSurface, qRoute, qFacts),
  }

  action step = any {
    doAdmitMarkedDamageRider,
    doProjectMarkedDamageRiderOnHit,
    doOpenMarkedDamageRiderTransferAfterTargetDrop,
    doTransferMarkedDamageRiderSameTurn,
    doTransferMarkedDamageRiderLaterTurn,
    doAdmitTargetedAbilityCheckMarkedDamageRider,
    doProjectTargetedAbilityCheckRollMode,
    doCleanupTargetedAbilityCheckRollMode,
    doAdmitConditionImmunityTemporaryHitPoints,
    doProjectConditionImmunity,
    doGrantTurnStartTemporaryHitPoints,
    doCleanupConditionImmunityTemporaryHitPoints,
    doStutterAfterTerminalSurface,
  }
}
