// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack allows attacks
//   to cause special effects in addition to or instead of damage.
// - .references/srd-5.2.1/Playing-the-Game.md#Opportunity Attacks and
//   .references/srd-5.2.1/Rules-Glossary.md#Opportunity Attacks define the
//   movement-triggered Reaction family.
// - .references/srd-5.2.1/Rules-Glossary.md#Reaction defines Reaction
//   availability and reset timing.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md includes an attack-hit
//   Spell Effect that prevents Opportunity Attacks until the affected target's
//   next turn starts.
// - UBIQUITOUS_LANGUAGE.md: Opportunity Attack, Reaction, Spell Effect, Attack
//   Roll, and Action Lifecycle.
module battleRuntimeOpportunityAttackDenialRouteMbt {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeOpportunityAttackDenialRouteFacts.* from "./battle-runtime-opportunity-attack-denial-route-facts"

  type OpportunityAttackDenialRouteSurface =
    | FreshRouteSurface
    | DenialEffectActiveRouteSurface
    | DenialProjectedRouteSurface
    | DenialEffectExpiredRouteSurface

  var qSurface: OpportunityAttackDenialRouteSurface
  var qRoute: List[ReducerRouteEvent]
  var qFacts: List[ReactionInterdictionRouteFact]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()

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
      noHoles,
      BattleHitPointOwner,
    )

  pure def admitDenialEffect: ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      ReactionInterdictionRouteSubject,
      noHoles,
      BattleActiveEffectOwner,
    )

  pure def projectMovementDiscovery: ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      ReactionInterdictionRouteSubject,
      noHoles,
      BattleMovementResourceOwner,
    )

  pure def projectReactionDiscovery: ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      ReactionInterdictionRouteSubject,
      noHoles,
      BattleInterruptStackOwner,
    )

  pure def expireDenialDurationBoundary: ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      ReactionInterdictionRouteSubject,
      noHoles,
      BattleTurnBoundaryOwner,
    )

  pure def cleanupDenialActiveEffect: ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      ReactionInterdictionRouteSubject,
      noHoles,
      BattleActiveEffectOwner,
    )

  pure def admissionFacts: List[ReactionInterdictionRouteFact] =
    List(
      RouteReactionInterdictionSource({
        source: HostAttackHitDamageOutcome,
      }),
      RouteReactionInterdictionCarrier({
        carrier: HostOutcomeTargetCarrier,
      }),
      RouteReactionInterdictionScope({
        scope: AffectedTargetReactionsOnly,
      }),
      RouteReactionInterdictionTriggerFamily({
        triggerFamily: OpportunityAttackTriggerFamily,
      }),
      RouteReactionInterdictionExpirationBoundary({
        boundary: UntilAffectedTargetNextTurnStarts,
      }),
      RouteReactionInterdictionAdmitted,
    )

  pure def projectionFacts: List[ReactionInterdictionRouteFact] =
    List(
      RouteReactionInterdictionProjectedToMovementDiscovery,
      RouteReactionInterdictionProjectedToReactionDiscovery,
    )

  pure def expiryFacts: List[ReactionInterdictionRouteFact] =
    List(
      RouteReactionInterdictionExpired,
      RouteReactionInterdictionCleanedUp,
    )

  action recordSurface(
    surface: OpportunityAttackDenialRouteSurface,
    route: List[ReducerRouteEvent],
    facts: List[ReactionInterdictionRouteFact],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
    qFacts' = facts,
  }

  action init = recordSurface(
    FreshRouteSurface,
    List(routeStartBattle(BattleActionEconomyOwner)),
    List(),
  )

  action doAdmitAttackHitOpportunityAttackDenialEffect = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      DenialEffectActiveRouteSurface,
      qRoute
        .append(discoverAttackHit)
        .append(resolveAttackTarget)
        .append(resolveAttackHit)
        .append(resolveHitDamage)
        .append(admitDenialEffect),
      admissionFacts,
    ),
  }

  action doProjectOpportunityAttackDenialIntoMovementReactionDiscovery = all {
    qSurface == DenialEffectActiveRouteSurface,
    recordSurface(
      DenialProjectedRouteSurface,
      qRoute
        .append(projectMovementDiscovery)
        .append(projectReactionDiscovery),
      qFacts.concat(projectionFacts),
    ),
  }

  action doExpireActiveDenialAtAffectedTargetTurnStart = all {
    qSurface == DenialEffectActiveRouteSurface,
    recordSurface(
      DenialEffectExpiredRouteSurface,
      qRoute
        .append(expireDenialDurationBoundary)
        .append(cleanupDenialActiveEffect),
      qFacts.concat(expiryFacts),
    ),
  }

  action doExpireProjectedDenialAtAffectedTargetTurnStart = all {
    qSurface == DenialProjectedRouteSurface,
    recordSurface(
      DenialEffectExpiredRouteSurface,
      qRoute
        .append(expireDenialDurationBoundary)
        .append(cleanupDenialActiveEffect),
      qFacts.concat(expiryFacts),
    ),
  }

  action doStutterAfterCleanup = all {
    qSurface == DenialEffectExpiredRouteSurface,
    recordSurface(qSurface, qRoute, qFacts),
  }

  action step = any {
    doAdmitAttackHitOpportunityAttackDenialEffect,
    doProjectOpportunityAttackDenialIntoMovementReactionDiscovery,
    doExpireActiveDenialAtAffectedTargetTurnStart,
    doExpireProjectedDenialAtAffectedTargetTurnStart,
    doStutterAfterCleanup,
  }
}
