// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Hit Points, #Temporary Hit
//   Points, #Death Saving Throws, and #Stabilizing a Character define battle
//   vitality facts that settlement can persist.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots defines
//   source-exact slot expenditure and recovery.
// - UBIQUITOUS_LANGUAGE.md: Hit Points, Temporary Hit Points, Spell Slot,
//   Pact Slot, Pool, Spend, Stable, Poisoned, and Prone.
module characterBattleSettlementRouteMbt {
  import characterBattleReducerRoute.* from "./character-battle-reducer-route"

  type BattleSettlementRouteState = {
    replayIndex: int,
    qRoute: List[CharacterBattleRouteEvent],
  }

  var qState: BattleSettlementRouteState

  pure def qRoute: List[CharacterBattleRouteEvent] = qState.qRoute

  pure val initialBattleSettlementRoute: List[CharacterBattleRouteEvent] =
    List(
      routeProjectCharacterSheetToBattle(
        SheetToBattleInitRouteSubject,
        CharacterBattleSheetOwner,
      ),
      routeEnterBattleRuntime(
        HandoffBattleMutationRouteSubject,
        CharacterBattleRuntimeOwner,
      ),
    )

  pure def settleHitPointsConditionsSlotsAndPreservedSheetStateRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route
      .append(
        routeSettleBattleToCharacterSheet(
          BattleToSheetSettlementRouteSubject,
          HandoffBattleDeltaFill,
          Set(),
          CharacterBattleSettlementOwner,
        )
      )
      .append(
        routeSettleBattleToCharacterSheet(
          HandoffResourceProjectionRouteSubject,
          HandoffResourceDeltaFill,
          Set(),
          CharacterBattleResourceProjectionOwner,
        )
      )
      .append(
        routeRecordCharacterBattleHandoffFacts(
          HandoffResourceProjectionRouteSubject,
          Set(
            HandoffSourceExactSpellSlotDeltaFact,
            HandoffSourceExactPactSlotDeltaFact,
          ),
          CharacterBattleResourceProjectionOwner,
        )
      )
      .append(
        routeProjectCharacterSheetToBattle(
          SheetToBattleInitRouteSubject,
          CharacterBattleSheetOwner,
        )
      )

  pure def settleFeatureResourceExpenditureRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route
      .append(
        routeSettleBattleToCharacterSheet(
          HandoffFeatureResourceProjectionRouteSubject,
          HandoffResourceDeltaFill,
          Set(),
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

  pure def rejectAmbiguousCreatedSpellSlotSourceRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route
      .append(
        routeRejectCharacterBattleHandoff(
          HandoffResourceProjectionRouteSubject,
          HandoffSettlementRejectionFill,
          Set(
            HandoffSpellResourceProjectionHoleFamily,
            HandoffSettlementConflictHoleFamily,
          ),
          CharacterBattleResourceProjectionOwner,
        )
      )
      .append(
        routeRecordCharacterBattleHandoffFacts(
          HandoffResourceProjectionRouteSubject,
          Set(HandoffSettlementConflictFact),
          CharacterBattleResourceProjectionOwner,
        )
      )

  pure def rejectIdentityMismatchRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeRejectCharacterBattleHandoff(
        BattleToSheetSettlementRouteSubject,
        HandoffSettlementRejectionFill,
        Set(HandoffIdentityMatchHoleFamily),
        CharacterBattleSettlementOwner,
      )
    )

  pure def rejectMaximumHpDriftRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeRejectCharacterBattleHandoff(
        BattleToSheetSettlementRouteSubject,
        HandoffSettlementRejectionFill,
        Set(HandoffHitPointProjectionHoleFamily),
        CharacterBattleSettlementOwner,
      )
    )

  pure def rejectSettlementConflictRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route
      .append(
        routeRejectCharacterBattleHandoff(
          BattleToSheetSettlementRouteSubject,
          HandoffSettlementRejectionFill,
          Set(HandoffSettlementConflictHoleFamily),
          CharacterBattleSettlementOwner,
        )
      )
      .append(
        routeRecordCharacterBattleHandoffFacts(
          BattleToSheetSettlementRouteSubject,
          Set(HandoffSettlementConflictFact),
          CharacterBattleSettlementOwner,
        )
      )

  pure def settleZeroHpStableLifecycleRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route
      .append(
        routeSettleBattleToCharacterSheet(
          BattleToSheetSettlementRouteSubject,
          HandoffBattleDeltaFill,
          Set(),
          CharacterBattleSettlementOwner,
        )
      )
      .append(
        routeRecordCharacterBattleHandoffFacts(
          BattleToSheetSettlementRouteSubject,
          Set(HandoffZeroHpStableLifecycleFact),
          CharacterBattleSettlementOwner,
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

  action init = recordRoute(initialBattleSettlementRoute, 0)

  action doSettleHitPointsConditionsSlotsAndPreservedSheetState = all {
    qState.replayIndex == 0,
    recordRoute(
      settleHitPointsConditionsSlotsAndPreservedSheetStateRoute(qRoute),
      1,
    ),
  }

  action doSettleFeatureResourceExpenditure = all {
    qState.replayIndex == 1,
    recordRoute(settleFeatureResourceExpenditureRoute(qRoute), 2),
  }

  action doRejectAmbiguousCreatedSpellSlotSource = all {
    qState.replayIndex == 2,
    recordRoute(rejectAmbiguousCreatedSpellSlotSourceRoute(qRoute), 3),
  }

  action doRejectMismatchedCharacterIdentity = all {
    qState.replayIndex == 3,
    recordRoute(rejectIdentityMismatchRoute(qRoute), 4),
  }

  action doRejectMaximumHpDrift = all {
    qState.replayIndex == 4,
    recordRoute(rejectMaximumHpDriftRoute(qRoute), 5),
  }

  action doRejectActiveWildShapeHandoff = all {
    qState.replayIndex == 5,
    recordRoute(rejectSettlementConflictRoute(qRoute), 6),
  }

  action doRejectStableRecoveryProgressHandoff = all {
    qState.replayIndex == 6,
    recordRoute(rejectSettlementConflictRoute(qRoute), 7),
  }

  action doSettleZeroHpStableLifecycle = all {
    qState.replayIndex == 7,
    recordRoute(settleZeroHpStableLifecycleRoute(qRoute), 8),
  }

  action step = any {
    doSettleHitPointsConditionsSlotsAndPreservedSheetState,
    doSettleFeatureResourceExpenditure,
    doRejectAmbiguousCreatedSpellSlotSource,
    doRejectMismatchedCharacterIdentity,
    doRejectMaximumHpDrift,
    doRejectActiveWildShapeHandoff,
    doRejectStableRecoveryProgressHandoff,
    doSettleZeroHpStableLifecycle,
  }
}
