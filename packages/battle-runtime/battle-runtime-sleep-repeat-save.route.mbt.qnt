// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Sleep defines the
//   initial save, pending repeat save, failed-repeat Unconscious condition, and
//   cleanup when the spell ends.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration defines effect end
//   when the creator loses Concentration.
// - UBIQUITOUS_LANGUAGE.md: Condition, Concentration, Boundary Crossing, Spell
//   Effect, and Turn Structure.
module battleRuntimeSleepRepeatSaveRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type SleepRepeatSaveRouteSurface =
    | FreshRouteSurface
    | InitialSaveConditionAppliedRouteSurface
    | ConcentrationBrokenBeforeRepeatRouteSurface
    | CasterTurnEndedWithEffectRouteSurface
    | CasterTurnEndedAfterConcentrationBreakRouteSurface
    | TargetTurnEndedAfterConcentrationBreakRouteSurface
    | RepeatSaveFrontierRouteSurface
    | RepeatSaveSuccessCleanupRouteSurface
    | RepeatSaveFailureUnconsciousRouteSurface

  var qSurface: SleepRepeatSaveRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverRepeatSave(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      RepeatSaveConditionEffectRouteSubject,
      holes,
      owner,
    )

  pure def resolveRepeatSave(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      RepeatSaveConditionEffectRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveRepeatSaveWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      RepeatSaveConditionEffectRouteSubject,
      Set(),
      owner,
    )

  action recordSurface(
    surface: SleepRepeatSaveRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doFillInitialSaveFailure = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      InitialSaveConditionAppliedRouteSurface,
      qRoute
        .append(
          discoverRepeatSave(
            Set(SavingThrowOutcomeHoleKind),
            BattleSpellSlotAndActionEconomyOwner,
          )
        )
        .append(
          resolveRepeatSave(
            SavingThrowOutcomeFillKind,
            Set(),
            BattleConditionLifecycleOwner,
          )
        )
        .append(resolveRepeatSaveWithoutFill(BattleActiveEffectOwner))
        .append(resolveRepeatSaveWithoutFill(BattleConcentrationOwner)),
    ),
  }

  action doBreakConcentrationBeforeRepeat = all {
    qSurface == InitialSaveConditionAppliedRouteSurface,
    recordSurface(
      ConcentrationBrokenBeforeRepeatRouteSurface,
      qRoute
        .append(resolveRepeatSaveWithoutFill(BattleConcentrationOwner))
        .append(resolveRepeatSaveWithoutFill(BattleActiveEffectOwner))
        .append(resolveRepeatSaveWithoutFill(BattleConditionLifecycleOwner)),
    ),
  }

  action doEndCasterTurn = all {
    qSurface == InitialSaveConditionAppliedRouteSurface,
    recordSurface(
      CasterTurnEndedWithEffectRouteSurface,
      qRoute.append(resolveRepeatSaveWithoutFill(BattleTurnBoundaryOwner)),
    ),
  }

  action doEndCasterTurnAfterConcentrationBreak = all {
    qSurface == ConcentrationBrokenBeforeRepeatRouteSurface,
    recordSurface(
      CasterTurnEndedAfterConcentrationBreakRouteSurface,
      qRoute.append(resolveRepeatSaveWithoutFill(BattleTurnBoundaryOwner)),
    ),
  }

  action doEndTargetTurnAfterConcentrationBreak = all {
    qSurface == CasterTurnEndedAfterConcentrationBreakRouteSurface,
    recordSurface(
      TargetTurnEndedAfterConcentrationBreakRouteSurface,
      qRoute.append(resolveRepeatSaveWithoutFill(BattleTurnBoundaryOwner)),
    ),
  }

  action doDiscoverRepeatSave = all {
    qSurface == CasterTurnEndedWithEffectRouteSurface,
    recordSurface(
      RepeatSaveFrontierRouteSurface,
      qRoute.append(
        discoverRepeatSave(
          Set(SavingThrowOutcomeHoleKind),
          BattleTurnBoundaryOwner,
        )
      ),
    ),
  }

  action doFillRepeatSaveSuccess = all {
    qSurface == RepeatSaveFrontierRouteSurface,
    recordSurface(
      RepeatSaveSuccessCleanupRouteSurface,
      qRoute
        .append(
          resolveRepeatSave(
            SavingThrowOutcomeFillKind,
            Set(),
            BattleConditionLifecycleOwner,
          )
        )
        .append(resolveRepeatSaveWithoutFill(BattleActiveEffectOwner)),
    ),
  }

  action doFillRepeatSaveFailure = all {
    qSurface == RepeatSaveFrontierRouteSurface,
    recordSurface(
      RepeatSaveFailureUnconsciousRouteSurface,
      qRoute.append(
        resolveRepeatSave(
          SavingThrowOutcomeFillKind,
          Set(),
          BattleConditionLifecycleOwner,
        )
      ),
    ),
  }

  action step = any {
    doFillInitialSaveFailure,
    doBreakConcentrationBeforeRepeat,
    doEndCasterTurn,
    doEndCasterTurnAfterConcentrationBreak,
    doEndTargetTurnAfterConcentrationBreak,
    doDiscoverRepeatSave,
    doFillRepeatSaveSuccess,
    doFillRepeatSaveFailure,
  }
}
