// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Aid defines Hit Point
//   maximum and current Hit Point increases for the duration.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#False Life and
//   #Longstrider define Temporary Hit Points and Speed increases.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield of Faith and
//   #Spider Climb define Armor Class and special-Speed active effects.
// - UBIQUITOUS_LANGUAGE.md: Armor Class, Speed, Hit Point Maximum, Temporary
//   Hit Points, Spell Invocation, and Spell Effect.
module battleRuntimeScalarBuffActiveEffectsRouteMbt {
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type ScalarBuffRouteSurface =
    | FreshRouteSurface
    | ArmorClassBonusActiveEffectRouteSurface
    | SpeedDeltaActiveEffectRouteSurface
    | SpecialSpeedGrantActiveEffectRouteSurface
    | HitPointMaximumIncreaseActiveEffectRouteSurface
    | TemporaryHitPointEffectRouteSurface

  var qSurface: ScalarBuffRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverScalarBuff(owner: ReducerRouteOwnerGroup): ReducerRouteEvent =
    routeDiscoverBattleActs(ScalarBuffEffectRouteSubject, Set(), owner)

  pure def resolveScalarBuff(owner: ReducerRouteOwnerGroup): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(ScalarBuffEffectRouteSubject, Set(), owner)

  pure def spellInvocationOwner: ReducerRouteOwnerGroup =
    BattleSpellSlotAndActionEconomyOwner

  action recordSurface(
    surface: ScalarBuffRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doCastShieldOfFaith = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      ArmorClassBonusActiveEffectRouteSurface,
      qRoute
        .append(discoverScalarBuff(spellInvocationOwner))
        .append(resolveScalarBuff(BattleActiveEffectOwner))
        .append(resolveScalarBuff(BattleConcentrationOwner)),
    ),
  }

  action doCastLongstrider = all {
    qSurface == ArmorClassBonusActiveEffectRouteSurface,
    recordSurface(
      SpeedDeltaActiveEffectRouteSurface,
      qRoute
        .append(discoverScalarBuff(spellInvocationOwner))
        .append(resolveScalarBuff(BattleActiveEffectOwner))
        .append(resolveScalarBuff(BattleMovementResourceOwner)),
    ),
  }

  action doCastSpiderClimb = all {
    qSurface == SpeedDeltaActiveEffectRouteSurface,
    recordSurface(
      SpecialSpeedGrantActiveEffectRouteSurface,
      qRoute
        .append(discoverScalarBuff(spellInvocationOwner))
        .append(resolveScalarBuff(BattleActiveEffectOwner))
        .append(resolveScalarBuff(BattleMovementResourceOwner))
        .append(resolveScalarBuff(BattleConcentrationOwner)),
    ),
  }

  action doCastAid = all {
    qSurface == SpecialSpeedGrantActiveEffectRouteSurface,
    recordSurface(
      HitPointMaximumIncreaseActiveEffectRouteSurface,
      qRoute
        .append(discoverScalarBuff(spellInvocationOwner))
        .append(resolveScalarBuff(BattleActiveEffectOwner))
        .append(resolveScalarBuff(BattleHitPointOwner)),
    ),
  }

  action doCastFalseLife = all {
    qSurface == HitPointMaximumIncreaseActiveEffectRouteSurface,
    recordSurface(
      TemporaryHitPointEffectRouteSurface,
      qRoute
        .append(discoverScalarBuff(spellInvocationOwner))
        .append(resolveScalarBuff(BattleTemporaryHitPointOwner)),
    ),
  }

  action doStutter = all {
    qSurface == TemporaryHitPointEffectRouteSurface,
    recordSurface(qSurface, qRoute),
  }

  action step = any {
    doCastShieldOfFaith,
    doCastLongstrider,
    doCastSpiderClimb,
    doCastAid,
    doCastFalseLife,
    doStutter,
  }
}
