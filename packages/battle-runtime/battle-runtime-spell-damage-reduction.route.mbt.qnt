// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-Q-R.md#Resistance defines a
//   chosen damage type and a 1d4 reduction when the target takes matching
//   damage, usable once per turn.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage and #D20 Tests define
//   damage resolution and rolled modifiers.
// - UBIQUITOUS_LANGUAGE.md: Damage, Damage Type, Spell Invocation, Spell
//   Effect, Concentration, and Table Decision.
module battleRuntimeSpellDamageReductionRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type SpellDamageReductionRouteSurface =
    | FreshRouteSurface
    | TargetChoiceFrontierRouteSurface
    | DamageTypeChoiceFrontierRouteSurface
    | ActiveEffectResolvedRouteSurface
    | DamageReductionRolledRouteSurface

  var qSurface: SpellDamageReductionRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def noHoles: Set[BattleHoleFamilyKind] = Set()

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverSpellDamageReduction(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      SpellDamageReductionRouteSubject,
      holes,
      owner,
    )

  pure def resolveSpellDamageReduction(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      SpellDamageReductionRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveSpellDamageReductionWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      SpellDamageReductionRouteSubject,
      holes,
      owner,
    )

  action recordSurface(
    surface: SpellDamageReductionRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doDiscoverResistanceTargetChoice = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      TargetChoiceFrontierRouteSurface,
      qRoute.append(
        discoverSpellDamageReduction(
          Set(TargetChoiceHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        )
      ),
    ),
  }

  action doFillResistanceTarget = all {
    qSurface == TargetChoiceFrontierRouteSurface,
    recordSurface(
      DamageTypeChoiceFrontierRouteSurface,
      qRoute.append(
        resolveSpellDamageReduction(
          TargetChoiceFillKind,
          Set(DamageTypeChoiceHoleKind),
          BattleTargetSelectionOwner,
        )
      ),
    ),
  }

  action doChooseResistanceDamageType = all {
    qSurface == DamageTypeChoiceFrontierRouteSurface,
    recordSurface(
      ActiveEffectResolvedRouteSurface,
      qRoute
        .append(
          resolveSpellDamageReduction(
            DamageTypeChoiceFillKind,
            noHoles,
            BattleActiveEffectOwner,
          )
        )
        .append(
          resolveSpellDamageReductionWithoutFill(
            noHoles,
            BattleConcentrationOwner,
          )
        ),
    ),
  }

  action doApplyResistanceReductionRoll = all {
    qSurface == ActiveEffectResolvedRouteSurface,
    recordSurface(
      DamageReductionRolledRouteSurface,
      qRoute
        .append(
          discoverSpellDamageReduction(
            Set(RolledDiceHoleKind),
            BattleDamageAdjustmentOwner,
          )
        )
        .append(
          resolveSpellDamageReduction(
            RolledDiceFillKind,
            noHoles,
            BattleDamageAdjustmentOwner,
          )
        )
        .append(
          resolveSpellDamageReductionWithoutFill(
            noHoles,
            BattleActiveEffectOwner,
          )
        ),
    ),
  }

  action step = any {
    doDiscoverResistanceTargetChoice,
    doFillResistanceTarget,
    doChooseResistanceDamageType,
    doApplyResistanceReductionRoll,
  }
}
