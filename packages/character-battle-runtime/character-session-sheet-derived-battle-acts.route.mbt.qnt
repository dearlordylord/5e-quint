// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#The Order of Combat and
//   #Initiative define encounter entry order.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots defines
//   source-exact spell-slot expenditure settled back to the Character Sheet.
// - UBIQUITOUS_LANGUAGE.md: Encounter Side, Initiative, Spell Slot, Spend,
//   Battle Runtime, and Settlement.
module characterSessionSheetDerivedBattleActsRouteMbt {
  import characterBattleReducerRoute.* from "./character-battle-reducer-route"

  type SheetDerivedBattleActsRouteState = {
    replayIndex: int,
    qRoute: List[CharacterBattleRouteEvent],
  }

  var qState: SheetDerivedBattleActsRouteState

  pure def qRoute: List[CharacterBattleRouteEvent] = qState.qRoute

  pure val initialSheetDerivedBattleActsRoute: List[CharacterBattleRouteEvent] =
    List()

  pure def sheetDerivedSessionEntryRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route
      .append(
        routeProjectCharacterSheetToBattle(
          SheetToBattleInitRouteSubject,
          CharacterBattleInitProjectionOwner,
        )
      )
      .append(
        routeComposeBattleEncounter(
          HandoffParticipantMembershipRouteSubject,
          Set(
            SheetDerivedParticipantCandidateRouteFact,
            NonSheetParticipantMembershipRouteFact,
            EncounterSideRelationshipOwnershipRouteFact,
          ),
          CharacterBattleEncounterSetupOwner,
        )
      )
      .append(
        routeComposeBattleEncounter(
          HandoffSubjectProfileAvailabilityRouteSubject,
          Set(SubjectProfileAvailabilityOwnershipRouteFact),
          CharacterBattleSubjectProfileOwner,
        )
      )
      .append(
        routeComposeBattleEncounter(
          HandoffInitiativeCurrentActorRouteSubject,
          Set(
            InitiativeCountOwnershipRouteFact,
            StableInitiativeOrderOwnershipRouteFact,
            CurrentActorOwnershipRouteFact,
          ),
          CharacterBattleInitiativeOwner,
        )
      )
      .append(
        routeEnterBattleRuntime(
          HandoffEncounterCompositionRouteSubject,
          CharacterBattleRuntimeOwner,
        )
      )

  pure def settleSheetDerivedSpellSlotRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route
      .append(
        routeSettleBattleToCharacterSheet(
          BattleToSheetSettlementRouteSubject,
          HandoffBattleDeltaFill,
          Set(HandoffHitPointProjectionHoleFamily),
          CharacterBattleSettlementOwner,
        )
      )
      .append(
        routeSettleBattleToCharacterSheet(
          HandoffResourceProjectionRouteSubject,
          HandoffResourceDeltaFill,
          Set(HandoffSpellResourceProjectionHoleFamily),
          CharacterBattleResourceProjectionOwner,
        )
      )
      .append(
        routeRecordCharacterBattleHandoffFacts(
          HandoffResourceProjectionRouteSubject,
          Set(HandoffSourceExactSpellSlotDeltaFact),
          CharacterBattleResourceProjectionOwner,
        )
      )

  action recordRoute(
    route: List[CharacterBattleRouteEvent],
    replayIndex: int,
  ): bool = all {
    qState' = {
      replayIndex: replayIndex,
      qRoute: route,
    },
  }

  action init = recordRoute(initialSheetDerivedBattleActsRoute, 0)

  action doEnterSheetDerivedSessionBattle = all {
    qState.replayIndex == 0,
    recordRoute(sheetDerivedSessionEntryRoute(qRoute), 1),
  }

  action doSettleSheetDerivedSpellSlot = all {
    qState.replayIndex == 1,
    recordRoute(settleSheetDerivedSpellSlotRoute(qRoute), 2),
  }

  action step = any {
    doEnterSheetDerivedSessionBattle,
    doSettleSheetDerivedSpellSlot,
  }
}
