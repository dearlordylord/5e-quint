// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Classes/Paladin.md#Level 1: Lay On Hands defines a
//   healing pool spend that can restore Hit Points or remove Poisoned.
// - .references/srd-5.2.1/Rules-Glossary.md#Short Rest and #Long Rest define
//   feature recharge boundaries.
// - .references/srd-5.2.1/Classes/Monk.md#Level 2: Uncanny Metabolism defines
//   Initiative-triggered Focus Point recovery and healing.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Font of Magic and
//   #Level 2: Metamagic define Sorcery Point, created-slot, and metamagic
//   resource sharing.
// - UBIQUITOUS_LANGUAGE.md: Pool, Spend, Hit Points, Spell Slot, Pact Slot,
//   and Spell Effect.
module characterSheetFeatureResourcesRouteMbt {
  import characterBattleReducerRoute.* from "./character-battle-reducer-route"

  type FeatureResourceHandoffRouteState = {
    replayIndex: int,
    qRoute: List[CharacterBattleRouteEvent],
  }

  var qState: FeatureResourceHandoffRouteState

  pure def qRoute: List[CharacterBattleRouteEvent] = qState.qRoute

  pure val initialFeatureResourceHandoffRoute: List[CharacterBattleRouteEvent] =
    List(
      routeProjectCharacterSheetToBattle(
        HandoffFeatureResourceProjectionRouteSubject,
        CharacterBattleSheetOwner,
      )
    )

  pure def acceptedFeatureResourceRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeProjectCharacterSheetToBattle(
        HandoffFeatureResourceProjectionRouteSubject,
        CharacterBattleResourceProjectionOwner,
      )
    )

  pure def acceptedFeatureResourceWithHitPointRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    acceptedFeatureResourceRoute(route)
      .append(
        routeProjectCharacterSheetToBattle(
          SheetToBattleInitRouteSubject,
          CharacterBattleSheetOwner,
        )
      )

  pure def rejectedFeatureResourceRoute(
    route: List[CharacterBattleRouteEvent],
    holes: Set[CharacterBattleRouteHoleFamily],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeRejectCharacterBattleHandoff(
        HandoffFeatureResourceProjectionRouteSubject,
        HandoffResourceDeltaFill,
        holes,
        CharacterBattleResourceProjectionOwner,
      )
    )

  pure def acceptedSpellResourceRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    acceptedFeatureResourceRoute(route)
      .append(
        routeProjectCharacterSheetToBattle(
          HandoffResourceProjectionRouteSubject,
          CharacterBattleResourceProjectionOwner,
        )
      )

  pure def rejectedSpellResourceRoute(
    route: List[CharacterBattleRouteEvent],
    holes: Set[CharacterBattleRouteHoleFamily],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeRejectCharacterBattleHandoff(
        HandoffResourceProjectionRouteSubject,
        HandoffResourceDeltaFill,
        holes,
        CharacterBattleResourceProjectionOwner,
      )
    )

  pure def metamagicBattleBridgeRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    acceptedFeatureResourceRoute(route)
      .append(
        routeEnterBattleRuntime(
          HandoffBattleMutationRouteSubject,
          CharacterBattleRuntimeOwner,
        )
      )
      .append(
        routeEnterBattleRuntime(
          HandoffResourceProjectionRouteSubject,
          CharacterBattleRuntimeOwner,
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

  action init = recordRoute(initialFeatureResourceHandoffRoute, 0)

  action doLayOnHandsRestoresHpAndRemovesPoisoned = all {
    qState.replayIndex == 0,
    recordRoute(acceptedFeatureResourceWithHitPointRoute(qRoute), 1),
  }

  action doRejectLayOnHandsOverspend = all {
    qState.replayIndex == 1,
    recordRoute(
      rejectedFeatureResourceRoute(
        qRoute,
        Set(HandoffFeatureResourceProjectionHoleFamily),
      ),
      2,
    ),
  }

  action doLongRestClearsLayOnHandsPool = all {
    qState.replayIndex == 2,
    recordRoute(acceptedFeatureResourceRoute(qRoute), 3),
  }

  action doShortRestRecoversUseCountPools = all {
    qState.replayIndex == 3,
    recordRoute(acceptedFeatureResourceRoute(qRoute), 4),
  }

  action doLongRestClearsPointPoolAndUseState = all {
    qState.replayIndex == 4,
    recordRoute(acceptedFeatureResourceRoute(qRoute), 5),
  }

  action doFontOfMagicSlotToPoints = all {
    qState.replayIndex == 5,
    recordRoute(acceptedSpellResourceRoute(qRoute), 6),
  }

  action doRejectFontOfMagicAmbiguousSlotSource = all {
    qState.replayIndex == 6,
    recordRoute(
      rejectedSpellResourceRoute(
        qRoute,
        Set(
          HandoffSpellResourceProjectionHoleFamily,
          HandoffSettlementConflictHoleFamily,
        ),
      ),
      7,
    ),
  }

  action doFontOfMagicPointsToSlot = all {
    qState.replayIndex == 7,
    recordRoute(acceptedSpellResourceRoute(qRoute), 8),
  }

  action doRejectFontOfMagicInsufficientPoints = all {
    qState.replayIndex == 8,
    recordRoute(
      rejectedFeatureResourceRoute(
        qRoute,
        Set(HandoffFeatureResourceProjectionHoleFamily),
      ),
      9,
    ),
  }

  action doShortRestPreservesUncannyUseState = all {
    qState.replayIndex == 9,
    recordRoute(acceptedFeatureResourceRoute(qRoute), 10),
  }

  action doLongRestClearsUncannyUseState = all {
    qState.replayIndex == 10,
    recordRoute(acceptedFeatureResourceRoute(qRoute), 11),
  }

  action doUncannyMetabolismRecoversFocusAndHeals = all {
    qState.replayIndex == 11,
    recordRoute(acceptedFeatureResourceWithHitPointRoute(qRoute), 12),
  }

  action doRejectUncannyMetabolismRepeatUse = all {
    qState.replayIndex == 12,
    recordRoute(
      rejectedFeatureResourceRoute(
        qRoute,
        Set(HandoffFeatureResourceProjectionHoleFamily),
      ),
      13,
    ),
  }

  action doMetamagicBridgeUsesSharedPointPool = all {
    qState.replayIndex == 13,
    recordRoute(metamagicBattleBridgeRoute(qRoute), 14),
  }

  action step = any {
    doLayOnHandsRestoresHpAndRemovesPoisoned,
    doRejectLayOnHandsOverspend,
    doLongRestClearsLayOnHandsPool,
    doShortRestRecoversUseCountPools,
    doLongRestClearsPointPoolAndUseState,
    doFontOfMagicSlotToPoints,
    doRejectFontOfMagicAmbiguousSlotSource,
    doFontOfMagicPointsToSlot,
    doRejectFontOfMagicInsufficientPoints,
    doShortRestPreservesUncannyUseState,
    doLongRestClearsUncannyUseState,
    doUncannyMetabolismRecoversFocusAndHeals,
    doRejectUncannyMetabolismRepeatUse,
    doMetamagicBridgeUsesSharedPointPool,
  }
}
