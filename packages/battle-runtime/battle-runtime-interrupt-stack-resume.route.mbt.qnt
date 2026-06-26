// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Reactions: a Reaction can
//   interrupt another creature's turn and that creature can continue afterward.
// - .references/srd-5.2.1/Rules-Glossary.md#Reaction: one Reaction is
//   available until the start of the creature's next turn.
// - .references/srd-5.2.1/Rules-Glossary.md#Ready-Action: a readied spell is
//   released as a Reaction when its trigger occurs.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Reaction-and-Bonus-Action-Triggers:
//   Reaction spells are cast in response to spell-defined triggers.
// - UBIQUITOUS_LANGUAGE.md: Offer, Decline, Advance, Reaction, Spell Effect,
//   Readied Spell Response, and Spell Slot.
module battleRuntimeInterruptStackResumeRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type InterruptStackResumeRouteSurface =
    | FreshRouteSurface
    | NestedDeclineResumedOuterInterruptRouteSurface
    | ActiveEffectMutationResumedRouteSurface
    | ProcedureContinuationResolvedRouteSurface

  var qSurface: InterruptStackResumeRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val interruptDecisionHoles: Set[BattleHoleFamilyKind] =
    Set(InterruptDecisionHoleKind)
  pure val savingThrowHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind)
  pure val rolledDiceHoles: Set[BattleHoleFamilyKind] =
    Set(RolledDiceHoleKind)

  pure def discoverInterruptResume(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      InterruptStackResumeRouteSubject,
      holes,
      owner,
    )

  pure def resolveSaveGatedSpell(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      SaveGatedSpellRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveWeaponAttack(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      WeaponAttackRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveInterruptResumeWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      InterruptStackResumeRouteSubject,
      holes,
      owner,
    )

  pure def resolveInterruptResumeDecision(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleInterrupt(
      InterruptStackResumeRouteSubject,
      InterruptDecisionFillKind,
      holes,
      owner,
    )

  pure def pendingInterruptDecisionRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      discoverInterruptResume(
        interruptDecisionHoles,
        BattleInterruptStackOwner,
      ),
    )

  pure def pendingDamageContinuationRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      discoverInterruptResume(rolledDiceHoles, BattleInterruptStackOwner),
    )

  action recordRoute(
    surface: InterruptStackResumeRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordRoute(
    FreshRouteSurface,
    List(startRoute),
  )

  action doNestedDeclineResumesOuterInterrupt = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      NestedDeclineResumedOuterInterruptRouteSurface,
      pendingInterruptDecisionRoute
        .append(
          resolveInterruptResumeDecision(
            savingThrowHoles,
            BattleInterruptStackOwner,
          )
        )
        .append(
          resolveSaveGatedSpell(
            SavingThrowOutcomeFillKind,
            interruptDecisionHoles,
            BattleInterruptStackOwner,
          )
        )
        .append(
          resolveInterruptResumeDecision(
            rolledDiceHoles,
            BattleInterruptStackOwner,
          )
        ),
    ),
  }

  action doShieldMutationResumesInterruptedAttack = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      ActiveEffectMutationResumedRouteSurface,
      pendingInterruptDecisionRoute
        .append(
          resolveInterruptResumeDecision(
            noHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        )
        .append(
          resolveInterruptResumeDecision(
            noHoles,
            BattleActiveEffectOwner,
          )
        )
        .append(
          resolveInterruptResumeDecision(
            noHoles,
            BattleInterruptStackOwner,
          )
        ),
    ),
  }

  action doReplayRecordedProcedureFromRoot = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      ProcedureContinuationResolvedRouteSurface,
      pendingDamageContinuationRoute
        .append(
          resolveWeaponAttack(
            RolledDiceFillKind,
            noHoles,
            BattleHitPointOwner,
          )
        )
        .append(
          resolveInterruptResumeWithoutFill(
            noHoles,
            BattleInterruptStackOwner,
          )
        ),
    ),
  }

  action step = any {
    doNestedDeclineResumesOuterInterrupt,
    doShieldMutationResumesInterruptedAttack,
    doReplayRecordedProcedureFromRoot,
  }
}
