// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Classes/Warlock.md#Level 1: Eldritch Invocations:
//   choose eligible invocations, follow prerequisites, and avoid duplicates
//   unless an invocation is repeatable.
// - .references/srd-5.2.1/Classes/Warlock.md#Level 1: Pact Magic: Warlock
//   cantrips, prepared spells, Pact Slots, and level-gain spell replacement are
//   Warlock spellcasting facts.
// - packages/character-creation-runtime/README.md: Eldritch Invocation choices
//   are option ownership facts; selected invocation execution remains outside
//   Character Creation.
module characterCreationWarlockEldritchInvocationsSelectedIdentityRouteMbt {
  import characterCreationReducerRoute.* from "./character-creation-reducer-route"
  import characterCreationRouteFixtures.* from "./character-creation-route-fixtures"

  type WarlockInvocationRouteState = {
    ready: bool,
    qRoute: List[CharacterCreationRouteEvent],
  }

  var qState: WarlockInvocationRouteState

  pure def qRoute: List[CharacterCreationRouteEvent] = qState.qRoute

  pure val initialWarlockInvocationRoute: List[CharacterCreationRouteEvent] =
    completedFighterCreationRoute

  pure def retainInvocationRoute(
    route: List[CharacterCreationRouteEvent],
  ): List[CharacterCreationRouteEvent] =
    route
      .append(
        routeRetainCreationSelectedReferences(
          CreationSelectedReferenceRouteSubject,
          CreationSelectedReferenceOwner,
        )
      )
      .append(
        routeProjectCharacterBuildFacts(
          CreationBuildProjectionRouteSubject,
          CharacterBuildOwner,
        )
      )

  pure def invocationLevelGainRoute(
    route: List[CharacterCreationRouteEvent],
  ): List[CharacterCreationRouteEvent] =
    route
      .append(
        routeApplyCreationFillBatch(
          CreationSelectedReferenceRouteSubject,
          Set(CreationChoiceSetFill),
          Set(),
          CharacterBuildOwner,
        )
      )
      .append(
        routeRetainCreationSelectedReferences(
          CreationSelectedReferenceRouteSubject,
          CreationSelectedReferenceOwner,
        )
      )
      .append(
        routeProjectCharacterBuildFacts(
          CreationBuildProjectionRouteSubject,
          CharacterBuildOwner,
        )
      )

  pure def rejectInvocationSelectionRoute(
    route: List[CharacterCreationRouteEvent],
  ): List[CharacterCreationRouteEvent] =
    route.append(
      routeApplyCreationFillBatch(
        CreationSelectedReferenceRouteSubject,
        Set(CreationChoiceSetFill),
        Set(CreationUnitChoiceHoleFamily),
        CreationSupportProfileAdmissionOwner,
      )
    )

  action recordRoute(route: List[CharacterCreationRouteEvent]): bool = all {
    qState' = {
      ready: false,
      qRoute: route,
    },
  }

  action init = all {
    qState' = {
      ready: true,
      qRoute: initialWarlockInvocationRoute,
    },
  }

  action doSelectLevelOneArmorOfShadows = all {
    qState.ready,
    recordRoute(retainInvocationRoute(qRoute)),
  }

  action doGainLevelTwoInvocations = all {
    qState.ready,
    recordRoute(invocationLevelGainRoute(qRoute)),
  }

  action doReplaceArmorWithEldritchMindOnWarlockLevelGain = all {
    qState.ready,
    recordRoute(invocationLevelGainRoute(qRoute)),
  }

  action doReplaceRepeatableInvocationByChoice = all {
    qState.ready,
    recordRoute(invocationLevelGainRoute(qRoute)),
  }

  action doRejectPrerequisiteRetainedInvocationReplacement = all {
    qState.ready,
    recordRoute(rejectInvocationSelectionRoute(qRoute)),
  }

  action doRejectDuplicateInvocationSelections = all {
    qState.ready,
    recordRoute(rejectInvocationSelectionRoute(qRoute)),
  }

  action step = any {
    doSelectLevelOneArmorOfShadows,
    doGainLevelTwoInvocations,
    doReplaceArmorWithEldritchMindOnWarlockLevelGain,
    doReplaceRepeatableInvocationByChoice,
    doRejectPrerequisiteRetainedInvocationReplacement,
    doRejectDuplicateInvocationSelections,
  }
}
