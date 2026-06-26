// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Dropping to 0 Hit Points and
//   #Falling Unconscious define the zero-Hit-Point condition transition.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration and #Incapacitated
//   define concentration teardown when Incapacitated applies.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Eldritch Blast defines
//   separate attack rolls for separate beams.
// - UBIQUITOUS_LANGUAGE.md: Hit Points, Unconscious, Incapacitated,
//   Concentration, Spell Effect, and Spell Attack.
module battleRuntimeZeroHitPointMidResolutionRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type ZeroHitPointMidResolutionRouteSurface =
    | FreshRouteSurface
    | SpellAttackSequenceResolvedRouteSurface

  var qSurface: ZeroHitPointMidResolutionRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverSpellAttackProcedure(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(SpellAttackProcedureRouteSubject, holes, owner)

  pure def resolveSpellAttackProcedure(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      SpellAttackProcedureRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveTeardown(owner: ReducerRouteOwnerGroup): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      ZeroHitPointSpellEffectTeardownRouteSubject,
      Set(),
      owner,
    )

  action recordSurface(
    surface: ZeroHitPointMidResolutionRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doResolveEldritchBlast = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      SpellAttackSequenceResolvedRouteSurface,
      qRoute
        .append(
          discoverSpellAttackProcedure(
            Set(TargetChoiceHoleKind, AttackRollHoleKind, RolledDiceHoleKind),
            BattleSpellAttackProcedureOwner,
          )
        )
        .append(
          resolveSpellAttackProcedure(
            TargetChoiceFillKind,
            Set(TargetChoiceHoleKind, AttackRollHoleKind, RolledDiceHoleKind),
            BattleTargetSelectionOwner,
          )
        )
        .append(
          resolveSpellAttackProcedure(
            TargetChoiceFillKind,
            Set(AttackRollHoleKind, RolledDiceHoleKind),
            BattleTargetSelectionOwner,
          )
        )
        .append(
          resolveSpellAttackProcedure(
            AttackRollFillKind,
            Set(RolledDiceHoleKind),
            BattleAttackRollOwner,
          )
        )
        .append(
          resolveSpellAttackProcedure(
            RolledDiceFillKind,
            Set(ConcentrationSavingThrowHoleKind),
            BattleHitPointAndZeroHpLifecycleOwner,
          )
        )
        .append(
          resolveSpellAttackProcedure(
            ConcentrationSavingThrowFillKind,
            Set(AttackRollHoleKind, RolledDiceHoleKind),
            BattleConcentrationOwner,
          )
        )
        .append(resolveTeardown(BattleConditionLifecycleOwner))
        .append(resolveTeardown(BattleConcentrationOwner))
        .append(resolveTeardown(BattleActiveEffectOwner))
        .append(
          resolveSpellAttackProcedure(
            AttackRollFillKind,
            Set(RolledDiceHoleKind),
            BattleAttackRollOwner,
          )
        )
        .append(
          resolveSpellAttackProcedure(
            RolledDiceFillKind,
            Set(),
            BattleHitPointOwner,
          )
        ),
    ),
  }

  action step = any {
    doResolveEldritchBlast,
  }
}
