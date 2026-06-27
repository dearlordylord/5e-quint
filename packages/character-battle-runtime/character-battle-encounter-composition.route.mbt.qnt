// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#The Order of Combat defines
//   battle participants, two-sided combat, Initiative order, and turns.
// - .references/srd-5.2.1/Playing-the-Game.md#Initiative defines Initiative
//   count and stable ordering from round to round.
// - .references/srd-5.2.1/Rules-Glossary.md#Initiative defines Initiative as
//   the combat turn-order fact.
// - UBIQUITOUS_LANGUAGE.md: Encounter Side, Initiative, Round, Turn, Table
//   Decision, Creature, and Stat Block.
module characterBattleEncounterCompositionRouteMbt {
  import characterBattleReducerRoute.* from "./character-battle-reducer-route"

  type EncounterCompositionRouteState = {
    replayIndex: int,
    qRoute: List[CharacterBattleRouteEvent],
  }

  var qState: EncounterCompositionRouteState

  pure def qRoute: List[CharacterBattleRouteEvent] = qState.qRoute

  pure val initialEncounterCompositionRoute: List[CharacterBattleRouteEvent] =
    List()

  pure def projectSheetCombatantForEncounterRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeProjectCharacterSheetToBattle(
        SheetToBattleInitRouteSubject,
        CharacterBattleInitProjectionOwner,
      )
    )

  pure def composeParticipantMembershipRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
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

  pure def composeSubjectProfilesRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeComposeBattleEncounter(
        HandoffSubjectProfileAvailabilityRouteSubject,
        Set(SubjectProfileAvailabilityOwnershipRouteFact),
        CharacterBattleSubjectProfileOwner,
      )
    )

  pure def composeInitiativeCurrentActorRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
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

  pure def enterComposedBattleRuntimeRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeEnterBattleRuntime(
        HandoffEncounterCompositionRouteSubject,
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

  action init = recordRoute(initialEncounterCompositionRoute, 0)

  action doProjectSheetCombatantForEncounter = all {
    qState.replayIndex == 0,
    recordRoute(projectSheetCombatantForEncounterRoute(qRoute), 1),
  }

  action doComposeParticipantMembership = all {
    qState.replayIndex == 1,
    recordRoute(composeParticipantMembershipRoute(qRoute), 2),
  }

  action doComposeSubjectProfiles = all {
    qState.replayIndex == 2,
    recordRoute(composeSubjectProfilesRoute(qRoute), 3),
  }

  action doComposeInitiativeCurrentActor = all {
    qState.replayIndex == 3,
    recordRoute(composeInitiativeCurrentActorRoute(qRoute), 4),
  }

  action doEnterComposedBattleRuntime = all {
    qState.replayIndex == 4,
    recordRoute(enterComposedBattleRuntimeRoute(qRoute), 5),
  }

  action step = any {
    doProjectSheetCombatantForEncounter,
    doComposeParticipantMembership,
    doComposeSubjectProfiles,
    doComposeInitiativeCurrentActor,
    doEnterComposedBattleRuntime,
  }
}
