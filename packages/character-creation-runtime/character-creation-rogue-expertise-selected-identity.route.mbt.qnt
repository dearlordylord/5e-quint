// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Classes/Rogue.md#Level 1: Expertise: choose two
//   skill proficiencies for Expertise at Rogue level 1.
// - .references/srd-5.2.1/Rules-Glossary.md#Expertise: Expertise applies to a
//   skill in which the character has proficiency and cannot be duplicated.
// - UBIQUITOUS_LANGUAGE.md: Skill, Proficiency Level, and Expertise.
module characterCreationRogueExpertiseSelectedIdentityRouteMbt {
  import characterCreationReducerRoute.* from "./character-creation-reducer-route"
  import characterCreationRouteFixtures.* from "./character-creation-route-fixtures"

  type RogueExpertiseRouteState = {
    ready: bool,
    qRoute: List[CharacterCreationRouteEvent],
  }

  var qState: RogueExpertiseRouteState

  pure def qRoute: List[CharacterCreationRouteEvent] = qState.qRoute

  pure val initialRogueExpertiseRoute: List[CharacterCreationRouteEvent] =
    completedFighterCreationRoute

  pure def retainExpertiseRoute(
    route: List[CharacterCreationRouteEvent],
  ): List[CharacterCreationRouteEvent] =
    route.append(
      routeRetainCreationSelectedReferences(
        CreationSelectedReferenceRouteSubject,
        CreationSelectedReferenceOwner,
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
      qRoute: initialRogueExpertiseRoute,
    },
  }

  action doSelectLevelOneOwnedSkillExpertise = all {
    qState.ready,
    recordRoute(retainExpertiseRoute(qRoute)),
  }

  action step = any {
    doSelectLevelOneOwnedSkillExpertise,
  }
}
