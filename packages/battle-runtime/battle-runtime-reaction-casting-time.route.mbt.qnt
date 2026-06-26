// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Casting-Time:
//   Reaction casting time uses a spell-defined trigger.
// - .references/srd-5.2.1/Playing-the-Game.md#Reactions and
//   .references/srd-5.2.1/Rules-Glossary.md#Reaction: taking a Reaction spends
//   it until the start of the reactor's next turn, and an interrupted creature
//   can continue after the Reaction.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Counterspell:
//   Counterspell interrupts a spell being cast; an ended slotted spell has no
//   effect and does not expend the triggering slot.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Hellish-Rebuke:
//   Hellish Rebuke resolves after damage through a save and Fire damage.
// - UBIQUITOUS_LANGUAGE.md: Reaction, Spell Slot, Magic Action, Saving Throw,
//   Damage Roll, Spell Effect, Offer, Decline, and Advance.
module battleRuntimeReactionCastingTimeRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type ReactionCastingTimeRouteSurface =
    | FreshRouteSurface
    | CounterspellEndedSpellCastRouteSurface
    | CounterspellAllowedSpellCastResumeRouteSurface
    | HellishRebukeAfterDamageRouteSurface

  var qSurface: ReactionCastingTimeRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val interruptDecisionHoles: Set[BattleHoleFamilyKind] =
    Set(InterruptDecisionHoleKind)
  pure val rolledDiceHoles: Set[BattleHoleFamilyKind] =
    Set(RolledDiceHoleKind)

  pure def discoverReactionSpell(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      ReactionSpellRouteSubject,
      holes,
      owner,
    )

  pure def resolveSlotSpell(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      SlotSpellRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveReactionInterrupt(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleInterrupt(
      ReactionSpellRouteSubject,
      InterruptDecisionFillKind,
      holes,
      owner,
    )

  pure def pendingReactionDecisionRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      discoverReactionSpell(interruptDecisionHoles, BattleInterruptStackOwner),
    )

  action recordRoute(
    surface: ReactionCastingTimeRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordRoute(
    FreshRouteSurface,
    List(startRoute),
  )

  action doCounterspellEndsSpellCast = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      CounterspellEndedSpellCastRouteSurface,
      pendingReactionDecisionRoute
        .append(resolveReactionInterrupt(noHoles, BattleInterruptStackOwner))
        .append(
          resolveReactionInterrupt(
            noHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        ),
    ),
  }

  action doCounterspellAllowsSpellCastResume = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      CounterspellAllowedSpellCastResumeRouteSurface,
      pendingReactionDecisionRoute
        .append(
          resolveReactionInterrupt(
            rolledDiceHoles,
            BattleInterruptStackOwner,
          )
        )
        .append(
          resolveReactionInterrupt(
            rolledDiceHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        )
        .append(
          resolveSlotSpell(
            RolledDiceFillKind,
            noHoles,
            BattleHitPointOwner,
          )
        )
        .append(
          resolveSlotSpell(
            RolledDiceFillKind,
            noHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        ),
    ),
  }

  action doHellishRebukeAfterDamage = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      HellishRebukeAfterDamageRouteSurface,
      pendingReactionDecisionRoute
        .append(resolveReactionInterrupt(noHoles, BattleInterruptStackOwner))
        .append(
          resolveReactionInterrupt(
            noHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        )
        .append(resolveReactionInterrupt(noHoles, BattleHitPointOwner)),
    ),
  }

  action step = any {
    doCounterspellEndsSpellCast,
    doCounterspellAllowsSpellCastResume,
    doHellishRebukeAfterDamage,
  }
}
