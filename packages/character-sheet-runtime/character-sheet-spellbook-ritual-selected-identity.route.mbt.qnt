// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Casting without
//   Slots: Rituals do not expend Spell Slots.
// - .references/srd-5.2.1/Classes/Wizard.md#Level 1: Ritual Adept:
//   Wizard ritual casting can use spells in the spellbook.
// - UBIQUITOUS_LANGUAGE.md: Ritual and Spell Access.
module characterSheetSpellbookRitualSelectedIdentityRouteMbt {
  import characterSheetReducerRoute.* from "./character-sheet-reducer-route"

  type SpellbookRitualRouteState = {
    ready: bool,
    qRoute: List[CharacterSheetRouteEvent],
  }

  var qState: SpellbookRitualRouteState

  pure def qRoute: List[CharacterSheetRouteEvent] = qState.qRoute

  pure val initialSpellbookRitualRoute: List[CharacterSheetRouteEvent] =
    List(
      routeCreateCharacterSheet(CharacterSheetStateOwner),
      routeProjectCharacterSheetFacts(
        SheetBuildFactsProjectionRouteSubject,
        CharacterSheetBuildProjectionOwner,
      ),
    )

  pure def spellbookRitualRoute(
    route: List[CharacterSheetRouteEvent],
    holes: Set[CharacterSheetRouteHoleFamily],
  ): List[CharacterSheetRouteEvent] =
    route
      .append(
        routeRetainCharacterSheetSelectedReferences(
          SheetSelectedReferenceProjectionRouteSubject,
          CharacterSheetSelectedReferenceOwner,
        )
      )
      .append(
        routeResolveCharacterSheetSubject(
          SheetSpellResourceRouteSubject,
          SheetProjectionSelectionFill,
          holes,
          CharacterSheetSelectedReferenceOwner,
        )
      )

  action recordRoute(route: List[CharacterSheetRouteEvent]): bool = all {
    qState' = {
      ready: false,
      qRoute: route,
    },
  }

  action init = all {
    qState' = {
      ready: true,
      qRoute: initialSpellbookRitualRoute,
    },
  }

  action doInvokeSpellbookRitual = all {
    qState.ready,
    recordRoute(spellbookRitualRoute(qRoute, Set())),
  }

  action doRejectPreparedOnlyRitual = all {
    qState.ready,
    recordRoute(
      spellbookRitualRoute(qRoute, Set(SheetProjectionChoiceHoleFamily))
    ),
  }

  action doRejectNonRitualSpellbookSpell = all {
    qState.ready,
    recordRoute(
      spellbookRitualRoute(qRoute, Set(SheetProjectionChoiceHoleFamily))
    ),
  }

  action doRejectMissingRitualAccessFeature = all {
    qState.ready,
    recordRoute(
      spellbookRitualRoute(qRoute, Set(SheetProjectionChoiceHoleFamily))
    ),
  }

  action doRejectNonLeveledRitualSpellbookSpell = all {
    qState.ready,
    recordRoute(
      spellbookRitualRoute(qRoute, Set(SheetProjectionChoiceHoleFamily))
    ),
  }

  action stepInvokeSpellbookRitual = any {
    doInvokeSpellbookRitual,
  }

  action stepRejectPreparedOnlyRitual = any {
    doRejectPreparedOnlyRitual,
  }

  action stepRejectNonRitualSpellbookSpell = any {
    doRejectNonRitualSpellbookSpell,
  }

  action stepRejectMissingRitualAccessFeature = any {
    doRejectMissingRitualAccessFeature,
  }

  action stepRejectNonLeveledRitualSpellbookSpell = any {
    doRejectNonLeveledRitualSpellbookSpell,
  }

  action step = any {
    doInvokeSpellbookRitual,
    doRejectPreparedOnlyRitual,
    doRejectNonRitualSpellbookSpell,
    doRejectMissingRitualAccessFeature,
    doRejectNonLeveledRitualSpellbookSpell,
  }
}
