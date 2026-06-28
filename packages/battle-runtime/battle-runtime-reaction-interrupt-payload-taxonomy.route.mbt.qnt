// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Reactions and
//   .references/srd-5.2.1/Rules-Glossary.md#Reaction establish Reaction
//   triggers, Reaction spend, and interrupted-turn continuation.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Reaction-and-Bonus-Action-Triggers:
//   Reaction spells are cast in response to spell-defined triggers.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield defines an
//   attack-hit Reaction that creates an Armor Class bonus effect.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Hellish-Rebuke defines
//   an after-damage Reaction that resolves a Saving Throw and damage payload.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Counterspell defines a
//   spell-cast interruption and possible spell-cast continuation.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Feather-Fall defines a
//   falling-trigger Reaction and falling-damage mitigation effect.
// - UBIQUITOUS_LANGUAGE.md: Reaction, Spell Effect, Armor Class, Saving Throw,
//   Damage Roll, Falling, Offer, Decline, and Advance.
module battleRuntimeReactionInterruptPayloadTaxonomyRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReactionKinds.* from "./battle-runtime-reaction-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type ReactionInterruptPayloadRouteSurface =
    | FreshRouteSurface
    | ReactionArmorClassEffectRouteSurface
    | AfterDamageSaveDamageRouteSurface
    | SpellInterruptionEndedRouteSurface
    | SpellInterruptionResumedRouteSurface
    | FallMitigationRouteSurface

  type ReactionInterruptPayloadFacts = {
    trigger: BattleRuntimeReactionTrigger,
    procedure: BattleRuntimeReactionProcedure,
    continuation: BattleRuntimeContinuationKind,
  }

  var qSurface: ReactionInterruptPayloadRouteSurface
  var qFacts: ReactionInterruptPayloadFacts
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val interruptDecisionHoles: Set[BattleHoleFamilyKind] =
    Set(InterruptDecisionHoleKind)
  pure val saveAndDamageHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind, RolledDiceHoleKind)
  pure val saveHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind)

  pure def freshFacts: ReactionInterruptPayloadFacts = {
    trigger: BattleRuntimeAttackHit,
    procedure: BattleRuntimeNoReactionProcedure,
    continuation: BattleRuntimeAttackDamageContinuation,
  }

  pure def armorClassFacts: ReactionInterruptPayloadFacts = {
    trigger: BattleRuntimeAttackHit,
    procedure: BattleRuntimeReactionArmorClassEffectProcedure,
    continuation: BattleRuntimeAttackDamageContinuation,
  }

  pure def afterDamageFacts: ReactionInterruptPayloadFacts = {
    trigger: BattleRuntimeAfterDamage,
    procedure: BattleRuntimeAfterDamageSpellReactionProcedure,
    continuation: BattleRuntimeAfterDamageContinuation,
  }

  pure def spellInterruptionFacts: ReactionInterruptPayloadFacts = {
    trigger: BattleRuntimeSpellCast,
    procedure: BattleRuntimeSpellInterruptionReactionProcedure,
    continuation: BattleRuntimeSpellCastContinuation,
  }

  pure def fallMitigationFacts: ReactionInterruptPayloadFacts = {
    trigger: BattleRuntimeCreatureFalls,
    procedure: BattleRuntimeFallMitigationReactionProcedure,
    continuation: BattleRuntimeFallDamageContinuation,
  }

  pure def discoverReactionPayload(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(subject, holes, owner)

  pure def resolveReactionPayloadInterrupt(
    subject: ReducerRouteSubjectFamily,
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleInterrupt(subject, fill, holes, owner)

  pure def resolveReactionPayloadSubject(
    subject: ReducerRouteSubjectFamily,
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(subject, fill, holes, owner)

  pure def resolveReactionPayloadWithoutFill(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(subject, holes, owner)

  pure def pendingReactionRoute(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
  ): List[ReducerRouteEvent] =
    List(
      startRoute,
      discoverReactionPayload(subject, holes, BattleInterruptStackOwner),
    )

  action recordRoute(
    surface: ReactionInterruptPayloadRouteSurface,
    facts: ReactionInterruptPayloadFacts,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qFacts' = facts,
    qRoute' = route,
  }

  action init = recordRoute(
    FreshRouteSurface,
    freshFacts,
    List(startRoute),
  )

  action doRouteReactionArmorClassEffect = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      ReactionArmorClassEffectRouteSurface,
      armorClassFacts,
      pendingReactionRoute(
        ReactionArmorClassEffectRouteSubject,
        interruptDecisionHoles,
      )
        .append(
          resolveReactionPayloadInterrupt(
            ReactionArmorClassEffectRouteSubject,
            InterruptDecisionFillKind,
            noHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        )
        .append(
          resolveReactionPayloadInterrupt(
            ReactionArmorClassEffectRouteSubject,
            InterruptDecisionFillKind,
            noHoles,
            BattleActiveEffectOwner,
          )
        )
        .append(
          resolveReactionPayloadWithoutFill(
            ReactionArmorClassEffectRouteSubject,
            noHoles,
            BattleArmorClassOwner,
          )
        )
        .append(
          resolveReactionPayloadWithoutFill(
            ReactionArmorClassEffectRouteSubject,
            noHoles,
            BattleInterruptStackOwner,
          )
        ),
    ),
  }

  action doRouteAfterDamageSaveDamage = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      AfterDamageSaveDamageRouteSurface,
      afterDamageFacts,
      pendingReactionRoute(
        ReactionAfterDamageEffectRouteSubject,
        interruptDecisionHoles,
      )
        .append(
          resolveReactionPayloadInterrupt(
            ReactionAfterDamageEffectRouteSubject,
            InterruptDecisionFillKind,
            saveAndDamageHoles,
            BattleInterruptStackOwner,
          )
        )
        .append(
          resolveReactionPayloadSubject(
            ReactionAfterDamageEffectRouteSubject,
            SavingThrowOutcomeFillKind,
            Set(RolledDiceHoleKind),
            BattleSavingThrowOutcomeOwner,
          )
        )
        .append(
          resolveReactionPayloadSubject(
            ReactionAfterDamageEffectRouteSubject,
            RolledDiceFillKind,
            noHoles,
            BattleHitPointOwner,
          )
        )
        .append(
          resolveReactionPayloadWithoutFill(
            ReactionAfterDamageEffectRouteSubject,
            noHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        ),
    ),
  }

  action doRouteSpellInterruptionEnded = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      SpellInterruptionEndedRouteSurface,
      spellInterruptionFacts,
      pendingReactionRoute(
        ReactionSpellInterruptionRouteSubject,
        interruptDecisionHoles,
      )
        .append(
          resolveReactionPayloadInterrupt(
            ReactionSpellInterruptionRouteSubject,
            InterruptDecisionFillKind,
            saveHoles,
            BattleInterruptStackOwner,
          )
        )
        .append(
          resolveReactionPayloadSubject(
            ReactionSpellInterruptionRouteSubject,
            SavingThrowOutcomeFillKind,
            noHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        )
        .append(
          resolveReactionPayloadWithoutFill(
            ReactionSpellInterruptionRouteSubject,
            noHoles,
            BattleInterruptStackOwner,
          )
        ),
    ),
  }

  action doRouteSpellInterruptionResumed = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      SpellInterruptionResumedRouteSurface,
      spellInterruptionFacts,
      pendingReactionRoute(
        ReactionSpellInterruptionRouteSubject,
        interruptDecisionHoles,
      )
        .append(
          resolveReactionPayloadInterrupt(
            ReactionSpellInterruptionRouteSubject,
            InterruptDecisionFillKind,
            saveHoles,
            BattleInterruptStackOwner,
          )
        )
        .append(
          resolveReactionPayloadSubject(
            ReactionSpellInterruptionRouteSubject,
            SavingThrowOutcomeFillKind,
            Set(RolledDiceHoleKind),
            BattleSpellSlotAndActionEconomyOwner,
          )
        )
        .append(
          resolveReactionPayloadSubject(
            SlotSpellRouteSubject,
            RolledDiceFillKind,
            noHoles,
            BattleHitPointOwner,
          )
        )
        .append(
          resolveReactionPayloadWithoutFill(
            ReactionSpellInterruptionRouteSubject,
            noHoles,
            BattleInterruptStackOwner,
          )
        ),
    ),
  }

  action doRouteFallMitigation = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      FallMitigationRouteSurface,
      fallMitigationFacts,
      pendingReactionRoute(
        ReactionFallMitigationRouteSubject,
        interruptDecisionHoles,
      )
        .append(
          resolveReactionPayloadInterrupt(
            ReactionFallMitigationRouteSubject,
            InterruptDecisionFillKind,
            noHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        )
        .append(
          resolveReactionPayloadWithoutFill(
            ReactionFallMitigationRouteSubject,
            noHoles,
            BattleActiveEffectOwner,
          )
        )
        .append(
          resolveReactionPayloadWithoutFill(
            ReactionFallMitigationRouteSubject,
            noHoles,
            BattleMovementResourceOwner,
          )
        )
        .append(
          resolveReactionPayloadWithoutFill(
            ReactionFallMitigationRouteSubject,
            noHoles,
            BattleHitPointOwner,
          )
        ),
    ),
  }

  action step = any {
    doRouteReactionArmorClassEffect,
    doRouteAfterDamageSaveDamage,
    doRouteSpellInterruptionEnded,
    doRouteSpellInterruptionResumed,
    doRouteFallMitigation,
  }
}
