// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack allows attacks
//   to cause special effects in addition to or instead of damage.
// - .references/srd-5.2.1/Playing-the-Game.md#Healing defines Hit Point regain
//   and maximum capping.
// - packages/shared-algebras/proofs/rule-core/spell-damage-projection-core.qnt
//   names SpellAttackHitPointRegainPreventionHitProjection as an attack-hit
//   projection fact.
// - UBIQUITOUS_LANGUAGE.md: Hit Points, Spell Effect, Attack Roll, and Action
//   Lifecycle.
module battleRuntimeHitPointRegainPreventionRouteMbt {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type HitPointRegainPreventionRouteSurface =
    | FreshRouteSurface
    | AttackHitEffectActiveRouteSurface
    | LaterHealingInterdictedRouteSurface
    | PreventionEffectExpiredRouteSurface

  var qSurface: HitPointRegainPreventionRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def discoverAttackHit: ReducerRouteEvent =
    routeDiscoverBattleActs(
      SpellAttackRouteSubject,
      Set(TargetChoiceHoleKind),
      BattleActionEconomyOwner,
    )

  pure def resolveAttackTarget: ReducerRouteEvent =
    routeResolveBattleSubject(
      SpellAttackRouteSubject,
      TargetChoiceFillKind,
      Set(AttackRollHoleKind),
      BattleTargetSelectionOwner,
    )

  pure def resolveAttackHit: ReducerRouteEvent =
    routeResolveBattleSubject(
      SpellAttackRouteSubject,
      AttackRollFillKind,
      Set(RolledDiceHoleKind),
      BattleAttackRollOwner,
    )

  pure def resolveHitDamage: ReducerRouteEvent =
    routeResolveBattleSubject(
      SpellAttackRouteSubject,
      RolledDiceFillKind,
      Set(),
      BattleHitPointOwner,
    )

  pure def admitPreventionEffect: ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      HitPointRegainPreventionRouteSubject,
      Set(),
      BattleActiveEffectOwner,
    )

  pure def interdictLaterHealing: ReducerRouteEvent =
    routeResolveBattleSubject(
      HitPointRegainPreventionRouteSubject,
      HitPointHealingDistributionFillKind,
      Set(),
      BattleHitPointOwner,
    )

  pure def expirePreventionDurationBoundary: ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      HitPointRegainPreventionRouteSubject,
      Set(),
      BattleTurnBoundaryOwner,
    )

  pure def cleanupPreventionActiveEffect: ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      HitPointRegainPreventionRouteSubject,
      Set(),
      BattleActiveEffectOwner,
    )

  action recordSurface(
    surface: HitPointRegainPreventionRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(
    FreshRouteSurface,
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doAdmitAttackHitRegainPreventionEffect = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      AttackHitEffectActiveRouteSurface,
      qRoute
        .append(discoverAttackHit)
        .append(resolveAttackTarget)
        .append(resolveAttackHit)
        .append(resolveHitDamage)
        .append(admitPreventionEffect),
    ),
  }

  action doInterdictLaterHitPointHealing = all {
    qSurface == AttackHitEffectActiveRouteSurface,
    recordSurface(
      LaterHealingInterdictedRouteSurface,
      qRoute.append(interdictLaterHealing),
    ),
  }

  action doExpireAtTurnBoundary = all {
    qSurface == LaterHealingInterdictedRouteSurface,
    recordSurface(
      PreventionEffectExpiredRouteSurface,
      qRoute
        .append(expirePreventionDurationBoundary)
        .append(cleanupPreventionActiveEffect),
    ),
  }

  action doStutterAfterExpiry = all {
    qSurface == PreventionEffectExpiredRouteSurface,
    recordSurface(qSurface, qRoute),
  }

  action step = any {
    doAdmitAttackHitRegainPreventionEffect,
    doInterdictLaterHitPointHealing,
    doExpireAtTurnBoundary,
    doStutterAfterExpiry,
  }
}
