// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Sanctuary defines ward
//   creation, direct attack/damaging-spell interdiction, Wisdom save outcome,
//   replacement target choice, area-effect exclusion, and early ward end.
// - .references/srd-5.2.1/Rules-Glossary.md#Target and #Area of Effect define
//   target and area-effect boundaries.
// - UBIQUITOUS_LANGUAGE.md: Area of Effect, Spell Invocation, Spell Effect,
//   Saving Throw, Attack Roll, and Target.
module battleRuntimeSanctuarySelectedIdentityRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type WardedTargetInterdictionRouteSurface =
    | FreshRouteSurface
    | WardCreationRouteSurface
    | DirectAttackFailedSaveLossRouteSurface
    | DirectSpellSuccessfulSavePassThroughRouteSurface
    | LegalReplacementTargetRouteSurface
    | IllegalReplacementTargetRouteSurface
    | AreaEffectExcludedRouteSurface
    | WardedAttackRollEarlyEndRouteSurface
    | WardedSpellCastEarlyEndRouteSurface
    | WardedDamageEarlyEndRouteSurface

  var qSurface: WardedTargetInterdictionRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def noHoles: Set[BattleHoleFamilyKind] = Set()

  pure def discoverWard(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(WardedTargetInterdictionRouteSubject, holes, owner)

  pure def resolveWard(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      WardedTargetInterdictionRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveWardWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      WardedTargetInterdictionRouteSubject,
      holes,
      owner,
    )

  action recordRoute(
    surface: WardedTargetInterdictionRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordRoute(FreshRouteSurface, List(startRoute))

  action doCastSanctuaryWardCreation = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      WardCreationRouteSurface,
      List(
        startRoute,
        discoverWard(Set(TargetChoiceHoleKind), BattleSpellSlotAndActionEconomyOwner),
        resolveWard(TargetChoiceFillKind, noHoles, BattleTargetSelectionOwner),
        resolveWardWithoutFill(noHoles, BattleActiveEffectOwner),
      ),
    ),
  }

  action doInterdictDirectAttackFailedSaveLoss = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      DirectAttackFailedSaveLossRouteSurface,
      List(
        startRoute,
        discoverWard(
          Set(SanctuaryInterdictionOutcomeHoleKind),
          BattleActiveEffectOwner,
        ),
        resolveWard(
          SanctuaryInterdictionOutcomeFillKind,
          noHoles,
          BattleSavingThrowOutcomeOwner,
        ),
        resolveWardWithoutFill(noHoles, BattleActionEconomyOwner),
      ),
    ),
  }

  action doInterdictDirectSpellSuccessfulSavePassThrough = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      DirectSpellSuccessfulSavePassThroughRouteSurface,
      List(
        startRoute,
        discoverWard(
          Set(SanctuaryInterdictionOutcomeHoleKind),
          BattleActiveEffectOwner,
        ),
        resolveWard(
          SanctuaryInterdictionOutcomeFillKind,
          noHoles,
          BattleSavingThrowOutcomeOwner,
        ),
        resolveWardWithoutFill(noHoles, BattleHoleFrontierOwner),
      ),
    ),
  }

  action doRetargetDirectAttackToLegalReplacement = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      LegalReplacementTargetRouteSurface,
      List(
        startRoute,
        discoverWard(
          Set(SanctuaryInterdictionOutcomeHoleKind, TargetChoiceHoleKind),
          BattleActiveEffectOwner,
        ),
        resolveWard(
          SanctuaryInterdictionOutcomeFillKind,
          Set(TargetChoiceHoleKind),
          BattleSavingThrowOutcomeOwner,
        ),
        resolveWard(TargetChoiceFillKind, noHoles, BattleTargetSelectionOwner),
      ),
    ),
  }

  action doRejectIllegalReplacementTarget = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      IllegalReplacementTargetRouteSurface,
      List(
        startRoute,
        discoverWard(
          Set(SanctuaryInterdictionOutcomeHoleKind, TargetChoiceHoleKind),
          BattleActiveEffectOwner,
        ),
        resolveWard(
          SanctuaryInterdictionOutcomeFillKind,
          Set(TargetChoiceHoleKind),
          BattleSavingThrowOutcomeOwner,
        ),
        resolveWard(
          TargetChoiceFillKind,
          Set(TargetChoiceHoleKind),
          BattleTargetSelectionOwner,
        ),
      ),
    ),
  }

  action doExcludeAreaEffectFromInterdiction = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      AreaEffectExcludedRouteSurface,
      List(
        startRoute,
        discoverWard(noHoles, BattleAreaShapeOwner),
        resolveWardWithoutFill(noHoles, BattleAreaShapeOwner),
      ),
    ),
  }

  action doEndWardOnWardedAttackRoll = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      WardedAttackRollEarlyEndRouteSurface,
      List(
        startRoute,
        discoverWard(noHoles, BattleActiveEffectOwner),
        resolveWardWithoutFill(noHoles, BattleAttackRollOwner),
        resolveWardWithoutFill(noHoles, BattleActiveEffectOwner),
      ),
    ),
  }

  action doEndWardOnWardedSpellCast = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      WardedSpellCastEarlyEndRouteSurface,
      List(
        startRoute,
        discoverWard(noHoles, BattleActiveEffectOwner),
        resolveWardWithoutFill(noHoles, BattleSpellSlotAndActionEconomyOwner),
        resolveWardWithoutFill(noHoles, BattleActiveEffectOwner),
      ),
    ),
  }

  action doEndWardOnWardedDamageDealt = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      WardedDamageEarlyEndRouteSurface,
      List(
        startRoute,
        discoverWard(noHoles, BattleActiveEffectOwner),
        resolveWardWithoutFill(noHoles, BattleHitPointOwner),
        resolveWardWithoutFill(noHoles, BattleActiveEffectOwner),
      ),
    ),
  }

  action step = any {
    doCastSanctuaryWardCreation,
    doInterdictDirectAttackFailedSaveLoss,
    doInterdictDirectSpellSuccessfulSavePassThrough,
    doRetargetDirectAttackToLegalReplacement,
    doRejectIllegalReplacementTarget,
    doExcludeAreaEffectFromInterdiction,
    doEndWardOnWardedAttackRoll,
    doEndWardOnWardedSpellCast,
    doEndWardOnWardedDamageDealt,
  }
}
