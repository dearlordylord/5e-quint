// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Classes/Fighter.md#Level 1: Weapon Mastery.
// - .references/srd-5.2.1/Classes/Rogue.md#Level 1: Weapon Mastery.
// - .references/srd-5.2.1/Equipment.md#Mastery Properties: mastery
//   properties are usable only when a character has a feature that unlocks
//   them for the selected weapons.
// - UBIQUITOUS_LANGUAGE.md: Weapon Mastery and Mastery Property.
module characterCreationWeaponMasteryContainersSelectedIdentityRouteMbt {
  import characterCreationReducerRoute.* from "./character-creation-reducer-route"
  import characterCreationRouteFixtures.* from "./character-creation-route-fixtures"

  type WeaponMasteryRouteState = {
    ready: bool,
    qRoute: List[CharacterCreationRouteEvent],
  }

  var qState: WeaponMasteryRouteState

  pure def qRoute: List[CharacterCreationRouteEvent] = qState.qRoute

  pure val initialWeaponMasteryRoute: List[CharacterCreationRouteEvent] =
    completedFighterCreationRoute

  pure def retainWeaponMasteryRoute(
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
      qRoute: initialWeaponMasteryRoute,
    },
  }

  action doFinalizeFighterWeaponMastery = all {
    qState.ready,
    recordRoute(retainWeaponMasteryRoute(qRoute)),
  }

  action doFinalizeBarbarianWeaponMastery = all {
    qState.ready,
    recordRoute(retainWeaponMasteryRoute(qRoute)),
  }

  action doFinalizePaladinWeaponMastery = all {
    qState.ready,
    recordRoute(retainWeaponMasteryRoute(qRoute)),
  }

  action doFinalizeRangerWeaponMastery = all {
    qState.ready,
    recordRoute(retainWeaponMasteryRoute(qRoute)),
  }

  action doFinalizeRogueWeaponMastery = all {
    qState.ready,
    recordRoute(retainWeaponMasteryRoute(qRoute)),
  }

  action stepFighterWeaponMastery = any {
    doFinalizeFighterWeaponMastery,
  }

  action stepBarbarianWeaponMastery = any {
    doFinalizeBarbarianWeaponMastery,
  }

  action stepPaladinWeaponMastery = any {
    doFinalizePaladinWeaponMastery,
  }

  action stepRangerWeaponMastery = any {
    doFinalizeRangerWeaponMastery,
  }

  action stepRogueWeaponMastery = any {
    doFinalizeRogueWeaponMastery,
  }

  action step = any {
    doFinalizeFighterWeaponMastery,
    doFinalizeBarbarianWeaponMastery,
    doFinalizePaladinWeaponMastery,
    doFinalizeRangerWeaponMastery,
    doFinalizeRogueWeaponMastery,
  }
}
