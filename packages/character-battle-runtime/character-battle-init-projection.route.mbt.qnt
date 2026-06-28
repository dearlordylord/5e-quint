// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Combat defines combat setup,
//   Initiative order, turns, and battle participants.
// - .references/srd-5.2.1/Playing-the-Game.md#Hit Points and #Temporary Hit
//   Points define the combat vitality facts projected from a character sheet.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots defines
//   Spell Slot capacity and expenditure.
// - .references/srd-5.2.1/Classes/Warlock.md#Level 1: Pact Magic defines
//   Pact Magic slot capacity, same-level Pact Slots, and Short or Long Rest
//   recovery.
// - UBIQUITOUS_LANGUAGE.md: Hit Points, Temporary Hit Points, Spell Slot,
//   Pact Slot, Pool, Spend, Initiative, and Spell Effect.
module characterBattleInitProjectionRouteMbt {
  import characterBattleReducerRoute.* from "./character-battle-reducer-route"

  type BattleInitRouteState = {
    replayIndex: int,
    qRoute: List[CharacterBattleRouteEvent],
  }

  var qState: BattleInitRouteState

  pure def qRoute: List[CharacterBattleRouteEvent] = qState.qRoute

  pure val initialBattleInitRoute: List[CharacterBattleRouteEvent] =
    List()

  pure def sheetHitPointsArmorClassConditionsAndProfilesRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route
      .append(
        routeProjectCharacterSheetToBattle(
          SheetToBattleInitRouteSubject,
          CharacterBattleSheetOwner,
        )
      )
      .append(
        routeProjectCharacterSheetToBattle(
          SheetToBattleInitRouteSubject,
          CharacterBattleBuildProjectionOwner,
        )
      )
      .append(
        routeRecordCharacterBattleHandoffFacts(
          SheetToBattleInitRouteSubject,
          Set(HandoffBuildHitPointMaximumInputFact),
          CharacterBattleBuildProjectionOwner,
        )
      )
      .append(
        routeEnterBattleRuntime(
          SheetToBattleInitRouteSubject,
          CharacterBattleInitProjectionOwner,
        )
      )

  pure def sheetSpellcastingAndMetamagicRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route
      .append(
        routeProjectCharacterSheetToBattle(
          HandoffResourceProjectionRouteSubject,
          CharacterBattleSheetOwner,
        )
      )
      .append(
        routeProjectCharacterSheetToBattle(
          HandoffFeatureResourceProjectionRouteSubject,
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
      .append(
        routeRecordCharacterBattleHandoffFacts(
          HandoffFeatureResourceProjectionRouteSubject,
          Set(HandoffFeatureResourceDeltaFact),
          CharacterBattleResourceProjectionOwner,
        )
      )
      .append(
        routeEnterBattleRuntime(
          HandoffResourceProjectionRouteSubject,
          CharacterBattleInitProjectionOwner,
        )
      )

  pure def purePactMagicSlotRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route
      .append(
        routeProjectCharacterSheetToBattle(
          HandoffResourceProjectionRouteSubject,
          CharacterBattleResourceProjectionOwner,
        )
      )
      .append(
        routeRecordCharacterBattleHandoffFacts(
          HandoffResourceProjectionRouteSubject,
          Set(HandoffSourceExactPactSlotDeltaFact),
          CharacterBattleResourceProjectionOwner,
        )
      )
      .append(
        routeEnterBattleRuntime(
          HandoffResourceProjectionRouteSubject,
          CharacterBattleInitProjectionOwner,
        )
      )

  pure def rejectMixedSpellAndPactSlotRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeRejectCharacterBattleHandoff(
        HandoffResourceProjectionRouteSubject,
        HandoffResourceDeltaFill,
        Set(HandoffSpellResourceProjectionHoleFamily),
        CharacterBattleResourceProjectionOwner,
      )
    )

  pure def rejectMaximumRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeRejectCharacterBattleHandoff(
        SheetToBattleInitRouteSubject,
        HandoffSheetProjectionFill,
        Set(HandoffHitPointProjectionHoleFamily),
        CharacterBattleBuildProjectionOwner,
      )
    )

  pure def rejectStableRecoveryRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeRejectCharacterBattleHandoff(
        SheetToBattleInitRouteSubject,
        HandoffSheetProjectionFill,
        Set(HandoffSettlementConflictHoleFamily),
        CharacterBattleInitProjectionOwner,
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

  action init = recordRoute(initialBattleInitRoute, 0)

  action doProjectSheetHitPointsArmorClassConditionsAndProfiles = all {
    qState.replayIndex == 0,
    recordRoute(
      sheetHitPointsArmorClassConditionsAndProfilesRoute(qRoute),
      1,
    ),
  }

  action doProjectSheetSpellcastingAndMetamagic = all {
    qState.replayIndex == 1,
    recordRoute(sheetSpellcastingAndMetamagicRoute(qRoute), 2),
  }

  action doProjectPurePactMagicSlot = all {
    qState.replayIndex == 2,
    recordRoute(purePactMagicSlotRoute(qRoute), 3),
  }

  action doRejectMixedSpellAndPactSlotInit = all {
    qState.replayIndex == 3,
    recordRoute(rejectMixedSpellAndPactSlotRoute(qRoute), 4),
  }

  action doRejectBuildMaximumAboveBuildMaximum = all {
    qState.replayIndex == 4,
    recordRoute(rejectMaximumRoute(qRoute), 5),
  }

  action doRejectStableRecoveryProgressDuringInit = all {
    qState.replayIndex == 5,
    recordRoute(rejectStableRecoveryRoute(qRoute), 6),
  }

  action step = any {
    doProjectSheetHitPointsArmorClassConditionsAndProfiles,
    doProjectSheetSpellcastingAndMetamagic,
    doProjectPurePactMagicSlot,
    doRejectMixedSpellAndPactSlotInit,
    doRejectBuildMaximumAboveBuildMaximum,
    doRejectStableRecoveryProgressDuringInit,
  }
}
